# syntax=docker/dockerfile:1

# Multi-stage build:
#   deps     -> install dependencies
#   builder  -> prisma generate + next build (standalone)
#   migrator -> one-shot image that applies DB migrations (full toolchain)
#   runner   -> slim runtime image serving the app
#   realtime -> authenticated WebSocket + PostgreSQL notification sidecar
#   proxy    -> one HTTP/WebSocket entry point for Cloudflare Tunnel

FROM node:22-alpine AS base
WORKDIR /app

# ---- deps: install all dependencies (dev included, needed to build) ----
FROM base AS deps
COPY package.json package-lock.json ./
# Harden install against flaky networks: more retries, longer timeouts, less noise.
RUN npm ci --no-audit --no-fund \
  --fetch-retries=5 \
  --fetch-retry-factor=2 \
  --fetch-retry-mintimeout=20000 \
  --fetch-retry-maxtimeout=180000

# ---- tester: deps + source + Prisma client, for fast unit tests (no next build) ----
# CI targets this stage to run vitest without paying the full production build cost.
FROM base AS tester
ENV NEXT_TELEMETRY_DISABLED=1
# Build-time stand-in only; the DB-free unit tests never open a connection.
ENV DATABASE_URL="postgresql://test:test@localhost:5432/test"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
CMD ["npm", "test"]

# ---- builder: generate Prisma client + build the standalone server ----
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
# `next build` imports every route module to collect page data, which loads the
# Prisma client and requires DATABASE_URL. This value is a build-time stand-in
# only: no migrations or queries run here, and it is never carried into the
# runner stage — the real connection string is injected at runtime from .env.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- migrator: applies pending migrations then exits (run as an init container) ----
# Inherits the builder's full node_modules + schema, so the Prisma CLI has every
# transitive dependency it needs.
FROM builder AS migrator
ENV NODE_ENV=production
CMD ["npx", "prisma", "migrate", "deploy"]

# ---- runner: minimal runtime image (server only; migrations handled separately) ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as an unprivileged user.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Next.js standalone output (self-contained server + traced node_modules).
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

# ---- realtime: WebSocket wake-ups backed by PostgreSQL LISTEN/NOTIFY ----
FROM base AS realtime
ENV NODE_ENV=production
ENV REALTIME_PORT=3001
COPY --from=deps /app/node_modules ./node_modules
COPY realtime ./realtime
COPY src/lib/realtime-protocol.ts ./src/lib/realtime-protocol.ts
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 realtime
USER realtime
EXPOSE 3001
CMD ["./node_modules/.bin/tsx", "realtime/server.ts"]

# ---- proxy: normal HTTP to Next.js, WebSocket upgrades to realtime ----
FROM nginx:1.27-alpine AS proxy
COPY deploy/nginx.conf /etc/nginx/nginx.conf
EXPOSE 3000
