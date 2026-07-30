import dgram from 'node:dgram';
import net from 'node:net';
import { parseSyslogMessage } from './syslog.parser.js';
import type {
  ReceivedSyslogMessage,
  SyslogProtocol,
  SyslogReceiverSettings,
  SyslogReceiverStatus,
} from './syslog.types.js';

const MAX_MESSAGE_BYTES = 65_535;
const MAX_QUEUE_SIZE = 10_000;
const MAX_TCP_CLIENTS = 500;
const BATCH_SIZE = 250;
const FLUSH_INTERVAL_MS = 250;

export type SyslogBatchWriter = (messages: ReceivedSyslogMessage[]) => Promise<number>;

function normalizeRemoteAddress(address: string | undefined): string {
  const value = address ?? 'unknown';
  return value.startsWith('::ffff:') ? value.slice(7) : value.split('%')[0];
}

function extractTcpFrames(buffer: Buffer, final = false): { frames: Buffer[]; remainder: Buffer } {
  const frames: Buffer[] = [];
  let remainder = buffer;
  while (remainder.length > 0) {
    const header = /^(\d{1,8}) /.exec(
      remainder.toString('ascii', 0, Math.min(10, remainder.length)),
    );
    if (header) {
      const headerBytes = Buffer.byteLength(header[0]);
      const length = Number(header[1]);
      if (length > MAX_MESSAGE_BYTES) {
        const newline = remainder.indexOf(10);
        if (newline < 0) return { frames, remainder: Buffer.alloc(0) };
        remainder = remainder.subarray(newline + 1);
        continue;
      }
      if (remainder.length < headerBytes + length) break;
      frames.push(remainder.subarray(headerBytes, headerBytes + length));
      remainder = remainder.subarray(headerBytes + length);
      continue;
    }

    const newline = remainder.indexOf(10);
    if (newline >= 0) {
      const frame = remainder.subarray(0, newline);
      if (frame.length > 0) frames.push(frame);
      remainder = remainder.subarray(newline + 1);
      continue;
    }
    if (final && remainder.length > 0) {
      frames.push(remainder);
      remainder = Buffer.alloc(0);
    }
    break;
  }
  return { frames, remainder };
}

export class SyslogReceiver {
  private udpSocket: dgram.Socket | null = null;
  private tcpServer: net.Server | null = null;
  private readonly tcpClients = new Set<net.Socket>();
  private queue: ReceivedSyslogMessage[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private flushing = false;
  private settings: SyslogReceiverSettings = {
    enabled: false,
    udpEnabled: false,
    tcpEnabled: false,
    bindAddress: '0.0.0.0',
    port: 514,
    retentionDays: 30,
    maxRecords: 500000,
    acceptUnmatched: true,
  };
  private counters = { received: 0, stored: 0, dropped: 0, parseErrors: 0 };
  private startedAt: string | null = null;
  private lastMessageAt: string | null = null;
  private lastError: string | null = null;

  public constructor(private readonly writeBatch: SyslogBatchWriter) {}

  public status(): SyslogReceiverStatus {
    return {
      enabled: this.settings.enabled,
      running: Boolean(this.udpSocket || this.tcpServer),
      udpListening: Boolean(this.udpSocket),
      tcpListening: Boolean(this.tcpServer),
      bindAddress: this.settings.bindAddress,
      port: this.settings.port,
      ...this.counters,
      queueDepth: this.queue.length,
      activeTcpClients: this.tcpClients.size,
      startedAt: this.startedAt,
      lastMessageAt: this.lastMessageAt,
      lastError: this.lastError,
    };
  }

  public async start(settings: SyslogReceiverSettings): Promise<SyslogReceiverStatus> {
    await this.stop();
    this.settings = settings;
    this.lastError = null;
    if (!settings.enabled) return this.status();
    if (!settings.udpEnabled && !settings.tcpEnabled) {
      this.lastError = 'Syslog is enabled but both UDP and TCP listeners are disabled.';
      return this.status();
    }

    const errors: string[] = [];
    if (settings.udpEnabled) {
      try {
        await this.startUdp();
      } catch (error) {
        errors.push(`UDP: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (settings.tcpEnabled) {
      try {
        await this.startTcp();
      } catch (error) {
        errors.push(`TCP: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    this.startedAt = this.udpSocket || this.tcpServer ? new Date().toISOString() : null;
    this.lastError = errors.length > 0 ? errors.join(' · ') : null;
    this.flushTimer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
    this.flushTimer.unref();
    return this.status();
  }

  public async stop(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = null;
    for (const client of this.tcpClients) client.destroy();
    this.tcpClients.clear();
    const udp = this.udpSocket;
    const tcp = this.tcpServer;
    this.udpSocket = null;
    this.tcpServer = null;
    await Promise.all([
      udp
        ? new Promise<void>((resolve) => {
            try {
              udp.close(() => resolve());
            } catch {
              resolve();
            }
          })
        : Promise.resolve(),
      tcp
        ? new Promise<void>((resolve) => {
            try {
              tcp.close(() => resolve());
            } catch {
              resolve();
            }
          })
        : Promise.resolve(),
    ]);
    await this.flush();
    this.startedAt = null;
  }

  public receive(
    payload: Buffer | string,
    sourceAddress: string,
    sourcePort: number | null,
    protocol: SyslogProtocol,
  ): void {
    const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
    this.counters.received += 1;
    this.lastMessageAt = new Date().toISOString();
    if (buffer.length === 0 || buffer.length > MAX_MESSAGE_BYTES) {
      this.counters.dropped += 1;
      this.lastError =
        buffer.length > MAX_MESSAGE_BYTES
          ? `Dropped oversized syslog message (${buffer.length} bytes).`
          : 'Dropped empty syslog message.';
      return;
    }
    try {
      const parsed = parseSyslogMessage(buffer);
      if (!parsed.message && !parsed.rawMessage) {
        this.counters.dropped += 1;
        return;
      }
      if (this.queue.length >= MAX_QUEUE_SIZE) {
        this.counters.dropped += 1;
        this.lastError = `Syslog queue reached ${MAX_QUEUE_SIZE} messages; incoming message dropped.`;
        return;
      }
      this.queue.push({
        ...parsed,
        sourceAddress: normalizeRemoteAddress(sourceAddress),
        sourcePort,
        protocol,
        receivedAt: new Date(),
      });
      if (this.queue.length >= BATCH_SIZE) void this.flush();
    } catch (error) {
      this.counters.parseErrors += 1;
      this.lastError = error instanceof Error ? error.message : 'Unable to parse syslog message.';
    }
  }

  public async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) return;
    this.flushing = true;
    const batch = this.queue.splice(0, BATCH_SIZE);
    try {
      this.counters.stored += await this.writeBatch(batch);
      this.lastError = null;
    } catch (error) {
      const available = MAX_QUEUE_SIZE - this.queue.length;
      this.queue.unshift(...batch.slice(0, Math.max(0, available)));
      this.counters.dropped += Math.max(0, batch.length - available);
      this.lastError = `Syslog database write failed: ${
        error instanceof Error ? error.message : String(error)
      }`;
    } finally {
      this.flushing = false;
    }
  }

  private async startUdp(): Promise<void> {
    const socket = dgram.createSocket(this.settings.bindAddress.includes(':') ? 'udp6' : 'udp4');
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        socket.close();
        reject(error);
      };
      socket.once('error', onError);
      socket.bind(this.settings.port, this.settings.bindAddress, () => {
        socket.off('error', onError);
        resolve();
      });
    });
    socket.on('message', (message, remote) => {
      this.receive(message, remote.address, remote.port, 'udp');
    });
    socket.on('error', (error) => {
      this.lastError = `UDP listener error: ${error.message}`;
    });
    this.udpSocket = socket;
  }

  private async startTcp(): Promise<void> {
    const server = net.createServer((socket) => {
      if (this.tcpClients.size >= MAX_TCP_CLIENTS) {
        this.counters.dropped += 1;
        this.lastError = `Rejected Syslog TCP connection because ${MAX_TCP_CLIENTS} clients are already connected.`;
        socket.destroy();
        return;
      }
      this.tcpClients.add(socket);
      let buffer: Buffer = Buffer.alloc(0);
      socket.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        if (buffer.length > MAX_MESSAGE_BYTES * 2) {
          this.counters.dropped += 1;
          socket.destroy(new Error('Syslog TCP frame exceeded the maximum buffer size.'));
          return;
        }
        const extracted = extractTcpFrames(buffer);
        buffer = extracted.remainder;
        for (const frame of extracted.frames)
          this.receive(frame, socket.remoteAddress ?? 'unknown', socket.remotePort ?? null, 'tcp');
      });
      socket.on('end', () => {
        const extracted = extractTcpFrames(buffer, true);
        for (const frame of extracted.frames)
          this.receive(frame, socket.remoteAddress ?? 'unknown', socket.remotePort ?? null, 'tcp');
      });
      socket.on('error', (error) => {
        this.lastError = `TCP client error: ${error.message}`;
      });
      socket.on('close', () => this.tcpClients.delete(socket));
      socket.setKeepAlive(true, 30000);
      socket.setTimeout(5 * 60_000, () => socket.destroy());
    });
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        try {
          server.close();
        } catch {
          // Listen failure can happen before the server reaches a closeable state.
        }
        reject(error);
      };
      server.once('error', onError);
      server.listen(this.settings.port, this.settings.bindAddress, () => {
        server.off('error', onError);
        resolve();
      });
    });
    server.on('error', (error) => {
      this.lastError = `TCP listener error: ${error.message}`;
    });
    this.tcpServer = server;
  }
}

export { extractTcpFrames, normalizeRemoteAddress };
