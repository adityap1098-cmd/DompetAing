# ══════════════════════════════════════
# DompetAing Web — Dockerfile
# Multi-stage: deps → build → nginx
# ══════════════════════════════════════

# ── Stage 1: Install dependencies ──
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

RUN npm ci

# ── Stage 2: Build ──
FROM node:20-alpine AS builder
WORKDIR /app

# VITE_API_URL di-bake saat compile
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules 2>/dev/null || true
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules 2>/dev/null || true

COPY package.json turbo.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN cd apps/web && npx vite build

# ── Stage 3: Serve via nginx ──
FROM nginx:1.27-alpine AS runner

RUN rm /etc/nginx/conf.d/default.conf
COPY apps/web/nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
