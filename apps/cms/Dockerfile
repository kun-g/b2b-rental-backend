# Based on official Payload CMS Docker deployment guide
# Adapted for pnpm workspace monorepo
# https://payloadcms.com/docs/production/deployment

FROM node:22.17.0-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies only when needed
FROM base AS deps
RUN corepack enable pnpm

# Copy workspace files for pnpm monorepo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/cms/package.json ./apps/cms/package.json

# Install dependencies
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
RUN corepack enable pnpm
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/cms/node_modules ./apps/cms/node_modules
COPY apps/cms ./apps/cms

# Environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_TYPE_CHECK=true

# Build the app
RUN pnpm --filter=cms run build

# Ensure public directory exists (Next.js public folder is optional)
RUN mkdir -p /app/apps/cms/public

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public folder
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/public ./apps/cms/public

# Set the correct permission for prerender cache
RUN mkdir -p apps/cms/.next && \
    chown nextjs:nodejs apps/cms/.next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/.next/static ./apps/cms/.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
# In monorepo, it's located at apps/cms/server.js
CMD ["node", "apps/cms/server.js"]
