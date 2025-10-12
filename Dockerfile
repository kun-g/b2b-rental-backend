# Dockerfile for Payload CMS with Next.js
# Note: Payload CMS 3.x doesn't fully support Next.js standalone mode
# See: https://github.com/payloadcms/payload/issues/7176

FROM node:22.17.0-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable pnpm

# Install all dependencies (for build)
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/cms/package.json ./apps/cms/package.json
RUN pnpm install --frozen-lockfile

# Build the application
FROM base AS builder
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/cms/node_modules ./apps/cms/node_modules
COPY apps/cms ./apps/cms

ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_TYPE_CHECK=true

RUN pnpm --filter=cms run build

# Ensure public directory exists (it's optional in Next.js)
RUN mkdir -p /app/apps/cms/public

# Install ONLY production dependencies
FROM base AS prod-deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/cms/package.json ./apps/cms/package.json
RUN pnpm install --frozen-lockfile --prod

# Production image
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy workspace config
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/cms/package.json ./apps/cms/package.json

# Copy ONLY production dependencies (saves ~60-70% space)
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nextjs:nodejs /app/apps/cms/node_modules ./apps/cms/node_modules

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/.next ./apps/cms/.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/public ./apps/cms/public

# Copy necessary config files for Payload CMS runtime
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/next.config.mjs ./apps/cms/next.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/payload.config.ts ./apps/cms/payload.config.ts

USER nextjs
WORKDIR /app/apps/cms

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use next start (Payload CMS requires source files access)
CMD ["pnpm", "start"]
