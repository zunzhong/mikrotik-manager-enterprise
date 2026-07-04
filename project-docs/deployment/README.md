# Deployment Guide

## Local Docker Compose

```powershell
copy .env.example .env
docker compose up -d --build
```

Services:

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

## First Boot

```powershell
docker compose exec server pnpm --filter @mme/server prisma:generate
docker compose exec server pnpm --filter @mme/server prisma:push
```

## Health Checks

```txt
http://localhost:3000/api/v1/system/live
http://localhost:3000/api/v1/system/ready
http://localhost:3000/api/v1/system/status
```
