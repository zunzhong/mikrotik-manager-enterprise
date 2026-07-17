import { Writable } from 'node:stream';
import { Client as FtpClient } from 'basic-ftp';
import SftpClient from 'ssh2-sftp-client';

export type RouterFileTransferCandidate = {
  protocol: 'sftp' | 'ftp';
  port: number;
  serviceId: string;
  serviceName: 'ssh' | 'ftp';
  initiallyDisabled: boolean;
};

export class RouterServiceRestoreError extends Error {
  public constructor(serviceName: string, cause: unknown) {
    super(
      `MME could not restore RouterOS ${serviceName} to its original disabled state: ${
        cause instanceof Error ? cause.message : 'unknown RouterOS error'
      }`,
    );
    this.name = 'RouterServiceRestoreError';
  }
}

type RouterServiceRow = Record<string, string>;

type DownloadInput = {
  host: string;
  username: string;
  password: string;
  fileName: string;
  candidates: RouterFileTransferCandidate[];
};

export function buildRouterFileTransferCandidates(
  services: RouterServiceRow[],
): RouterFileTransferCandidate[] {
  const candidates = services.flatMap((service): RouterFileTransferCandidate[] => {
    if ((service.name !== 'ssh' && service.name !== 'ftp') || !service['.id']) return [];
    const initiallyDisabled = service.disabled === 'true' || service.disabled === 'yes';
    return [
      {
        protocol: service.name === 'ssh' ? 'sftp' : 'ftp',
        port: Number(service.port) || (service.name === 'ssh' ? 22 : 21),
        serviceId: service['.id'],
        serviceName: service.name,
        initiallyDisabled,
      },
    ];
  });
  return candidates.sort((left, right) => {
    if (left.initiallyDisabled !== right.initiallyDisabled) {
      return Number(left.initiallyDisabled) - Number(right.initiallyDisabled);
    }
    return left.protocol === 'sftp' ? -1 : right.protocol === 'sftp' ? 1 : 0;
  });
}

export async function withTemporaryRouterService<T>(
  candidate: RouterFileTransferCandidate,
  setDisabled: (disabled: boolean) => Promise<void>,
  operation: () => Promise<T>,
): Promise<T> {
  let restoreRequired = false;
  let operationFailed = false;
  let operationError: unknown;
  let result: T | undefined;
  try {
    if (candidate.initiallyDisabled) {
      restoreRequired = true;
      await setDisabled(false);
    }
    result = await operation();
  } catch (error) {
    operationFailed = true;
    operationError = error;
  }

  if (restoreRequired) {
    try {
      await setDisabled(true);
    } catch (error) {
      throw new RouterServiceRestoreError(candidate.serviceName, error);
    }
  }

  if (operationFailed) throw operationError;
  return result as T;
}

export class RouterFileTransferService {
  public async download(input: DownloadInput): Promise<{ content: Buffer; protocol: string }> {
    const failures: string[] = [];
    for (const candidate of input.candidates) {
      try {
        const content =
          candidate.protocol === 'sftp'
            ? await this.downloadSftp(input, candidate.port)
            : await this.downloadFtp(input, candidate.port);
        if (!content.length) throw new Error('received an empty file');
        return { content, protocol: candidate.protocol };
      } catch (error) {
        failures.push(
          `${candidate.protocol.toUpperCase()}:${candidate.port} - ${
            error instanceof Error ? error.message : 'transfer failed'
          }`,
        );
      }
    }

    const detail = failures.length ? ` Attempts: ${failures.join('; ')}` : '';
    throw new Error(
      `RouterOS binary backup was created, but MME could not download it. ` +
        `Check the device account file-transfer permissions and firewall access from the MME host.${detail}`,
    );
  }

  private async downloadSftp(input: DownloadInput, port: number): Promise<Buffer> {
    const client = new SftpClient('mme-backup');
    try {
      await client.connect({
        host: input.host,
        port,
        username: input.username,
        password: input.password,
        readyTimeout: 15_000,
      });
      const result = await client.get(input.fileName);
      if (!Buffer.isBuffer(result)) throw new Error('SFTP did not return a memory buffer');
      return result;
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  private async downloadFtp(input: DownloadInput, port: number): Promise<Buffer> {
    const client = new FtpClient(15_000);
    const chunks: Buffer[] = [];
    const destination = new Writable({
      write(chunk: Buffer | string, _encoding, callback) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        callback();
      },
    });
    try {
      await client.access({
        host: input.host,
        port,
        user: input.username,
        password: input.password,
        secure: false,
      });
      await client.downloadTo(destination, input.fileName);
      return Buffer.concat(chunks);
    } finally {
      client.close();
    }
  }
}

export const routerFileTransferService = new RouterFileTransferService();
