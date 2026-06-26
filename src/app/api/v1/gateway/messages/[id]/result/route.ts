import { json, jsonError } from "@/lib/http";
import { authorizeRequest } from "@/server/auth/require-api-key";
import { checkRateLimit } from "@/server/rate-limit";
import { API_KEY_SCOPE } from "@/lib/auth/api-key-scope";
import { resultSchema } from "@/server/validation/gateway";
import {
  DeviceMismatchError,
  MessageNotClaimedError,
  MessageNotFoundError,
  reportResult,
} from "@/server/services/gateway-service";

const RATE_LIMIT = 240;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorizeRequest(request, API_KEY_SCOPE.GATEWAY);
  if (!auth.ok) {
    return jsonError(auth.status, auth.code, auth.message);
  }
  const apiKey = auth.apiKey;

  const rate = checkRateLimit(`result:${apiKey.id}`, RATE_LIMIT);
  if (!rate.allowed) {
    const res = jsonError(429, "rate_limited", "Too many requests; slow down");
    res.headers.set("Retry-After", String(rate.retryAfterSeconds));
    return res;
  }

  const { id } = await params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON");
  }

  const parsed = resultSchema.safeParse(payload);
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
    const message = await reportResult(
      id,
      parsed.data.deviceId,
      parsed.data.status,
      parsed.data.error,
    );
    return json({ id: message.id, status: message.status, attempts: message.attempts });
  } catch (error) {
    if (error instanceof MessageNotFoundError) {
      return jsonError(404, "message_not_found", error.message);
    }
    if (error instanceof MessageNotClaimedError) {
      return jsonError(409, "message_not_claimed", error.message);
    }
    if (error instanceof DeviceMismatchError) {
      return jsonError(403, "device_mismatch", error.message);
    }
    console.error("Failed to report result", error);
    return jsonError(500, "internal_error", "Failed to report result");
  }
}
