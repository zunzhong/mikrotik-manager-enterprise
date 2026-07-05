import { RouterOsClient } from '../client/routeros-client.js';

const client = new RouterOsClient({
  host: process.env.ROUTEROS_HOST ?? '192.168.88.1',
  username: process.env.ROUTEROS_USER ?? 'admin',
  password: process.env.ROUTEROS_PASS ?? '',
});

await client.connect();

const subscription = await client.events.listenInterfaces((event) => {
  console.log(JSON.stringify(event, null, 2));
});

process.on('SIGINT', async () => {
  await subscription.close();
  client.close();
  process.exit(0);
});
