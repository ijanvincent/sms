import { z } from "zod";

import { MESSAGE_STATUS } from "@/lib/sms/status";

export const pollSchema = z.object({
  deviceId: z.string().min(1, "deviceId is required"),
  batchSize: z.number().int().min(1).max(50).optional().default(10),
});

export const resultSchema = z.object({
  deviceId: z.string().min(1, "deviceId is required"),
  status: z.enum([MESSAGE_STATUS.SENT, MESSAGE_STATUS.FAILED]),
  error: z.string().max(500).optional(),
});

export type PollInput = z.infer<typeof pollSchema>;
export type ResultInput = z.infer<typeof resultSchema>;
