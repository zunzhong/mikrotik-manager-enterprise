/* global fetch */

import dgram from 'node:dgram';
import net from 'node:net';
import { Buffer } from 'node:buffer';
import { error, log } from 'node:console';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

const baseUrl = (process.argv[2] ?? 'http://127.0.0.1:3000').replace(/\/+$/, '');
const host = process.env.MME_SMOKE_SYSLOG_HOST ?? '127.0.0.1';
const port = Number(process.env.MME_SMOKE_SYSLOG_PORT ?? '514');
const email = process.env.MME_SMOKE_EMAIL ?? 'admin@example.com';
const password = process.env.MME_SMOKE_PASSWORD;

if (!password || !Number.isInteger(port) || port < 1 || port > 65535) {
  error('MME_SMOKE_PASSWORD and a valid MME_SMOKE_SYSLOG_PORT are required.');
  process.exit(2);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success === false) {
    throw new Error(
      `${options.method ?? 'GET'} ${path}: HTTP ${response.status} ${JSON.stringify(body)}`,
    );
  }
  return body?.data;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function sendUdp(payload) {
  await new Promise((resolve, reject) => {
    const socket = dgram.createSocket(host.includes(':') ? 'udp6' : 'udp4');
    socket.send(payload, port, host, (error) => {
      socket.close();
      if (error) reject(error);
      else resolve();
    });
  });
}

async function sendTcp(payload) {
  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.end(`${Buffer.byteLength(payload)} ${payload}`);
    });
    socket.once('error', reject);
    socket.once('close', resolve);
  });
}

const login = await request('/api/v1/auth/login', {
  method: 'POST',
  body: { email, password },
});
const token = login?.accessToken ?? login?.token;
assert(token, 'Login did not return an access token.');

const marker = `mme-syslog-smoke-${Date.now()}`;
await sendUdp(`<134>1 ${new Date().toISOString()} router-udp MME 100 UDP_TEST - ${marker}-udp`);
await sendTcp(`<132>1 ${new Date().toISOString()} router-tcp MME 101 TCP_TEST - ${marker}-tcp`);

let messages;
for (let attempt = 0; attempt < 40; attempt += 1) {
  messages = await request(
    `/api/v1/syslog/messages?search=${encodeURIComponent(marker)}&page=1&pageSize=50`,
    { token },
  );
  if (messages?.items?.length >= 2) break;
  await delay(250);
}

assert(
  messages?.items?.some((item) => item.protocol === 'udp'),
  'UDP Syslog was not stored.',
);
assert(
  messages?.items?.some((item) => item.protocol === 'tcp'),
  'TCP Syslog was not stored.',
);
assert(
  messages.items.every((item) => item.facility === 16),
  'Syslog facility was parsed incorrectly.',
);

const selfTest = await request('/api/v1/syslog/test', {
  method: 'POST',
  token,
  body: {},
});
assert(selfTest?.success === true, `Receiver self-test failed: ${selfTest?.message}`);

const overview = await request('/api/v1/syslog/overview', { token });
assert(overview?.receiver?.running === true, 'Syslog receiver is not running.');
assert(overview?.receiver?.udpListening === true, 'UDP listener is not active.');
assert(overview?.receiver?.tcpListening === true, 'TCP listener is not active.');

log(
  JSON.stringify({
    status: 'ready',
    checks: {
      authentication: true,
      udpReceiver: true,
      tcpReceiver: true,
      rfc5424Parser: true,
      databaseStorage: true,
      receiverSelfTest: true,
    },
    listener: { host, port },
    storedMessages: messages.items.length,
  }),
);
