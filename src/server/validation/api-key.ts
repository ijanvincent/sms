import { z } from "zod";

import { API_KEY_SCOPE } from "@/lib/auth/api-key-scope";

const MAX_LABEL_LENGTH = 80;

export const createApiKeySchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "label is required")
    .max(MAX_LABEL_LENGTH, `label must be ${MAX_LABEL_LENGTH} characters or fewer`),
  scope: z.enum([API_KEY_SCOPE.CLIENT, API_KEY_SCOPE.GATEWAY]),
  // Absent or null both mean "unlimited"; the column is nullable.
  dailyQuota: z
    .number()
    .int("dailyQuota must be a whole number")
    .positive("dailyQuota must be greater than zero")
    .nullable()
    .optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
