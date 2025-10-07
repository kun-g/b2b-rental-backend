FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json .eslintrc.cjs prettier.config.cjs ./
COPY packages ./packages
COPY apps/cms ./apps/cms

RUN pnpm install --filter @b2b-rental/cms... --prod=false
RUN pnpm --filter @b2b-rental/cms build

FROM node:20-alpine AS runner
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps ./apps

WORKDIR /app/apps/cms
EXPOSE 4002
CMD ["pnpm", "start"]
