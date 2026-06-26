import { extractBearerToken, verifyApiKey } from "@/lib/auth/api-key";
import type { ApiKeyScope } from "@/lib/auth/api-key-scope";
import type { ApiKey } from "@/generated/prisma/client";

export type AuthFailure = {
  ok: false;
  status: 401 | 403;
  code: "unauthorized" | "insufficient_scope";
  message: string;
};

export type AuthResult = { ok: true; apiKey: ApiKey } | AuthFailure;

// Authenticates the bearer key and enforces that it carries the scope the route
// requires. A client key can never drive a gateway route, and vice versa.
export async function authorizeRequest(
  request: Request,
  requiredScope: ApiKeyScope,
): Promise<AuthResult> {
  const token = extractBearerToken(request.headers.get("authorization"));
  const apiKey = await verifyApiKey(token);

  if (!apiKey) {
    return {
      ok: false,
      status: 401,
      code: "unauthorized",
      message: "Missing or invalid API key",
    };
  }

  if (apiKey.scope !== requiredScope) {
    return {
      ok: false,
      status: 403,
      code: "insufficient_scope",
      message: `This API key is not authorized for "${requiredScope}" operations`,
    };
  }

  return { ok: true, apiKey };
}
