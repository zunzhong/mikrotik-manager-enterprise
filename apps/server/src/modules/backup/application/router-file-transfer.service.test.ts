import { describe, expect, it } from 'vitest';
import { buildRouterFileTransferCandidates } from './router-file-transfer.service.js';

describe('RouterOS backup transfer candidates', () => {
  it('prefers encrypted SFTP and honors custom RouterOS service ports', () => {
    expect(
      buildRouterFileTransferCandidates([
        { name: 'ftp', port: '2121', disabled: 'false' },
        { name: 'ssh', port: '2222', disabled: 'false' },
      ]),
    ).toEqual([
      { protocol: 'sftp', port: 2222 },
      { protocol: 'ftp', port: 2121 },
    ]);
  });

  it('does not attempt disabled RouterOS services', () => {
    expect(
      buildRouterFileTransferCandidates([
        { name: 'ssh', port: '22', disabled: 'true' },
        { name: 'ftp', port: '21', disabled: 'yes' },
      ]),
    ).toEqual([]);
  });
});
