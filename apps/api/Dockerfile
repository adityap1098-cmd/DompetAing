# ══════════════════════════════════════
# DompetAing API — Dockerfile
# Multi-stage: deps → build → production
# ══════════════════════════════════════

# ── Stage 1: Install all dependencies ──
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN npm ci

# ── Stage 2: Build ──
FROM node:20-alpine AS builder
WORKDIR /app

# npm workspaces hoist semua ke root node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY package.json turbo.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build shared → dist
RUN cd packages/shared && npx tsc --outDir dist || true

# Build API → dist
RUN cd apps/api && npx tsc

# ── Stage 3: Production runtime ──
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 hono

# Install production deps only
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN npm ci --omit=dev

# Prisma schema + migrations (for prisma migrate deploy)
COPY apps/api/prisma ./apps/api/prisma
RUN cd apps/api && npx prisma generate

# Built shared package
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/

# Built API
COPY --from=builder /app/apps/api/dist ./apps/api/dist

USER hono
EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
