import { prisma } from "@/lib/db";
import { normalizePhMobile } from "@/lib/sms/phone";
import { MESSAGE_STATUS } from "@/lib/sms/status";
import type { Message } from "@/generated/prisma/client";
import type { SendMessageInput } from "@/server/validation/message";

export class InvalidRecipientError extends Error {
  constructor(recipient: string) {
    super(`Invalid PH mobile number: ${recipient}`);
    this.name = "InvalidRecipientError";
  }
}

export async function enqueueMessage(
  input: SendMessageInput,
  apiKeyId: string,
): Promise<Message> {
  const recipient = normalizePhMobile(input.recipient);
  if (!recipient) throw new InvalidRecipientError(input.recipient);

  return prisma.message.create({
    data: {
      recipient,
      body: input.body,
      status: MESSAGE_STATUS.PENDING,
      apiKeyId,
    },
  });
}
