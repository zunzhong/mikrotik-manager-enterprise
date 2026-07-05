import { RouterOsClient } from '../client/routeros-client.js';
import { BatchPlanBuilder } from '../utils/batch-plan-builder.js';

const client = new RouterOsClient({
  host: process.env.ROUTEROS_HOST ?? '192.168.88.1',
  username: process.env.ROUTEROS_USER ?? 'admin',
  password: process.env.ROUTEROS_PASS ?? '',
});

await client.connect();

const plan = new BatchPlanBuilder('demo-plan', 'Demo dry run')
  .command({
    path: '/system/identity/set',
    attributes: { name: 'demo-router' },
    description: 'Change router identity',
  })
  .build(true);

const result = await client.enterprise.dryRun(plan);
console.log(JSON.stringify(result, null, 2));

client.close();
