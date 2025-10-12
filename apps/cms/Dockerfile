# To use this Dockerfile, you have to set `output: 'standalone'` in your next.config.mjs file.
# Optimized for pnpm workspace monorepo

FROM node:22.17.0-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy workspace files for pnpm
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/cms/package.json ./apps/cms/package.json

# Install all workspace dependencies
RUN corepack enable pnpm && pnpm install --frozen-lockfile


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy installed dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/cms/node_modules ./apps/cms/node_modules

# Copy CMS source code
COPY apps/cms ./apps/cms

# Next.js collects completely anonymous telemetry data about general usage.
ENV NEXT_TELEMETRY_DISABLED=1

# Skip type checking during build (common in production builds)
ENV SKIP_TYPE_CHECK=true

# Build the CMS app from workspace root
RUN corepack enable pnpm && pnpm --filter=cms run build

# Ensure public directory exists for later COPY
RUN mkdir -p /app/apps/cms/public


# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/.next/standalone ./

# Copy static files to the correct location in monorepo structure
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/.next/static ./apps/cms/.next/static

# Copy public folder if exists
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/public ./apps/cms/public

USER nextjs

EXPOSE 3000

ENV PORT=3000

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
# In monorepo, server.js is located at apps/cms/server.js
CMD ["node", "apps/cms/server.js"]
