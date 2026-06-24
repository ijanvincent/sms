# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A self-hosted SMS gateway. Instead of paying a commercial SMS provider, an Android
phone with a SIM (Globe/TM promo) acts as the sender. This repo is the **Next.js
web dashboard + HTTP API** (the control plane and message queue). The Android/Kotlin
sender app that actually transmits the texts lives in a **separate repository**.

The flow: clients POST messages to the API → messages are queued in Postgres →
the Android device polls/claims pending messages, sends them over the cellular
network, and reports status back.

## Commands

```bash
npm run dev      # next dev (local dev server on :3000)
npm run build    # next build (standalone output for Docker)
npm run start    # serve a production build
npm run lint     # eslint

npx prisma generate          # regenerate the Prisma client (REQUIRED after clone — see below)
npx prisma migrate dev       # create + apply a migration in dev
npx prisma migrate deploy    # apply pending migrations (prod / CI)

docker compose up -d db      # just Postgres, for local `next dev`
docker compose up --build    # full stack (db + migrate one-shot + web), production-style
```

There is no test runner configured yet.

### Prisma client is generated, not committed

`src/generated/prisma/` is gitignored. After a fresh clone or schema change you
**must** run `npx prisma generate` or imports from `@/generated/prisma/*` will fail.
The client is configured with `output = "../src/generated/prisma"` in the schema.

## Architecture

- **Next.js 16 App Router** (`src/app`), **React 19**, **TypeScript**, **Tailwind v4**.
  Path alias `@/*` → `src/*`.
- **Prisma 7 with the driver-adapter model** — it talks to Postgres through
  `@prisma/adapter-pg` (`PrismaPg`), not the legacy binary engine. The single shared
  client lives in `src/lib/db.ts` and is cached on `globalThis` in dev to survive
  hot reloads. Always import `prisma` from there; never instantiate `PrismaClient`
  elsewhere.
- **Config**: `prisma.config.ts` (not the deprecated `package.json#prisma` block)
  loads `DATABASE_URL` via `dotenv`. `next.config.ts` sets `output: "standalone"`
  for a slim Docker runtime image.

### Data model (`prisma/schema.prisma`)

- `ApiKey` — issued credentials. Only the SHA-256 `hashedKey` is stored (unique);
  `prefix` is a display-safe fragment; `lastUsedAt` is touched on each successful auth.
- `Device` — a registered phone. `lastSeenAt` is a heartbeat that powers online/offline.
- `Message` — the queue. `status` drives the lifecycle; `@@index([status, createdAt])`
  and `@@index([deviceId, status])` support the device's claim query and dashboards.
  `attempts`/`maxAttempts` bound retries; `claimedAt`/`sentAt` track progress.

### Domain rules (`src/lib`)

- **Message lifecycle** (`sms/status.ts`): `PENDING → CLAIMED → SENT | FAILED`.
  Status is a string column; `MESSAGE_STATUS` / `isMessageStatus()` are the single
  source of truth — use them rather than hardcoding status strings.
- **Phone normalization** (`sms/phone.ts`): `normalizePhMobile()` converts any PH
  mobile form (`09xx`, `+63…`, `63…`, bare `9xx`) to E.164 (`+639XXXXXXXXX`), or
  returns `null` if invalid. Normalize recipients at the API boundary before persisting.
- **API-key auth** (`auth/api-key.ts`): keys are `sk_live_`-prefixed; `verifyApiKey()`
  hashes the presented key, looks it up, checks `enabled`, and does a `timingSafeEqual`
  comparison. Bearer tokens are pulled from the `Authorization` header via
  `extractBearerToken()`. Raw keys are never stored or logged.

## Deployment

Multi-stage `Dockerfile`: `deps` → `builder` (runs `prisma generate` + `next build`)
→ `migrator` (one-shot `prisma migrate deploy`) → `runner` (non-root, serves the
standalone server). docker-compose wires Postgres + a one-shot `migrate` init
container (gated on db health) + the `web` service. Inside the network, services
reach Postgres at host `db`; the host-facing `DATABASE_URL` in `.env` points at
`localhost`. Credentials come from `.env` (see `.env.example`) — never commit `.env`.
