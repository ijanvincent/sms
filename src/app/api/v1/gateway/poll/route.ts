import { json, jsonError } from "@/lib/http";
import { authorizeRequest } from "@/server/auth/require-api-key";
import { checkRateLimit } from "@/server/rate-limit";
import { API_KEY_SCOPE } from "@/lib/auth/api-key-scope";
import { pollSchema } from "@/server/validation/gateway";
import {
  DeviceDisabledError,
  DeviceNotFoundError,
  claimPendingMessages,
} from "@/server/services/gateway-service";

const RATE_LIMIT = 120;

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, API_KEY_SCOPE.GATEWAY);
  if (!auth.ok) {
    return jsonError(auth.status, auth.code, auth.message);
  }
  const apiKey = auth.apiKey;

  const rate = checkRateLimit(`poll:${apiKey.id}`, RATE_LIMIT);
  if (!rate.allowed) {
    const res = jsonError(429, "rate_limited", "Too many requests; slow down");
    res.headers.set("Retry-After", String(rate.retryAfterSeconds));
    return res;
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
