# SDK-17 — Configuration Diff & Sync

Usage:

```ts
const before = await client.configSync.snapshot({
  name: 'before',
  paths: ['/interface', '/ip/address']
});

const after = await client.configSync.snapshot({
  name: 'after',
  paths: ['/interface', '/ip/address']
});

const diff = diffConfigSnapshots(before, after);

const plan = client.configSync.createPlan({
  name: 'apply-diff',
  changes: diff.changes,
  dryRun: true
});

const result = await client.configSync.apply(plan);
```
