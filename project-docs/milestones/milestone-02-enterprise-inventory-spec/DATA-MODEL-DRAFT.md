# Data Model Draft

## DeviceInventorySnapshot

```ts
interface DeviceInventorySnapshot {
  id: string;
  deviceId: string;
  collectedAt: Date;
  routerOsVersion: string;
  sections: InventorySection[];
}
```

## InventorySection

```ts
interface InventorySection {
  name: string;
  path: string;
  items: InventoryItem[];
}
```

## InventoryItem

```ts
interface InventoryItem {
  id?: string;
  name?: string;
  disabled?: boolean;
  raw: Record<string, string>;
}
```

## BackupRecord

```ts
interface BackupRecord {
  id: string;
  deviceId: string;
  type: 'binary' | 'export';
  fileName: string;
  checksum: string;
  size: number;
  createdAt: Date;
}
```

## ConfigChange

```ts
interface ConfigChange {
  id: string;
  deviceId: string;
  userId: string;
  path: string;
  before: Record<string, string>;
  after: Record<string, string>;
  status: 'pending' | 'applied' | 'failed' | 'rolled_back';
  createdAt: Date;
}
```
