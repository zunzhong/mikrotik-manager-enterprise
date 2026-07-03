# Database Draft

## devices

```prisma
model Device {
  id                String   @id @default(cuid())
  name              String
  host              String
  port              Int      @default(8728)
  username          String
  passwordEncrypted String
  useTls            Boolean  @default(false)
  loginMode         String   @default("auto")
  status            String   @default("unknown")
  lastSeenAt        DateTime?
  lastError         String?
  tags              String[] @default([])
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

## device_groups

```prisma
model DeviceGroup {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Note: exact Prisma implementation will be added in the next part.
