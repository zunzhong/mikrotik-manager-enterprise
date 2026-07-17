import { describe, expect, it } from 'vitest';
import {
  buildRouterFileTransferCandidates,
  RouterServiceRestoreError,
  withTemporaryRouterService,
} from './router-file-transfer.service.js';

describe('RouterOS backup transfer candidates', () => {
  it('prefers encrypted SFTP and honors custom RouterOS service ports', () => {
    expect(
      buildRouterFileTransferCandidates([
        { '.id': '*2', name: 'ftp', port: '2121', disabled: 'false' },
        { '.id': '*1', name: 'ssh', port: '2222', disabled: 'false' },
      ]),
    ).toEqual([
      {
        protocol: 'sftp',
        port: 2222,
        serviceId: '*1',
        serviceName: 'ssh',
        initiallyDisabled: false,
      },
      {
        protocol: 'ftp',
        port: 2121,
        serviceId: '*2',
        serviceName: 'ftp',
        initiallyDisabled: false,
      },
    ]);
  });

  it('keeps disabled services as temporary fallback candidates', () => {
    const result = buildRouterFileTransferCandidates([
      { '.id': '*1', name: 'ssh', port: '22', disabled: 'true' },
      { '.id': '*2', name: 'ftp', port: '21', disabled: 'yes' },
    ]);
    expect(
      result.map(({ protocol, initiallyDisabled }) => ({ protocol, initiallyDisabled })),
    ).toEqual([
      { protocol: 'sftp', initiallyDisabled: true },
      { protocol: 'ftp', initiallyDisabled: true },
    ]);
  });

  it('uses an already-enabled FTP service before changing a disabled SSH service', () => {
    const result = buildRouterFileTransferCandidates([
      { '.id': '*1', name: 'ssh', port: '22', disabled: 'true' },
      { '.id': '*2', name: 'ftp', port: '21', disabled: 'false' },
    ]);
    expect(
      result.map(({ protocol, initiallyDisabled }) => ({ protocol, initiallyDisabled })),
    ).toEqual([
      { protocol: 'ftp', initiallyDisabled: false },
      { protocol: 'sftp', initiallyDisabled: true },
    ]);
  });

  it('restores a temporarily enabled service after success', async () => {
    const states: boolean[] = [];
    const result = await withTemporaryRouterService(
      {
        protocol: 'sftp',
        port: 22,
        serviceId: '*1',
        serviceName: 'ssh',
        initiallyDisabled: true,
      },
      async (disabled) => {
        states.push(disabled);
      },
      async () => 'downloaded',
    );
    expect(result).toBe('downloaded');
    expect(states).toEqual([false, true]);
  });

  it('restores a temporarily enabled service after transfer failure', async () => {
    const states: boolean[] = [];
    await expect(
      withTemporaryRouterService(
        {
          protocol: 'ftp',
          port: 21,
          serviceId: '*2',
          serviceName: 'ftp',
          initiallyDisabled: true,
        },
        async (disabled) => {
          states.push(disabled);
        },
        async () => {
          throw new Error('network failure');
        },
      ),
    ).rejects.toThrow('network failure');
    expect(states).toEqual([false, true]);
  });

  it('surfaces a restoration failure instead of hiding a service left enabled', async () => {
    await expect(
      withTemporaryRouterService(
        {
          protocol: 'sftp',
          port: 22,
          serviceId: '*1',
          serviceName: 'ssh',
          initiallyDisabled: true,
        },
        async (disabled) => {
          if (disabled) throw new Error('API connection lost');
        },
        async () => 'downloaded',
      ),
    ).rejects.toBeInstanceOf(RouterServiceRestoreError);
  });

  it('does not change a service that was already enabled', async () => {
    const states: boolean[] = [];
    await withTemporaryRouterService(
      {
        protocol: 'sftp',
        port: 22,
        serviceId: '*1',
        serviceName: 'ssh',
        initiallyDisabled: false,
      },
      async (disabled) => {
        states.push(disabled);
      },
      async () => undefined,
    );
    expect(states).toEqual([]);
  });
});
