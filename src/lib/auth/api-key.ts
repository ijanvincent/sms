import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/db";
import type { ApiKey } from "@/generated/prisma/client";

const KEY_PREFIX = "sk_live_";
const PREFIX_DISPLAY_LENGTH = 12;

export interface GeneratedApiKey {
  raw: string;
  hashedKey: string;
  prefix: string;
}

// Raw keys are never stored; only the SHA-256 hash is persisted and looked up.
export function generateApiKey(): GeneratedApiKey {
  const raw = `${KEY_PREFIX}${randomBytes(24).toString("hex")}`;
  return {
    raw,
    hashedKey: hashApiKey(raw),
    prefix: raw.slice(0, PREFIX_DISPLAY_LENGTH),
  };
}

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function verifyApiKey(raw: string | null): Promise<ApiKey | null> {
  if (!raw || !raw.startsWith(KEY_PREFIX)) return null;

  const hashed = hashApiKey(raw);
  const candidate = await prisma.apiKey.findUnique({
    where: { hashedKey: hashed },
  });
  if (!candidate || !candidate.enabled) return null;

  const a = Buffer.from(candidate.hashedKey);
  const b = Buffer.from(hashed);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  await prisma.apiKey.update({
    where: { id: candidate.id },
    data: { lastUsedAt: new Date() },
  });
  return candidate;
}

export function extractBearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}
