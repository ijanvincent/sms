import { json, jsonError } from "@/lib/http";
import { authorizeRequest } from "@/server/auth/require-api-key";
import { checkRateLimit } from "@/server/rate-limit";
import { API_KEY_SCOPE } from "@/lib/auth/api-key-scope";
import { sendMessageSchema } from "@/server/validation/message";
import {
  DailyQuotaExceededError,
  InvalidRecipientError,
  enqueueMessage,
} from "@/server/services/message-service";

const RATE_LIMIT = 30;

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, API_KEY_SCOPE.CLIENT);
  if (!auth.ok) {
    return jsonError(auth.status, auth.code, auth.message);
  }
  const apiKey = auth.apiKey;

  const rate = checkRateLimit(`messages:${apiKey.id}`, RATE_LIMIT);
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

  const parsed = sendMessageSchema.safeParse(payload);
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
    const message = await enqueueMessage(parsed.data, apiKey);
    return json(
      {
        id: message.id,
        status: message.status,
        recipient: message.recipient,
        createdAt: message.createdAt,
      },
      202,
    );
  } catch (error) {
    if (error instanceof InvalidRecipientError) {
      return jsonError(422, "invalid_recipient", error.message);
    }
    if (error instanceof DailyQuotaExceededError) {
      return jsonError(429, "quota_exceeded", error.message);
    }
    console.error("Failed to enqueue message", error);
    return jsonError(500, "internal_error", "Failed to enqueue message");
  }
}
