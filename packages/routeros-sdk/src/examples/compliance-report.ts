import { RouterOsClient } from '../client/routeros-client.js';

const client = new RouterOsClient({
  host: process.env.ROUTEROS_HOST ?? '192.168.88.1',
  username: process.env.ROUTEROS_USER ?? 'admin',
  password: process.env.ROUTEROS_PASS ?? '',
});

await client.connect();

const report = await client.compliance.run();
console.log(JSON.stringify(report, null, 2));

client.close();
