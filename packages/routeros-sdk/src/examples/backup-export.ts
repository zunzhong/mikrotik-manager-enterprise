import { RouterOsClient } from '../client/routeros-client.js';
import { createExportJob } from '../utils/backup-job-builder.js';

const client = new RouterOsClient({
  host: process.env.ROUTEROS_HOST ?? '192.168.88.1',
  username: process.env.ROUTEROS_USER ?? 'admin',
  password: process.env.ROUTEROS_PASS ?? '',
});

await client.connect();

const result = await client.backup.run(createExportJob('manual-export', undefined, false));

console.log(JSON.stringify(result, null, 2));

client.close();
