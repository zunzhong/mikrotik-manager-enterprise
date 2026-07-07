# Sprint 02 Task 07 Commit 06 — Webhook Notification Delivery

Adds actual webhook delivery support to Notification Delivery Worker.

## Supported webhook config

```json
{
  "url": "https://example.com/webhook",
  "method": "POST",
  "timeoutMs": 10000,
  "headers": {
    "x-source": "mikrotik-manager-enterprise"
  }
}
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm build
```
