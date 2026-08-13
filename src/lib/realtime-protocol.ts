export const REALTIME_PROTOCOL_VERSION = 1;

export type RealtimeAudience = "dashboard" | "gateway";

export interface DatabaseRealtimeEvent {
  type: "message.changed" | "device.changed";
  messageId?: string;
  deviceId?: string;
  status?: string;
}

export interface ClientRealtimeEvent {
  version: typeof REALTIME_PROTOCOL_VERSION;
  type: "connected" | "dashboard.changed" | "queue.available";
}

export function eventForAudience(
  event: DatabaseRealtimeEvent,
  audience: RealtimeAudience,
): ClientRealtimeEvent | null {
  if (audience === "dashboard") {
    return { version: REALTIME_PROTOCOL_VERSION, type: "dashboard.changed" };
  }

  if (event.type === "message.changed" && event.status === "PENDING") {
    return { version: REALTIME_PROTOCOL_VERSION, type: "queue.available" };
  }

  return null;
}

export function parseCookieHeader(header: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!header) return cookies;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name) cookies.set(name, decodeURIComponent(value));
  }
  return cookies;
}

export function nextReconnectDelay(currentMs: number, maximumMs: number): number {
  return Math.min(currentMs * 2, maximumMs);
}
