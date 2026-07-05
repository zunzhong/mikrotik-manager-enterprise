# SDK-14 — Discovery Engine

Usage:

```ts
const snapshot = await client.discovery.snapshot();
console.log(snapshot.devices);
```

Diff two snapshots:

```ts
const diff = diffDiscoverySnapshots(before, after);
```
