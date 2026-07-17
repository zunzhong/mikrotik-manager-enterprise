import { Writable } from 'node:stream';
import { Client as FtpClient } from 'basic-ftp';
import SftpClient from 'ssh2-sftp-client';

export type RouterFileTransferCandidate = {
  protocol: 'sftp' | 'ftp';
  port: number;
};

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
  const candidates: RouterFileTransferCandidate[] = [];
  const ssh = services.find((service) => service.name === 'ssh');
  const ftp = services.find((service) => service.name === 'ftp');
  if (ssh && ssh.disabled !== 'true' && ssh.disabled !== 'yes') {
    candidates.push({ protocol: 'sftp', port: Number(ssh.port) || 22 });
  }
  if (ftp && ftp.disabled !== 'true' && ftp.disabled !== 'yes') {
    candidates.push({ protocol: 'ftp', port: Number(ftp.port) || 21 });
  }
  return candidates;
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
        `Enable SSH/SFTP or FTP for the device account and allow it from the MME host.${detail}`,
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
