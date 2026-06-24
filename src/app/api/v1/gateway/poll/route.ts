import { json, jsonError } from "@/lib/http";
import { authenticateRequest } from "@/server/auth/require-api-key";
import { pollSchema } from "@/server/validation/gateway";
import {
  DeviceDisabledError,
  DeviceNotFoundError,
  claimPendingMessages,
} from "@/server/services/gateway-service";

export async function POST(request: Request) {
  const apiKey = await authenticateRequest(request);
  if (!apiKey) {
    return jsonError(401, "unauthorized", "Missing or invalid API key");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON");
  }

  const parsed = pollSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError(
      422,
      "validation_error",
      "Invalid request body",
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  try {
    const messages = await claimPendingMessages(
      parsed.data.deviceId,
      parsed.data.batchSize,
    );
    return json({ messages });
  } catch (error) {
    if (error instanceof DeviceNotFoundError) {
      return jsonError(404, "device_not_found", error.message);
    }
    if (error instanceof DeviceDisabledError) {
      return jsonError(403, "device_disabled", error.message);
    }
    console.error("Failed to claim messages", error);
    return jsonError(500, "internal_error", "Failed to claim messages");
  }
}
