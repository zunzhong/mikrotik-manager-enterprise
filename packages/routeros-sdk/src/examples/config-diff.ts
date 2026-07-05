import { RouterOsClient } from '../client/routeros-client.js';
import { diffConfigSnapshots } from '../utils/config-diff-engine.js';

const client = new RouterOsClient({
  host: process.env.ROUTEROS_HOST ?? '192.168.88.1',
  username: process.env.ROUTEROS_USER ?? 'admin',
  password: process.env.ROUTEROS_PASS ?? '',
});

await client.connect();

const snapshot = await client.configSync.snapshot({
  name: 'current-config',
  paths: ['/interface', '/ip/address', '/ip/route'],
});

const diff = diffConfigSnapshots(snapshot, snapshot);
console.log(JSON.stringify(diff, null, 2));

client.close();
