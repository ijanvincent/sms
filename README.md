<div align="center">

# 📱 SMS Gateway

**Send SMS through your own Android phone's promo SIM instead of paying a commercial provider.**

Clients `POST` messages to an HTTP API → messages are queued in PostgreSQL → a companion
Android app claims pending messages, sends them over the cellular network, and reports
status back. A Twilio alternative you fully own and self-host.

<br />

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-087EA4?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![Status](https://img.shields.io/badge/status-active-success)](#roadmap)

</div>

---

## Table of contents

- [Why](#why)
- [Screenshots](#screenshots)
- [Architecture](#architecture)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [API reference](#api-reference)
- [Message lifecycle](#message-lifecycle)
- [Scripts](#scripts)
- [Configuration](#configuration)
- [Security](#security)
- [Roadmap](#roadmap)
- [License](#license)

## Why

Commercial SMS APIs charge per message. If you already have a phone with an unlimited-text
promo (e.g. Globe/TM in the Philippines), you can turn it into your own SMS sender and pay
nothing per message. This repository is the **control plane**: a web dashboard, an HTTP API,
and a PostgreSQL-backed message queue. The Android sender that physically transmits the texts
lives in a **separate repository**.

## Screenshots

| Overview | Messages |
| :------: | :------: |
| ![Dashboard — Overview](docs/screenshots/dashboard-overview.png) | ![Dashboard — Messages](docs/screenshots/dashboard-messages.png) |

## Architecture

```
                  ┌──────────────────────── this repo ───────────────────────┐
  ┌──────────┐    │   ┌───────────────┐        ┌──────────────────────────┐   │    ┌───────────────┐
  │  Client  │ ── POST /api/v1/messages ─────▶ │  Next.js API + dashboard │   │    │ Android sender │
  │ (your    │    │   │   (validate,  │        │                          │   │    │   (separate    │
  │  app)    │    │   │  rate-limit,  │ ─────▶ │   Postgres message queue │ ◀── poll ── │    repo)    │
  └──────────┘    │   │   enqueue)    │        │  PENDING→CLAIMED→SENT/... │   │    │  SmsManager   │
                  │   └───────────────┘        └──────────────────────────┘   │    └───────┬───────┘
                  └────────────────────────────────────────────────────────────┘            │
                                                                                      cellular network
                                                                                             ▼
                                                                                       📱 recipient
```

- **Control plane (this repo)** — Next.js 16 App Router, React 19, TypeScript, Tailwind v4,
  shadcn/ui. Prisma 7 (driver-adapter model over `@prisma/adapter-pg`) on PostgreSQL.
- **Sender (separate repo)** — an Android/Kotlin foreground service that polls the gateway,
  sends via the device's default SMS SIM, and reports delivery back.

## Features

- **HTTP API** to enqueue messages, with request validation (Zod) and structured JSON errors.
- **Postgres-backed queue** with an explicit lifecycle — `PENDING → CLAIMED → SENT | FAILED`,
  bounded retries (`attempts` / `maxAttempts`), and indexes tuned for the device claim query.
- **Atomic claim & report** — the device's poll and result endpoints use
  `SELECT … FOR UPDATE SKIP LOCKED` inside a transaction, eliminating double-send races (TOCTOU).
- **Per-key rate limiting** (30 req/min) and an optional **daily send quota** per API key.
- **Scoped API keys** — keys are granted explicit capabilities (e.g. send vs. poll), enforcing
  least privilege between your backend and the Android sender.
- **Secure auth on every layer** — `sk_live_`-prefixed API keys (only a SHA-256 hash is stored,
  compared in constant time) for the API; a single-admin JWT session cookie (httpOnly,
  `SameSite=strict`) for the dashboard, with the admin password hashed via `scrypt`.
- **PH mobile normalization** — any input form (`09xx`, `+63…`, `63…`, `9xx`) is normalized to
  E.164 at the API boundary before it is persisted.
- **Operational dashboard** — live queue stats, recent messages, devices, and API-key management.
- **Production Docker image** — multi-stage build, standalone Next.js output, one-shot migrator,
  non-root runtime.

## Tech stack

| Layer       | Choice                                                              |
| ----------- | ------------------------------------------------------------------ |
| Framework   | Next.js 16 (App Router), React 19, TypeScript                      |
| UI          | Tailwind CSS v4, shadcn/ui, dark mode                              |
| Data        | PostgreSQL 17, Prisma 7 with the `@prisma/adapter-pg` driver adapter |
| Validation  | Zod                                                                |
| Auth        | `jose` (HS256 JWT cookie) + Node `scrypt`; SHA-256 hashed API keys |
| Tests       | Vitest                                                             |
| Deployment  | Docker / docker-compose                                            |

## Project structure

```
sms/
├── prisma/
│   ├── migrations/          # SQL migrations (applied by the one-shot migrator)
│   ├── schema.prisma        # ApiKey · Device · Message models
│   └── seed.ts              # idempotent dev seed (known devices)
├── scripts/                 # admin / API-key / device CLI helpers
├── src/
│   ├── app/
│   │   ├── (dashboard)/      # authenticated dashboard routes
│   │   ├── api/             # HTTP API + gateway endpoints
│   │   └── login/           # admin sign-in
│   ├── components/          # UI components (shadcn/ui)
│   ├── generated/prisma/    # generated Prisma client (gitignored)
│   ├── lib/                 # db client, auth, SMS domain logic
│   ├── server/              # services + request validation
│   └── proxy.ts             # edge auth gate for dashboard routes
├── docker-compose.yml       # db + one-shot migrator + web
├── Dockerfile               # multi-stage: deps → builder → migrator → runner
└── prisma.config.ts         # Prisma 7 config (schema, migrations, seed)
```

## Getting started

### Prerequisites

- Node.js 20 or newer
- Docker (for PostgreSQL), or a PostgreSQL instance you manage yourself

### 1. Install & configure

```bash
git clone https://github.com/ijanvincent/sms.git
cd sms
npm install
cp .env.example .env        # then edit the values
```

> [!IMPORTANT]
> **The Prisma client is generated, not committed.** After a fresh clone (or any schema
> change) you must run `npx prisma generate`, or imports from `@/generated/prisma/*` will fail.

```bash
npx prisma generate
```

### 2. Start Postgres and apply migrations

```bash
docker compose up -d db     # just the database, for local dev
npx prisma migrate deploy   # apply migrations
```

### 3. Create the admin account, a device, and an API key

```bash
npm run admin:create -- "admin" "<a-strong-password>"   # prints ADMIN_USERNAME / ADMIN_PASSWORD_HASH → put in .env
npm run device:create -- "My phone" "TM"                # registers a sender device, prints its deviceId
npm run key:create   -- "My backend"                    # issues an API key (raw key shown once)
```

> [!TIP]
> Prefer reproducible fixtures? `npm run db:seed` re-creates known development devices
> idempotently — handy after a `prisma migrate reset` or `docker compose down -v`.

### 4. Run

```bash
npm run dev                 # http://localhost:3000
```

Open the dashboard, sign in with your admin credentials, and you are ready to queue messages.

### Full stack with Docker

```bash
docker compose up --build   # db + one-shot migrator + web, production-style
```

## API reference

All API requests authenticate with a Bearer token: `Authorization: Bearer sk_live_…`.
Responses are JSON; errors follow `{ "error": { "code": <string>, "message": <string>, "details"?: … } }`.

### Enqueue a message — `POST /api/v1/messages`

```bash
curl -X POST http://localhost:3000/api/v1/messages \
  -H "Authorization: Bearer sk_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{ "recipient": "09171234567", "body": "Hello from my own gateway!" }'
```

```jsonc
// 202 Accepted
{ "id": "clx…", "status": "PENDING", "recipient": "+639171234567", "createdAt": "…" }
```

`429` is returned (with a `Retry-After` header) when the per-key rate limit or daily quota is exceeded.

### Gateway endpoints (used by the Android sender)

| Method & path                               | Purpose                                                               |
| ------------------------------------------- | --------------------------------------------------------------------- |
| `POST /api/v1/gateway/poll`                 | Atomically claim a batch of pending messages for a device.            |
| `POST /api/v1/gateway/messages/{id}/result` | Report the outcome (`SENT` / `FAILED` + reason) of a claimed message. |

## Message lifecycle

```
PENDING ──claim──▶ CLAIMED ──send──▶ SENT
   ▲                  │
   └──── requeue ──────┘ (on transient failure, while attempts < maxAttempts)
                      │
                      └──send fails (attempts exhausted)──▶ FAILED
```

`MESSAGE_STATUS` / `isMessageStatus()` (`src/lib/sms/status.ts`) are the single source of truth
for status values — never hardcode the strings.

## Scripts

| Command                 | Description                                |
| ----------------------- | ------------------------------------------ |
| `npm run dev`           | Start the dev server (`:3000`)             |
| `npm run build`         | Production build (standalone output)       |
| `npm run start`         | Serve a production build                   |
| `npm run lint`          | ESLint                                     |
| `npm run test`          | Run the Vitest suite                       |
| `npm run db:seed`       | Seed known development devices (idempotent)|
| `npm run admin:create`  | Create the dashboard admin credential      |
| `npm run device:create` | Register a sender device                   |
| `npm run key:create`    | Issue an API key (raw key printed once)    |

## Configuration

Configuration is read from `.env` (see [`.env.example`](.env.example)). Key variables:

| Variable              | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| `POSTGRES_USER`       | PostgreSQL role used by the database container.                             |
| `POSTGRES_PASSWORD`   | Password for that role.                                                      |
| `POSTGRES_DB`         | Database name.                                                               |
| `DATABASE_URL`        | PostgreSQL connection string (composed from the values above).              |
| `AUTH_SECRET`         | Secret that signs the dashboard session JWT (`openssl rand -hex 32`).        |
| `ADMIN_USERNAME`      | Dashboard admin username.                                                    |
| `ADMIN_PASSWORD_HASH` | `scrypt` hash of the admin password (generated by `npm run admin:create`).   |

> [!WARNING]
> Never commit `.env`. Secrets and raw API keys are never logged.

## Security

- **API keys** — only the SHA-256 hash is stored; presented keys are hashed and compared with
  `timingSafeEqual`. Raw keys are shown once at creation and never again. Keys are scoped to
  least-privilege capabilities (send vs. poll).
- **Dashboard** — single-admin login, `scrypt`-hashed password, short-lived HS256 JWT in an
  httpOnly, `SameSite=strict` cookie; all routes gated by an edge proxy.
- **Defense in depth** — input validation at every boundary, hardening response headers,
  per-key rate limiting, optional daily quota, and atomic queue operations to prevent duplicate
  sends. In Docker, PostgreSQL is bound to loopback only.

## Roadmap

- [x] Scoped API keys (send vs. poll)
- [x] Per-key rate limiting and daily quota
- [ ] Claim-timeout reaper — return stuck `CLAIMED` messages to `PENDING`
- [ ] Delivery webhooks
- [ ] Android sender app (separate repository)

## License

No license has been granted for this repository. All rights reserved by the author —
you may not reuse, redistribute, or publish this code without explicit permission. If an
open-source license is added later, it will appear here and in a `LICENSE` file.
