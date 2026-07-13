# MikroTik Manager Enterprise

Enterprise controller and monitoring platform for MikroTik RouterOS 6 and 7.

## Included modules

- Multi-device management and RouterOS API/TLS connectivity
- Inventory snapshots, diffs, interface explorer and topology
- Realtime monitoring, alerts and notification delivery
- Backup/restore orchestration and compliance reporting
- Authentication, sessions, MFA, RBAC and audit logs
- React management console and Fastify/Prisma API
- PostgreSQL, Redis and Docker Compose deployment

## Requirements

- Node.js 22+
- pnpm 11.9+
- PostgreSQL 16 and Redis 7, or Docker Desktop / Docker Engine

## Docker installation

```bash
cp .env.example .env
# Change JWT_SECRET, ENCRYPTION_KEY and DEFAULT_ADMIN_PASSWORD in .env
docker compose up -d postgres redis
docker compose run --rm server pnpm setup:database
docker compose up -d --build
```

Open `http://localhost:5173`. The API is served on `http://localhost:3000`.

## Windows EXE and Linux DEB

The `Platform Installers` GitHub Actions workflow builds a Windows x64 setup executable and a
Linux amd64 Debian package. Windows is the primary supported desktop installation target. See
`project-docs/deployment/PLATFORM-INSTALLERS.md` for requirements and release instructions.
The Windows Desktop installer bundles its Node.js runtime and uses embedded SQLite, so it does
not require Docker, PostgreSQL, Redis, Node.js or pnpm on the target computer.

## Local development

Start PostgreSQL and Redis, then use a localhost database URL in `.env`:

```bash
pnpm install --frozen-lockfile
pnpm setup:database
pnpm --filter @mme/server dev
```

In a second terminal:

```bash
pnpm --filter @mme/web dev
```

The preflight endpoint checks database connectivity, schema, an active administrator, free
storage and production secrets:

```bash
curl http://localhost:3000/api/v1/setup/preflight
curl http://localhost:3000/ready
```

## Quality gates

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Deployment, backup and release checklists are in `project-docs/deployment`.

## License

MIT
