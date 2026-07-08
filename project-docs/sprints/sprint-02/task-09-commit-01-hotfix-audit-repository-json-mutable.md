# Hotfix — Audit Repository JSON Mutable

Fixes Prisma JSON typing error:

```txt
TS2542: Index signature in type 'InputJsonObject' only permits reading.
```

## File

```txt
apps/server/src/modules/audit/audit.repository.ts
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm build
```
