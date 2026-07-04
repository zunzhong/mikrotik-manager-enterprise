FROM node:22-alpine AS base
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json

RUN pnpm install --frozen-lockfile=false

COPY . .

RUN pnpm --filter @mme/web build

EXPOSE 5173

CMD ["pnpm", "--filter", "@mme/web", "preview", "--host", "0.0.0.0"]
