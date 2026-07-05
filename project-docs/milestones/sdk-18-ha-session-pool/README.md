# SDK-18 — HA Session Pool

Usage:

```ts
const pool = new PoolApi([
  {
    id: 'r1',
    name: 'Router 1',
    options: { host: '10.0.0.1', username: 'admin', password: 'pass' },
    priority: 1
  }
]);

const health = await pool.health();

const results = await pool.executeOnAll(async (client) => {
  return client.system.identity();
});
```
