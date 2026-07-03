# Device Module Backend Architecture

Folder:

```txt
apps/server/src/modules/device
├── application
│   ├── device.service.ts
│   └── device-test.service.ts
├── domain
│   ├── device.entity.ts
│   ├── device-status.ts
│   └── device.types.ts
├── infrastructure
│   ├── device.repository.ts
│   └── prisma-device.repository.ts
├── presentation
│   ├── device.routes.ts
│   └── device.schemas.ts
└── index.ts
```

## Flow

```txt
Fastify route
  ↓
Zod validation
  ↓
DeviceService
  ↓
DeviceRepository
  ↓
Prisma
```

## Test Connection Flow

```txt
POST /api/v1/devices/test
  ↓
DeviceTestService
  ↓
RouterClient
  ↓
/system/identity/print
/system/resource/print
  ↓
normalize result
```
