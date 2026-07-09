# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Next.js App Router (standalone) → Cloud Run
# Build args for NEXT_PUBLIC_* are baked at build time.
# -----------------------------------------------------------------------------

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public env vars must be available at `next build` (inlined into the client bundle).
ARG NEXT_PUBLIC_API_URL=
ARG NEXT_PUBLIC_APP_URL=
ARG NEXT_PUBLIC_GOOGLE_CALENDAR_SUCCESS_URL=
ARG NEXT_PUBLIC_GOOGLE_CALENDAR_ERROR_URL=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_GOOGLE_CALENDAR_SUCCESS_URL=$NEXT_PUBLIC_GOOGLE_CALENDAR_SUCCESS_URL \
    NEXT_PUBLIC_GOOGLE_CALENDAR_ERROR_URL=$NEXT_PUBLIC_GOOGLE_CALENDAR_ERROR_URL \
    SKIP_CHROMIUM_PACK=1

RUN npm run build

# ---- runner ----
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0 \
    NODE_OPTIONS=--max-http-header-size=65536

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
