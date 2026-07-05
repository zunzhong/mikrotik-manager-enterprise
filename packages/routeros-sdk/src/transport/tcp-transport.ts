import net from 'node:net';
import { RouterOsSentenceParser } from '../codec/parser.js';
import { encodeSentence, type RouterOsSentence } from '../codec/sentence.js';
import { RouterOsFatalError, RouterOsTimeoutError, RouterOsTrapError } from '../protocol/errors.js';
import { parseReply, type RouterOsReply } from '../protocol/reply.js';
import type { RouterOsTransport, RouterOsTransportOptions } from './transport.types.js';

export class TcpTransport implements RouterOsTransport {
  private socket?: net.Socket;
  private readonly parser = new RouterOsSentenceParser();
  private pendingReplies: RouterOsReply[] = [];
  private pendingResolvers: Array<() => void> = [];
  private replyListeners = new Set<(reply: RouterOsReply) => void>();

  public constructor(private readonly options: RouterOsTransportOptions) {}

  public async connect(): Promise<void> {
    if (this.socket) return;

    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({
        host: this.options.host,
        port: this.options.port ?? 8728,
      });

      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new RouterOsTimeoutError('RouterOS TCP connect timeout'));
      }, this.options.timeoutMs ?? 10000);

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
        for (const sentence of this.parser.push(chunk)) {
          const reply = parseReply(sentence);
          this.pendingReplies.push(reply);
          for (const listener of this.replyListeners) listener(reply);
        }
        this.flushResolvers();
      });

      socket.on('error', () => this.flushResolvers());
      socket.on('close', () => this.flushResolvers());
    });
  }

  public close(): void {
    this.socket?.destroy();
    this.socket = undefined;
    this.parser.reset();
    this.pendingReplies = [];
    this.flushResolvers();
    this.replyListeners.clear();
  }

  public onReply(listener: (reply: RouterOsReply) => void): () => void {
    this.replyListeners.add(listener);
    return () => this.replyListeners.delete(listener);
  }

  public async send(sentence: RouterOsSentence): Promise<void> {
    if (!this.socket) throw new Error('RouterOS TCP transport is not connected');

    const payload = encodeSentence(sentence);

    await new Promise<void>((resolve, reject) => {
      this.socket!.write(payload, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  public async readReplySet(timeoutMs = this.options.timeoutMs ?? 10000): Promise<RouterOsReply[]> {
    const replies: RouterOsReply[] = [];
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      while (this.pendingReplies.length > 0) {
        const reply = this.pendingReplies.shift()!;

        if (reply.type === '!trap') throw new RouterOsTrapError(reply);
        if (reply.type === '!fatal') throw new RouterOsFatalError(reply);
        if (reply.type === '!done') return replies;

        replies.push(reply);
      }

      await this.waitForData(Math.max(1, timeoutMs - (Date.now() - startedAt)));
    }

    throw new RouterOsTimeoutError('RouterOS API read timeout');
  }

  private waitForData(timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(resolve, timeoutMs);
      this.pendingResolvers.push(() => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  private flushResolvers(): void {
    const resolvers = this.pendingResolvers.splice(0);
    for (const resolver of resolvers) resolver();
  }
}
