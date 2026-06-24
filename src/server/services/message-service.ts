import { prisma } from "@/lib/db";
import { normalizePhMobile } from "@/lib/sms/phone";
import { MESSAGE_STATUS } from "@/lib/sms/status";
import type { ApiKey, Message } from "@/generated/prisma/client";
import type { SendMessageInput } from "@/server/validation/message";

export class InvalidRecipientError extends Error {
  constructor(recipient: string) {
    super(`Invalid PH mobile number: ${recipient}`);
    this.name = "InvalidRecipientError";
  }
}

export class DailyQuotaExceededError extends Error {
  constructor(public readonly quota: number) {
    super(`Daily message quota of ${quota} reached`);
    this.name = "DailyQuotaExceededError";
  }
}

function startOfToday(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function enqueueMessage(
  input: SendMessageInput,
  apiKey: ApiKey,
): Promise<Message> {
  const recipient = normalizePhMobile(input.recipient);
  if (!recipient) throw new InvalidRecipientError(input.recipient);

  if (apiKey.dailyQuota !== null) {
    const sentToday = await prisma.message.count({
      where: { apiKeyId: apiKey.id, createdAt: { gte: startOfToday() } },
    });
    if (sentToday >= apiKey.dailyQuota) {
      throw new DailyQuotaExceededError(apiKey.dailyQuota);
    }
  }

  return prisma.message.create({
    data: {
      recipient,
      body: input.body,
      status: MESSAGE_STATUS.PENDING,
      apiKeyId: apiKey.id,
    },
  });
}

export function listMessages(limit = 100) {
  return prisma.message.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { device: { select: { id: true, name: true } } },
  });
}

export type MessageListItem = Awaited<ReturnType<typeof listMessages>>[number];
