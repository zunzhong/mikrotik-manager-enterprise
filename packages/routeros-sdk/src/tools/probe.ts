import { probeRouterOs } from '../client/probe.js';

function arg(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function has(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const host = arg('host');
const username = arg('user', arg('username', 'admin'));
const password = arg('pass', arg('password', ''));
const portText = arg('port');
const timeoutText = arg('timeout', '10000');

if (!host) {
  console.error('Missing --host');
  process.exit(1);
}

const result = await probeRouterOs({
  host,
  port: portText ? Number(portText) : undefined,
  username: username ?? 'admin',
  password: password ?? '',
  timeoutMs: Number(timeoutText),
  tls: has('tls'),
  rejectUnauthorized: false,
});

console.log(JSON.stringify(result, null, 2));
