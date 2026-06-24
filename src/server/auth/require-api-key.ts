import { extractBearerToken, verifyApiKey } from "@/lib/auth/api-key";
import type { ApiKey } from "@/generated/prisma/client";

export function authenticateRequest(request: Request): Promise<ApiKey | null> {
  const token = extractBearerToken(request.headers.get("authorization"));
  return verifyApiKey(token);
}
