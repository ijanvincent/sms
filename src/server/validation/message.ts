import { z } from "zod";

export const sendMessageSchema = z.object({
  recipient: z.string().min(1, "recipient is required"),
  body: z.string().min(1, "body is required").max(1600, "body must be 1600 characters or fewer"),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
