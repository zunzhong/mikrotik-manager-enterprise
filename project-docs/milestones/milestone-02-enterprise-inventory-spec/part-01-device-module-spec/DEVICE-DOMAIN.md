# Device Domain

## Device

```ts
interface Device {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  passwordEncrypted: string;
  useTls: boolean;
  loginMode: 'auto' | 'modern' | 'legacy';
  groupId?: string;
  tags: string[];
  status: DeviceStatus;
  lastSeenAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## DeviceStatus

```ts
type DeviceStatus =
  | 'unknown'
  | 'online'
  | 'offline'
  | 'auth_failed'
  | 'timeout'
  | 'api_disabled'
  | 'tls_error'
  | 'error';
```

## DeviceGroup

```ts
interface DeviceGroup {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Security Rules

- Password must never be returned by API.
- Password must be encrypted at rest.
- Test connection can accept a plain password but must not log it.
- Audit log must record device changes, not secrets.
