import { prisma } from "@/lib/db";
import { MESSAGE_STATUS, type MessageStatus } from "@/lib/sms/status";
import { resolveFailure } from "@/lib/sms/retry";
import type { Message } from "@/generated/prisma/client";

export class DeviceNotFoundError extends Error {
  constructor(deviceId: string) {
    super(`Device not found: ${deviceId}`);
    this.name = "DeviceNotFoundError";
  }
}

export class DeviceDisabledError extends Error {
  constructor(deviceId: string) {
    super(`Device is disabled: ${deviceId}`);
    this.name = "DeviceDisabledError";
  }
}

export class MessageNotFoundError extends Error {
  constructor(messageId: string) {
    super(`Message not found: ${messageId}`);
    this.name = "MessageNotFoundError";
  }
}

export class MessageNotClaimedError extends Error {
  constructor(messageId: string) {
    super(`Message is not in a claimed state: ${messageId}`);
    this.name = "MessageNotClaimedError";
  }
}

export class DeviceMismatchError extends Error {
  constructor() {
    super("Message was claimed by a different device");
    this.name = "DeviceMismatchError";
  }
}

export interface ClaimedMessage {
  id: string;
  recipient: string;
  body: string;
}

// A message claimed but not reported within this window is treated as abandoned
// (the device died, lost signal, or was killed by battery optimization) and
// returned to the queue. This is the core of the at-least-once guarantee: the
// product premise is an unreliable phone on a flaky link, so stuck-CLAIMED is an
// expected steady state, not an edge case.
const CLAIM_TIMEOUT_MS = 5 * 60_000;

// Returns messages stuck in CLAIMED past the timeout to PENDING for another
// device to claim, consuming one attempt each — so a perpetually-dying device
// cannot loop a message forever; once attempts are exhausted it lands in FAILED,
// mirroring resolveFailure(). Cheap enough to run inline on every poll, which
// avoids a separate scheduler. Returns the number of messages reclaimed.
export async function reclaimStaleClaims(
  timeoutMs = CLAIM_TIMEOUT_MS,
): Promise<number> {
  return prisma.$executeRaw`
    UPDATE "Message"
    SET attempts = attempts + 1,
        status = CASE WHEN attempts + 1 >= "maxAttempts"
                      THEN ${MESSAGE_STATUS.FAILED}
                      ELSE ${MESSAGE_STATUS.PENDING} END,
        error = CASE WHEN attempts + 1 >= "maxAttempts"
                     THEN ${"claim timed out"}
                     ELSE error END,
        "deviceId" = NULL,
        "claimedAt" = NULL,
        "updatedAt" = NOW()
    WHERE status = ${MESSAGE_STATUS.CLAIMED}
      AND "claimedAt" < NOW() - make_interval(secs => ${timeoutMs / 1000})
  `;
}

// Atomically claims up to `batchSize` pending messages for one device.
// FOR UPDATE SKIP LOCKED guarantees concurrent devices never grab the same row.
export async function claimPendingMessages(
  deviceId: string,
  batchSize: number,
): Promise<ClaimedMessage[]> {
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) throw new DeviceNotFoundError(deviceId);
  if (!device.enabled) throw new DeviceDisabledError(deviceId);

  // Fold any abandoned claims back into the pending pool before claiming, so a
  // dead device can never strand a message.
  await reclaimStaleClaims();

  await prisma.device.update({
    where: { id: deviceId },
    data: { lastSeenAt: new Date() },
  });

  return prisma.$queryRaw<ClaimedMessage[]>`
    UPDATE "Message"
    SET status = ${MESSAGE_STATUS.CLAIMED}, "deviceId" = ${deviceId},
        "claimedAt" = NOW(), "updatedAt" = NOW()
    WHERE id IN (
      SELECT id FROM "Message"
      WHERE status = ${MESSAGE_STATUS.PENDING}
      ORDER BY "createdAt" ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, recipient, body
  `;
}

export async function disconnectDevice(deviceId: string): Promise<void> {
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) throw new DeviceNotFoundError(deviceId);
  if (!device.enabled) throw new DeviceDisabledError(deviceId);

  await prisma.device.update({
    where: { id: deviceId },
    data: { lastSeenAt: null },
  });
}

export async function reportResult(
  messageId: string,
  deviceId: string,
  status: Extract<MessageStatus, "SENT" | "FAILED">,
  error?: string,
): Promise<Message> {
  // Lock the row for the whole read-decide-write so concurrent reports (or a
  // report racing a re-poll) cannot lose an attempt increment or clobber state.
  return prisma.$transaction(async (tx) => {
    const [locked] = await tx.$queryRaw<
      Array<{ status: string; deviceId: string | null; attempts: number; maxAttempts: number }>
    >`
      SELECT status, "deviceId", attempts, "maxAttempts"
      FROM "Message"
      WHERE id = ${messageId}
      FOR UPDATE
    `;

    if (!locked) throw new MessageNotFoundError(messageId);
    if (locked.status !== MESSAGE_STATUS.CLAIMED) throw new MessageNotClaimedError(messageId);
    if (locked.deviceId !== deviceId) throw new DeviceMismatchError();

    if (status === MESSAGE_STATUS.SENT) {
      return tx.message.update({
        where: { id: messageId },
        data: { status: MESSAGE_STATUS.SENT, sentAt: new Date(), attempts: { increment: 1 } },
      });
    }

    const { status: nextStatus, requeue } = resolveFailure(
      locked.attempts + 1,
      locked.maxAttempts,
    );
    return tx.message.update({
      where: { id: messageId },
      data: {
        status: nextStatus,
        attempts: { increment: 1 },
        error: error ?? "send failed",
        ...(requeue ? { deviceId: null, claimedAt: null } : {}),
      },
    });
  });
}
