import { describe, expect, it } from 'vitest';
import { createDeviceSchema, testDeviceConnectionSchema } from './device.schemas.js';

describe('device API/API-SSL schemas', () => {
  const base = {
    name: 'Router branch',
    host: '10.0.0.2',
    username: 'operator',
    password: 'secret',
  };

  it('uses RouterOS API port 8728 by default', () => {
    const input = createDeviceSchema.parse({ ...base, useTls: false });

    expect(input.port).toBe(8728);
    expect(input.useTls).toBe(false);
  });

  it('uses RouterOS API-SSL port 8729 by default', () => {
    const input = createDeviceSchema.parse({ ...base, useTls: true });

    expect(input.port).toBe(8729);
    expect(input.useTls).toBe(true);
  });

  it('preserves a custom API-SSL port for connection tests', () => {
    const input = testDeviceConnectionSchema.parse({
      ...base,
      useTls: true,
      port: 1890,
    });

    expect(input.port).toBe(1890);
    expect(input.timeoutMs).toBe(15000);
  });
});
