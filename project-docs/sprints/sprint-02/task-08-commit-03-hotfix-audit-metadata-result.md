# Hotfix — Audit Metadata Result Type

Fixes TypeScript errors where `NotificationDeliveryWorkerResult` and `NotificationRetryResult`
were passed directly as `metadata`.

## Fixed pattern

```ts
metadata: {
  result,
}
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm build
```
