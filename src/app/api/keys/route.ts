import { json, jsonError } from "@/lib/http";
import { requireSession } from "@/server/auth/require-session";
import { getClientIp } from "@/server/client-ip";
import { checkRateLimit } from "@/server/rate-limit";
import { createApiKeySchema } from "@/server/validation/api-key";
import { createApiKey } from "@/server/services/api-key-service";

// Issuing a credential is a rare, deliberate action; a low cap is generous for
// the single admin and keeps an unauthenticated flood from reaching the
// session verification below.
const RATE_LIMIT = 10;

export async function POST(request: Request) {
  const rate = checkRateLimit(`keys-create:${getClientIp(request)}`, RATE_LIMIT);
  if (!rate.allowed) {
    const res = jsonError(429, "rate_limited", "Too many requests; slow down.");
    res.headers.set("Retry-After", String(rate.retryAfterSeconds));
    return res;
  }

  const session = await requireSession();
  if (!session) {
    return jsonError(401, "unauthenticated", "Sign in to issue API keys.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Request body must be valid JSON.");
  }

  const parsed = createApiKeySchema.safeParse(body);
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
    const created = await createApiKey(parsed.data);
    // 201 carries the raw key — the one and only time it is transmitted.
    return json(created, 201);
  } catch (error) {
    console.error("Failed to create API key", error);
    return jsonError(500, "internal_error", "Failed to create the API key.");
  }
}
