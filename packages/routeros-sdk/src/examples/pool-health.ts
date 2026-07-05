import { PoolApi } from '../api/pool-api.js';

const pool = new PoolApi([
  {
    id: 'router-1',
    name: 'Router 1',
    options: {
      host: process.env.ROUTEROS_HOST ?? '192.168.88.1',
      username: process.env.ROUTEROS_USER ?? 'admin',
      password: process.env.ROUTEROS_PASS ?? '',
    },
    priority: 1,
  },
]);

const health = await pool.health();
console.log(JSON.stringify(health, null, 2));

await pool.close();
