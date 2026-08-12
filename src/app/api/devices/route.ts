import { json, jsonError } from "@/lib/http";
import { requireSession } from "@/server/auth/require-session";
import { getClientIp } from "@/server/client-ip";
import { checkRateLimit } from "@/server/rate-limit";
import { createDeviceSchema } from "@/server/validation/device";
import { createDevice } from "@/server/services/device-service";

// Registering a phone is a rare, deliberate action; the cap also keeps an
// unauthenticated flood from reaching the session verification below.
const RATE_LIMIT = 10;

export async function POST(request: Request) {
  const rate = checkRateLimit(`devices-create:${getClientIp(request)}`, RATE_LIMIT);
  if (!rate.allowed) {
    const res = jsonError(429, "rate_limited", "Too many requests; slow down.");
    res.headers.set("Retry-After", String(rate.retryAfterSeconds));
    return res;
  }

  const session = await requireSession();
  if (!session) {
    return jsonError(401, "unauthenticated", "Sign in to register devices.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = createDeviceSchema.safeParse(body);
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
    return json(await createDevice(parsed.data), 201);
  } catch (error) {
    console.error("Failed to register device", error);
    return jsonError(500, "internal_error", "Failed to register the device.");
  }
}
