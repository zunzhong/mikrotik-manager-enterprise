/* global fetch */

import { error, log } from 'node:console';
import process from 'node:process';
import { FakeRouterOsServer } from '../packages/routeros-core/dist/testing/fake-routeros-server.js';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:3000').replace(/\/+$/, '');
const email = process.env.MME_SMOKE_EMAIL ?? 'admin@example.com';
const password = process.env.MME_SMOKE_PASSWORD;
const expectLinuxPing = process.env.MME_SMOKE_EXPECT_PING !== '0';

if (!password) {
  error('MME_SMOKE_PASSWORD is required.');
  process.exit(2);
}

const fake = new FakeRouterOsServer({
  username: 'mme-ci',
  password: 'mme-ci-router-password',
  resource: {
    version: '7.19.1',
    uptime: '2d3h4m',
    'cpu-load': '17',
    'free-memory': '805306368',
    'total-memory': '1073741824',
    'free-hdd-space': '1073741824',
    'total-hdd-space': '2147483648',
    'architecture-name': 'arm64',
    'board-name': 'RB5009UG+S+',
  },
  responses: {
    '/system/identity/print': [{ name: 'MME-LINUX-CI' }],
    '/system/routerboard/print': [
      {
        model: 'RB5009UG+S+',
        'serial-number': 'CI123456',
        'current-firmware': '7.19.1',
      },
    ],
    '/system/health/print': [{ name: 'temperature', value: '42' }],
    '/system/clock/print': [{ date: '2026-07-25', time: '12:00:00' }],
    '/interface/print': [
      {
        '.id': '*1',
        name: 'ether1',
        type: 'ether',
        running: 'true',
        'rx-byte': '123456',
        'tx-byte': '654321',
      },
    ],
    '/log/print': [
      {
        '.id': '*1',
        time: '12:00:00',
        topics: 'system,error',
        message: 'MME Linux feature smoke error',
      },
    ],
    '/ping': [{ host: '8.8.8.8', status: 'echo reply', time: '12ms' }],
    '/system/backup/save': [],
    '/system/sup-output': [],
  },
  unknownCommand: 'empty',
});

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false) {
    throw new Error(
      `${options.method ?? 'GET'} ${path} failed: HTTP ${response.status} ${JSON.stringify(body)}`,
    );
  }
  return body?.data;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await fake.start();
let token;
let deviceId;

try {
  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  token = login?.accessToken ?? login?.token;
  assert(token, 'Login did not return an access token.');

  const device = await request('/api/v1/devices', {
    method: 'POST',
    token,
    body: {
      name: 'MME Linux CI Router',
      host: '127.0.0.1',
      port: fake.port,
      username: 'mme-ci',
      password: 'mme-ci-router-password',
      useTls: false,
      loginMode: 'auto',
      tags: ['linux-smoke'],
    },
  });
  deviceId = device?.id;
  assert(deviceId, 'Device creation did not return an id.');

  const connection = await request(`/api/v1/devices/${deviceId}/test`, {
    method: 'POST',
    token,
    body: { timeoutMs: 10000 },
  });
  assert(connection?.online === true, `RouterOS connection test failed: ${connection?.reason}`);
  assert(connection?.identity === 'MME-LINUX-CI', 'Connection test returned the wrong identity.');
  assert(connection?.version === '7.19.1', 'Connection test returned the wrong RouterOS version.');

  const realtime = await request(`/api/v1/realtime/devices/${deviceId}/refresh`, {
    method: 'POST',
    token,
    body: {},
  });
  assert(realtime?.online === true, `Realtime refresh failed: ${realtime?.error}`);
  assert(realtime?.identity?.name === 'MME-LINUX-CI', 'Realtime identity is missing.');
  assert(realtime?.resource?.version === '7.19.1', 'Realtime resource data is missing.');
  assert(realtime?.interfaces?.[0]?.name === 'ether1', 'Realtime interface data is missing.');

  const terminal = await request(`/api/v1/devices/${deviceId}/actions/terminal`, {
    method: 'POST',
    token,
    body: {
      command: '/log print where message~"error"',
      transport: 'api',
    },
  });
  assert(terminal?.success === true, `Terminal failed: ${terminal?.message}`);
  assert(
    terminal?.data?.rows?.[0]?.message === 'MME Linux feature smoke error',
    'Terminal did not return RouterOS rows.',
  );
  assert(
    fake.receivedSentences.some(
      (sentence) => sentence[0] === '/log/print' && sentence.includes('?message~error'),
    ),
    'Terminal did not encode the RouterOS where filter as an API query word.',
  );

  const pingFromRouter = await request(`/api/v1/devices/${deviceId}/actions/ping-from-device`, {
    method: 'POST',
    token,
    body: { address: '8.8.8.8', count: 1 },
  });
  assert(pingFromRouter?.success === true, `Router ping action failed: ${pingFromRouter?.message}`);

  const backup = await request(`/api/v1/devices/${deviceId}/actions/backup`, {
    method: 'POST',
    token,
    body: { name: 'mme-linux-ci', confirm: true },
  });
  assert(backup?.success === true, `Router backup action failed: ${backup?.message}`);

  const supout = await request(`/api/v1/devices/${deviceId}/actions/supout`, {
    method: 'POST',
    token,
    body: { name: 'mme-linux-ci', confirm: true },
  });
  assert(supout?.success === true, `Router supout action failed: ${supout?.message}`);

  if (expectLinuxPing) {
    const hostPing = await request(`/api/v1/devices/${deviceId}/actions/ping-to-device`, {
      method: 'POST',
      token,
      body: { count: 1 },
    });
    assert(hostPing?.success === true, `Linux host ping action failed: ${hostPing?.message}`);
  }

  const inventory = await request(`/api/v1/devices/${deviceId}/inventory/collect`, {
    method: 'POST',
    token,
    body: {},
  });
  assert(!inventory?.error, `Inventory collection failed: ${inventory?.error}`);
  const latest = await request(`/api/v1/devices/${deviceId}/inventory/snapshots/latest`, {
    token,
  });
  assert(latest?.summary?.identity?.name === 'MME-LINUX-CI', 'Inventory identity is missing.');
  assert(latest?.summary?.resource?.version === '7.19.1', 'Inventory resource data is missing.');

  log(
    JSON.stringify({
      status: 'ready',
      checks: {
        authentication: true,
        deviceConnection: true,
        realtimeOverview: true,
        terminalApi: true,
        terminalQuery: true,
        pingFromRouter: true,
        pingFromLinux: expectLinuxPing,
        routerBackup: true,
        routerSupout: true,
        inventory: true,
      },
      routerOs: {
        identity: connection.identity,
        version: connection.version,
      },
    }),
  );
} finally {
  if (deviceId && token) {
    await request(`/api/v1/devices/${deviceId}`, {
      method: 'DELETE',
      token,
    }).catch(() => undefined);
  }
  await fake.stop();
}
