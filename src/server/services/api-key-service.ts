import { prisma } from "@/lib/db";

export interface ApiKeyListItem {
  id: string;
  label: string;
  prefix: string;
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
      enabled: true,
      dailyQuota: true,
      lastUsedAt: true,
      createdAt: true,
      _count: { select: { messages: true } },
    },
  });

  return keys.map(({ _count, ...key }) => ({
    ...key,
    messageCount: _count.messages,
  }));
}
