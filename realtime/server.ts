import { createHash, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage } from "node:http";

import { jwtVerify } from "jose";
import { Client, Pool } from "pg";
import WebSocket, { WebSocketServer } from "ws";

import {
  eventForAudience,
  parseCookieHeader,
  REALTIME_PROTOCOL_VERSION,
  type DatabaseRealtimeEvent,
  type RealtimeAudience,
} from "../src/lib/realtime-protocol";

const PORT = Number.parseInt(process.env.REALTIME_PORT ?? "3001", 10);
const DATABASE_URL = requiredEnvironment("DATABASE_URL");
const AUTH_SECRET = requiredEnvironment("AUTH_SECRET");
const SESSION_COOKIE = "sms_session";
const DATABASE_CHANNEL = "sms_events";
const HEARTBEAT_MS = 10_000;

interface ConnectionMetadata {
  audience: RealtimeAudience;
  deviceId?: string;
  alive: boolean;
}

const metadata = new WeakMap<WebSocket, ConnectionMetadata>();
const sockets = new Set<WebSocket>();
const pool = new Pool({ connectionString: DATABASE_URL, max: 5 });
const listener = new Client({ connectionString: DATABASE_URL });

const server = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end('{"status":"ok"}');
    return;
  }
  response.writeHead(404).end();
});

const websocketServer = new WebSocketServer({ noServer: true, maxPayload: 4 * 1024 });

server.on("upgrade", async (request, socket, head) => {
  try {
    const authorized = await authorizeUpgrade(request);
    if (!authorized) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    websocketServer.handleUpgrade(request, socket, head, (websocket) => {
      metadata.set(websocket, { ...authorized, alive: true });
      websocketServer.emit("connection", websocket, request);
    });
  } catch (error) {
    console.error("Realtime upgrade failed", error);
    socket.write("HTTP/1.1 500 Internal Server Error\r\nConnection: close\r\n\r\n");
    socket.destroy();
  }
});

websocketServer.on("connection", (socket) => {
  sockets.add(socket);
  socket.on("pong", () => {
    const current = metadata.get(socket);
    if (current) current.alive = true;
  });
  socket.on("close", () => sockets.delete(socket));
  socket.on("error", (error) => console.warn("Realtime socket error", error.message));
  socket.send(JSON.stringify({ version: REALTIME_PROTOCOL_VERSION, type: "connected" }));
});

listener.on("notification", (notification) => {
  if (!notification.payload) return;
  try {
    broadcast(JSON.parse(notification.payload) as DatabaseRealtimeEvent);
  } catch (error) {
    console.warn("Ignoring malformed database realtime event", error);
  }
});

listener.on("error", (error) => {
  console.error("PostgreSQL realtime listener failed", error);
  process.exitCode = 1;
  void shutdown();
});

const heartbeat = setInterval(async () => {
  const deviceIds = new Set<string>();
  for (const socket of sockets) {
    const current = metadata.get(socket);
    if (!current) continue;
    if (!current.alive) {
      socket.terminate();
      continue;
    }
    current.alive = false;
    socket.ping();
    if (current.deviceId) deviceIds.add(current.deviceId);
  }

  if (deviceIds.size > 0) {
    try {
      await pool.query(
        'UPDATE "Device" SET "lastSeenAt" = NOW() WHERE id = ANY($1::text[]) AND enabled = true',
        [[...deviceIds]],
      );
    } catch (error) {
      console.error("Failed to record realtime gateway heartbeat", error);
    }
  }
}, HEARTBEAT_MS);

async function authorizeUpgrade(
  request: IncomingMessage,
): Promise<Omit<ConnectionMetadata, "alive"> | null> {
  const host = request.headers.host ?? "localhost";
  const url = new URL(request.url ?? "/", `http://${host}`);

  if (url.pathname === "/ws/dashboard") {
    if (!hasSameOrigin(request)) return null;
    const token = parseCookieHeader(request.headers.cookie).get(SESSION_COOKIE);
    if (!token) return null;
    try {
      await jwtVerify(token, new TextEncoder().encode(AUTH_SECRET), {
        issuer: "sms-gateway",
        algorithms: ["HS256"],
      });
      return { audience: "dashboard" };
    } catch {
      return null;
    }
  }

  if (url.pathname === "/ws/gateway") {
    const deviceId = url.searchParams.get("deviceId");
    const rawKey = extractBearer(request.headers.authorization);
    if (!deviceId || !rawKey) return null;
    const hashedKey = createHash("sha256").update(rawKey).digest("hex");
    const result = await pool.query<{
      hashedKey: string;
      keyId: string;
      deviceId: string | null;
    }>(
      `SELECT k."hashedKey", k.id AS "keyId", d.id AS "deviceId"
       FROM "ApiKey" k
       LEFT JOIN "Device" d ON d.id = $2 AND d.enabled = true
       WHERE k."hashedKey" = $1 AND k.enabled = true AND k.scope = 'gateway'`,
      [hashedKey, deviceId],
    );
    const candidate = result.rows[0];
    if (!candidate?.deviceId || !safeEqual(candidate.hashedKey, hashedKey)) return null;
    await pool.query('UPDATE "ApiKey" SET "lastUsedAt" = NOW() WHERE id = $1', [
      candidate.keyId,
    ]);
    await pool.query('UPDATE "Device" SET "lastSeenAt" = NOW() WHERE id = $1', [deviceId]);
    return { audience: "gateway", deviceId };
  }

  return null;
}

function broadcast(event: DatabaseRealtimeEvent): void {
  for (const socket of sockets) {
    if (socket.readyState !== WebSocket.OPEN) continue;
    const current = metadata.get(socket);
    if (!current) continue;
    const outgoing = eventForAudience(event, current.audience);
    if (outgoing) socket.send(JSON.stringify(outgoing));
  }
}

function hasSameOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  const forwardedHost = request.headers["x-forwarded-host"];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost)
    ?? request.headers.host;
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function extractBearer(header: string | undefined): string | null {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function shutdown(): Promise<void> {
  clearInterval(heartbeat);
  for (const socket of sockets) socket.close(1001, "server shutting down");
  websocketServer.close();
  server.close();
  await Promise.allSettled([listener.end(), pool.end()]);
}

process.on("SIGINT", () => void shutdown().finally(() => process.exit()));
process.on("SIGTERM", () => void shutdown().finally(() => process.exit()));

async function main(): Promise<void> {
  await listener.connect();
  await listener.query(`LISTEN ${DATABASE_CHANNEL}`);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Realtime WebSocket hub listening on :${PORT}`);
  });
}

void main().catch((error) => {
  console.error("Realtime startup failed", error);
  process.exit(1);
});
