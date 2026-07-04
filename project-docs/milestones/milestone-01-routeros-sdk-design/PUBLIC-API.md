# Public SDK API

## Basic Usage

```ts
import { RouterClient } from '@mme/routeros-core';

const client = new RouterClient({
  host: '192.168.88.1',
  username: 'admin',
  password: '',
  port: 8728,
  tls: false,
  timeoutMs: 10000,
});

await client.connect();

const resource = await client.command('/system/resource/print');

await client.close();
```

## Public Types

```ts
export interface RouterClientOptions {
  host: string;
  port?: number;
  username: string;
  password: string;
  tls?: boolean;
  timeoutMs?: number;
  keepAlive?: boolean;
  rejectUnauthorized?: boolean;
}
```
