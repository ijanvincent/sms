import { API_KEY_SCOPE } from "@/lib/auth/api-key-scope";
import { json, jsonError } from "@/lib/http";
import { authorizeRequest } from "@/server/auth/require-api-key";
import { checkRateLimit } from "@/server/rate-limit";
import {
  DeviceDisabledError,
  DeviceNotFoundError,
  disconnectDevice,
} from "@/server/services/gateway-service";
import { disconnectSchema } from "@/server/validation/gateway";

const RATE_LIMIT = 30;

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, API_KEY_SCOPE.GATEWAY);
  if (!auth.ok) {
    return jsonError(auth.status, auth.code, auth.message);
  }

  const rate = checkRateLimit(`disconnect:${auth.apiKey.id}`, RATE_LIMIT);
  if (!rate.allowed) {
    const response = jsonError(429, "rate_limited", "Too many requests; slow down");
    response.headers.set("Retry-After", String(rate.retryAfterSeconds));
    return response;
  }

  const payload = await request.json().catch(() => null);
  const parsed = disconnectSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonError(422, "validation_error", "Invalid request body");
  }

  try {
    await disconnectDevice(parsed.data.deviceId);
    return json({ disconnected: true });
  } catch (error) {
    if (error instanceof DeviceNotFoundError) {
      return jsonError(404, "device_not_found", error.message);
    }
    if (error instanceof DeviceDisabledError) {
      return jsonError(403, "device_disabled", error.message);
    }
    console.error("Failed to disconnect device", error);
    return jsonError(500, "internal_error", "Failed to disconnect device");
  }
}
