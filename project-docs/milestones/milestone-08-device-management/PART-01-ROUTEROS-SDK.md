# Part 01 — RouterOS SDK Adapter Foundation

## What changed

This part safely adds RouterOS SDK integration without modifying existing Device CRUD behavior.

## New backend files

```txt
apps/server/src/modules/device/domain/routeros-connection.types.ts
apps/server/src/modules/device/infrastructure/routeros-sdk.adapter.ts
apps/server/src/modules/device/application/routeros-device-probe.service.ts
```

## Why this is safe

It does not replace:

```txt
device.service.ts
device.routes.ts
index.ts
```

So existing routes and services remain intact.

## Next

Part 02 will add API routes that call:

```ts
routerOsDeviceProbeService.probe(...)
```

and will return live RouterOS identity/resource/routerboard info.
