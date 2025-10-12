# Optimized for pnpm workspace monorepo with Payload CMS

FROM node:22.17.0-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable pnpm

# Install all dependencies for build
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

# Install production dependencies only
FROM base AS prod-deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/cms/package.json ./apps/cms/package.json
RUN pnpm install --frozen-lockfile --prod

# Production image - minimal size
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy workspace config
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./

# Copy ONLY production dependencies
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nextjs:nodejs /app/apps/cms/node_modules ./apps/cms/node_modules

# Copy built app and necessary files
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/.next ./apps/cms/.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/public ./apps/cms/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/package.json ./apps/cms/package.json

# Copy runtime source files (Payload CMS needs these)
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/src ./apps/cms/src
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/next.config.mjs ./apps/cms/next.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/payload.config.ts ./apps/cms/payload.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/tsconfig.json ./apps/cms/tsconfig.json

USER nextjs
WORKDIR /app/apps/cms

EXPOSE 3000
ENV PORT=3000

CMD ["pnpm", "start"]
