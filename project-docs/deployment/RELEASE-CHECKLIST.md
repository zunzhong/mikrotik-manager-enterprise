# Release Checklist

## Before Tagging

```powershell
pnpm install
pnpm format:check
pnpm lint
pnpm --filter @mme/server typecheck
pnpm --filter @mme/web typecheck
docker build -f docker/server.Dockerfile -t mme-server:release .
docker build -f docker/web.Dockerfile -t mme-web:release .
```

## Create Tag

```powershell
git tag v0.1.0
git push origin v0.1.0
```

## Verify

- GitHub Release created
- Docker Publish workflow completed
- GHCR images available
- Release notes generated
