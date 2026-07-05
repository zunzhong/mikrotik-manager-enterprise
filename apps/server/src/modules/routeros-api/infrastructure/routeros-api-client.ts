import net from 'node:net';
import type { RouterOsApiConnectionInput } from '../domain/routeros-api.types.js';

export type RouterOsReply = Record<string, string>;

function encodeLength(length: number): Buffer {
  if (length < 0x80) {
    return Buffer.from([length]);
  }

  if (length < 0x4000) {
    return Buffer.from([(length >> 8) | 0x80, length & 0xff]);
  }

  if (length < 0x200000) {
    return Buffer.from([(length >> 16) | 0xc0, (length >> 8) & 0xff, length & 0xff]);
  }

  if (length < 0x10000000) {
    return Buffer.from([
      (length >> 24) | 0xe0,
      (length >> 16) & 0xff,
      (length >> 8) & 0xff,
      length & 0xff,
    ]);
  }

  return Buffer.from([
    0xf0,
    (length >> 24) & 0xff,
    (length >> 16) & 0xff,
    (length >> 8) & 0xff,
    length & 0xff,
  ]);
}

function decodeLength(buffer: Buffer, offset: number): { length: number; offset: number } {
  const first = buffer[offset];

  if ((first & 0x80) === 0x00) {
    return { length: first, offset: offset + 1 };
  }

  if ((first & 0xc0) === 0x80) {
    return { length: ((first & ~0xc0) << 8) + buffer[offset + 1], offset: offset + 2 };
  }

  if ((first & 0xe0) === 0xc0) {
    return {
      length: ((first & ~0xe0) << 16) + (buffer[offset + 1] << 8) + buffer[offset + 2],
      offset: offset + 3,
    };
  }

  if ((first & 0xf0) === 0xe0) {
    return {
      length:
        ((first & ~0xf0) << 24) +
        (buffer[offset + 1] << 16) +
        (buffer[offset + 2] << 8) +
        buffer[offset + 3],
      offset: offset + 4,
    };
  }

  return {
    length:
      (buffer[offset + 1] << 24) +
      (buffer[offset + 2] << 16) +
      (buffer[offset + 3] << 8) +
      buffer[offset + 4],
    offset: offset + 5,
  };
}

function encodeWord(word: string): Buffer {
  const payload = Buffer.from(word, 'utf-8');
  return Buffer.concat([encodeLength(payload.length), payload]);
}

function encodeSentence(words: string[]): Buffer {
  return Buffer.concat([...words.map(encodeWord), Buffer.from([0])]);
}

function parseAttribute(word: string): [string, string] | null {
  if (!word.startsWith('=')) return null;

  const secondEquals = word.indexOf('=', 1);
  if (secondEquals < 0) return null;

  return [word.slice(1, secondEquals), word.slice(secondEquals + 1)];
}

export class RouterOsApiClient {
  private socket?: net.Socket;
  private buffer = Buffer.alloc(0);

  public constructor(private readonly input: RouterOsApiConnectionInput) {}

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({
        host: this.input.host,
        port: this.input.port ?? 8728,
      });

      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('RouterOS API connection timeout'));
      }, this.input.timeoutMs ?? 10000);

      socket.once('connect', () => {
        clearTimeout(timeout);
        this.socket = socket;
        resolve();
      });

      socket.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      socket.on('data', (chunk) => {
        this.buffer = Buffer.concat([this.buffer, chunk]);
      });
    });
  }

  public close(): void {
    this.socket?.destroy();
    this.socket = undefined;
    this.buffer = Buffer.alloc(0);
  }

  public async login(): Promise<void> {
    const replies = await this.command('/login', [
      `=name=${this.input.username}`,
      `=password=${this.input.password}`,
    ]);

    const failed = replies.find((reply) => reply['!type'] === '!trap');
    if (failed) {
      throw new Error(failed.message ?? 'RouterOS login failed');
    }
  }

  public async command(path: string, attributes: string[] = []): Promise<RouterOsReply[]> {
    if (!this.socket) throw new Error('RouterOS API socket is not connected');

    const words = [path, ...attributes];
    const sentence = encodeSentence(words);

    await new Promise<void>((resolve, reject) => {
      this.socket!.write(sentence, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    return this.readReplies();
  }

  private async readReplies(): Promise<RouterOsReply[]> {
    const startedAt = Date.now();
    const timeoutMs = this.input.timeoutMs ?? 10000;
    const replies: RouterOsReply[] = [];

    while (Date.now() - startedAt < timeoutMs) {
      const sentences = this.extractSentences();

      for (const sentence of sentences) {
        if (sentence.length === 0) continue;

        const reply: RouterOsReply = {};
        reply['!type'] = sentence[0];

        for (const word of sentence.slice(1)) {
          const attribute = parseAttribute(word);
          if (attribute) reply[attribute[0]] = attribute[1];
        }

        if (sentence[0] === '!done') {
          return replies;
        }

        replies.push(reply);
      }

      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    throw new Error('RouterOS API read timeout');
  }

  private extractSentences(): string[][] {
    const sentences: string[][] = [];
    let offset = 0;
    let current: string[] = [];

    while (offset < this.buffer.length) {
      const originalOffset = offset;

      if (offset >= this.buffer.length) break;

      const decoded = decodeLength(this.buffer, offset);
      const length = decoded.length;
      offset = decoded.offset;

      if (length === 0) {
        sentences.push(current);
        current = [];
        continue;
      }

      if (offset + length > this.buffer.length) {
        offset = originalOffset;
        break;
      }

      current.push(this.buffer.slice(offset, offset + length).toString('utf-8'));
      offset += length;
    }

    this.buffer = this.buffer.slice(offset);

    return sentences;
  }
}
