import { z } from "zod";

const MAX_NAME_LENGTH = 60;
const MAX_CARRIER_LENGTH = 30;
const MAX_SIM_LENGTH = 20;

// Carrier and SIM number are optional metadata for the dashboard; an empty
// field from the form means "not provided", which the column stores as null.
const optionalText = (max: number, field: string) =>
  z
    .string()
    .trim()
    .max(max, `${field} must be ${max} characters or fewer`)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();

export const createDeviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "name is required")
    .max(MAX_NAME_LENGTH, `name must be ${MAX_NAME_LENGTH} characters or fewer`),
  carrier: optionalText(MAX_CARRIER_LENGTH, "carrier"),
  simNumber: optionalText(MAX_SIM_LENGTH, "simNumber"),
});

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
