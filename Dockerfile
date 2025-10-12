# Dockerfile for Payload CMS with Next.js Standalone
# Using Next.js standalone mode for minimal production image (~500MB vs 30GB)

FROM node:22.17.0-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable pnpm

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_TYPE_CHECK=true

RUN pnpm run build

# Create public directory if it doesn't exist (Next.js optional)
RUN mkdir -p /app/public

# Production image - use standalone output
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output (includes minimal dependencies)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static assets (if they exist)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Standalone server.js is at the root of standalone output
CMD ["node", "server.js"]
