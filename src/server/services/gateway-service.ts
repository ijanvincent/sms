import { prisma } from "@/lib/db";
import { MESSAGE_STATUS, type MessageStatus } from "@/lib/sms/status";
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

// Atomically claims up to `batchSize` pending messages for one device.
// FOR UPDATE SKIP LOCKED guarantees concurrent devices never grab the same row.
export async function claimPendingMessages(
  deviceId: string,
  batchSize: number,
): Promise<ClaimedMessage[]> {
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) throw new DeviceNotFoundError(deviceId);
  if (!device.enabled) throw new DeviceDisabledError(deviceId);

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

export async function reportResult(
  messageId: string,
  deviceId: string,
  status: Extract<MessageStatus, "SENT" | "FAILED">,
  error?: string,
): Promise<Message> {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  if (!message) throw new MessageNotFoundError(messageId);
  if (message.status !== MESSAGE_STATUS.CLAIMED) throw new MessageNotClaimedError(messageId);
  if (message.deviceId !== deviceId) throw new DeviceMismatchError();

  if (status === MESSAGE_STATUS.SENT) {
    return prisma.message.update({
      where: { id: messageId },
      data: { status: MESSAGE_STATUS.SENT, sentAt: new Date(), attempts: { increment: 1 } },
    });
  }

  // Failed: retry until maxAttempts is reached, then give up.
  const attempts = message.attempts + 1;
  const giveUp = attempts >= message.maxAttempts;
  return prisma.message.update({
    where: { id: messageId },
    data: giveUp
      ? { status: MESSAGE_STATUS.FAILED, attempts, error: error ?? "send failed" }
      : {
          status: MESSAGE_STATUS.PENDING,
          attempts,
          error: error ?? "send failed",
          deviceId: null,
          claimedAt: null,
        },
  });
}
