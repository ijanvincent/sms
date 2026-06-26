// API-key scopes separate the two principals that authenticate to the gateway:
// CLIENT keys may only enqueue messages; GATEWAY keys (held by the Android
// sender) may only claim and report on them. This keeps a leaked client key
// from draining or reading the queue, and vice versa. Stored as a string
// column; this is the single source of truth — never hardcode the strings.
export const API_KEY_SCOPE = {
  CLIENT: "client",
  GATEWAY: "gateway",
} as const;

export type ApiKeyScope = (typeof API_KEY_SCOPE)[keyof typeof API_KEY_SCOPE];

export const ALL_API_KEY_SCOPES = Object.values(API_KEY_SCOPE) as ApiKeyScope[];

export function isApiKeyScope(value: unknown): value is ApiKeyScope {
  return (
    typeof value === "string" &&
    ALL_API_KEY_SCOPES.includes(value as ApiKeyScope)
  );
}
