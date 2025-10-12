# Optimized for pnpm workspace monorepo with Payload CMS
# Note: Payload CMS doesn't fully support Next.js standalone mode yet

FROM node:22.17.0-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
FROM base AS deps
# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/cms/package.json ./apps/cms/package.json

# Install dependencies with production flag
RUN corepack enable pnpm && \
    pnpm install --frozen-lockfile --prod=false

# Build the application
FROM base AS builder
# Copy workspace configuration
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/cms/node_modules ./apps/cms/node_modules

# Copy source code
COPY apps/cms ./apps/cms

# Set build environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_TYPE_CHECK=true

# Build
RUN corepack enable pnpm && pnpm --filter=cms run build

# Production image
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Enable pnpm
RUN corepack enable pnpm

# Create user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy workspace files
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./

# Copy node_modules (needed for Payload CMS)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/node_modules ./apps/cms/node_modules

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/.next ./apps/cms/.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/public ./apps/cms/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/package.json ./apps/cms/package.json

# Copy necessary source files for Payload CMS runtime
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/src ./apps/cms/src
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/next.config.mjs ./apps/cms/next.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/payload.config.ts ./apps/cms/payload.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/tsconfig.json ./apps/cms/tsconfig.json

USER nextjs

EXPOSE 3000
ENV PORT=3000

WORKDIR /app/apps/cms

# Start Next.js in production mode
CMD ["pnpm", "start"]
