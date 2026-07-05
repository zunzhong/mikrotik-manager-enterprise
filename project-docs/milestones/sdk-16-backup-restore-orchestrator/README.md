# SDK-16 — Backup & Restore Orchestrator

Usage:

```ts
const job = createBinaryBackupJob('daily-backup');
const result = await client.backup.run(job);

const exportJob = createExportJob('config-export');
const exportResult = await client.backup.run(exportJob);
```

Restore:

```ts
const plan = createRestorePlan({
  name: 'restore-config',
  fileName: 'config.rsc',
  kind: 'export-rsc',
  dryRun: false
});

await client.backup.restore(plan);
```
