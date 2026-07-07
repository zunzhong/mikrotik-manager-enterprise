# Sprint 02 Task 03 — Realtime SSE Stream

Adds Server-Sent Events stream endpoint and connects `DeviceRealtimeMonitor` to it.

## Backend

```txt
GET /api/v1/realtime/devices/:id/stream
```

## Check

```powershell
pnpm --filter @mme/server typecheck
pnpm --filter @mme/web typecheck
pnpm build
```
