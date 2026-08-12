import { prisma } from "@/lib/db";
import { generateApiKey } from "@/lib/auth/api-key";
import type { ApiKeyScope } from "@/lib/auth/api-key-scope";

export interface CreateApiKeyInput {
  label: string;
  scope: ApiKeyScope;
  dailyQuota?: number | null;
}

export interface CreatedApiKey {
  id: string;
  label: string;
  prefix: string;
  scope: ApiKeyScope;
  // The only time the secret exists outside the caller's hands. Only its
  // SHA-256 hash is persisted, so this value is unrecoverable once discarded —
  // return it, show it once, never log or store it.
  raw: string;
}

export async function createApiKey({
  label,
  scope,
  dailyQuota = null,
}: CreateApiKeyInput): Promise<CreatedApiKey> {
  const { raw, hashedKey, prefix } = generateApiKey();

  const created = await prisma.apiKey.create({
    data: { label, hashedKey, prefix, scope, dailyQuota },
    select: { id: true, label: true, prefix: true, scope: true },
  });

  return { ...created, scope: created.scope as ApiKeyScope, raw };
}

export interface ApiKeyListItem {
  id: string;
  label: string;
  prefix: string;
  scope: ApiKeyScope;
  enabled: boolean;
  dailyQuota: number | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  messageCount: number;
}

// hashedKey is deliberately never selected — the secret material must not
// leave the data layer, even toward our own server components.
export async function listApiKeys(): Promise<ApiKeyListItem[]> {
  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      prefix: true,
      scope: true,
      enabled: true,
      dailyQuota: true,
      lastUsedAt: true,
      createdAt: true,
      _count: { select: { messages: true } },
    },
  });

  return keys.map(({ _count, scope, ...key }) => ({
    ...key,
    scope: scope as ApiKeyScope,
    messageCount: _count.messages,
  }));
}
