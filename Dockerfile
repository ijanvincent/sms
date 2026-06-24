# syntax=docker/dockerfile:1

# Multi-stage build:
#   deps     -> install dependencies
#   builder  -> prisma generate + next build (standalone)
#   migrator -> one-shot image that applies DB migrations (full toolchain)
#   runner   -> slim runtime image serving the app

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

# ---- builder: generate Prisma client + build the standalone server ----
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
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
