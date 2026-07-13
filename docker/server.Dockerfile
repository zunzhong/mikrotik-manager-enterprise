FROM node:22-alpine AS base
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY packages/routeros-core/package.json packages/routeros-core/package.json
COPY packages/routeros-sdk/package.json packages/routeros-sdk/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @mme/server prisma:generate
RUN pnpm --filter @mme/routeros-core build
RUN pnpm --filter @mme/routeros-sdk build
RUN pnpm --filter @mme/server build

EXPOSE 3000

CMD ["pnpm", "--filter", "@mme/server", "start"]
