# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Migrations + seed scripts: `docker compose run --rm tools` (see docker-compose.yml).
FROM deps AS tools
COPY . .
CMD ["npx", "drizzle-kit", "migrate"]

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Pages are prerendered with their content, so the build reads the database and
# bakes the public URL (canonical, hreflang, sitemap) into the HTML.
ARG SITE_URL
ARG TURNSTILE_SITE_KEY
ARG DATABASE_URL
ENV SITE_URL=$SITE_URL DATABASE_URL=$DATABASE_URL TURNSTILE_SITE_KEY=$TURNSTILE_SITE_KEY NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
# ffmpeg: admin video uploads are re-encoded to light web MP4s (src/lib/media/ingest.ts).
RUN apk add --no-cache ffmpeg
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 UPLOAD_DIR=/app/uploads
RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001 -G nodejs \
  && mkdir -p /app/uploads /app/.next/cache && chown -R nextjs:nodejs /app/uploads /app/.next
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
