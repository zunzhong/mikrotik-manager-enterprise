# Hotfix — Alert Lifecycle EventLike Type

Fixes `AlertEventLike` requiring `updatedAt` while the current Prisma `Alert` model does not expose that field.

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm --filter @mme/web typecheck
pnpm build
```
