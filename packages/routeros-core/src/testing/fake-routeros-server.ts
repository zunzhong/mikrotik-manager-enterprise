import { createServer, type Server, type Socket } from 'node:net';
import { createChallengeResponse } from '../auth/md5-challenge.js';
import { encodeSentence } from '../protocol/encoder.js';
import { PacketAssembler } from '../protocol/packet-assembler.js';
import type { RouterOsSentence } from '../types/index.js';

export interface FakeRouterOsServerOptions {
  username?: string;
  password?: string;
  loginMode?: 'modern' | 'legacy';
  challengeHex?: string;
  resource?: Record<string, string>;
}

/**
 * FakeRouterOsServer
 *
 * Minimal RouterOS API compatible TCP server for SDK integration tests.
 */
export class FakeRouterOsServer {
  private server: Server | null = null;
  private readonly sockets = new Set<Socket>();

  public constructor(private readonly options: FakeRouterOsServerOptions = {}) {}

  public get port(): number {
    const address = this.server?.address();

    if (!address || typeof address === 'string') {
      throw new Error('FakeRouterOsServer is not listening');
    }

    return address.port;
  }

  public async start(): Promise<void> {
    if (this.server) {
      return;
    }

    this.server = createServer((socket) => this.handleSocket(socket));

    await new Promise<void>((resolve, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(0, '127.0.0.1', () => resolve());
    });
  }

  public async stop(): Promise<void> {
    for (const socket of this.sockets) {
      socket.destroy();
    }

    this.sockets.clear();

    if (!this.server) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.server!.close(() => resolve());
    });

    this.server = null;
  }

  private handleSocket(socket: Socket): void {
    this.sockets.add(socket);

    const assembler = new PacketAssembler();

    socket.on('data', (chunk) => {
      const sentences = assembler.push(chunk);

      for (const sentence of sentences) {
        this.handleSentence(socket, sentence);
      }
    });

    socket.on('error', () => undefined);
    socket.on('close', () => {
      this.sockets.delete(socket);
    });
  }

  private handleSentence(socket: Socket, sentence: RouterOsSentence): void {
    const command = sentence[0];

    if (command === '/login') {
      this.handleLogin(socket, sentence);
      return;
    }

    if (command === '/system/resource/print') {
      this.handleResourcePrint(socket, sentence);
      return;
    }

    this.write(socket, [
      '!trap',
      '=message=no such command',
      '=category=0',
      this.getTagWord(sentence),
    ]);
  }

  private handleLogin(socket: Socket, sentence: RouterOsSentence): void {
    if (this.options.loginMode === 'legacy') {
      this.handleLegacyLogin(socket, sentence);
      return;
    }

    this.handleModernLogin(socket, sentence);
  }

  private handleModernLogin(socket: Socket, sentence: RouterOsSentence): void {
    const username = this.getAttribute(sentence, 'name');
    const password = this.getAttribute(sentence, 'password');

    if (this.isValidCredential(username, password)) {
      this.write(socket, ['!done']);
      return;
    }

    this.write(socket, ['!trap', '=message=invalid user name or password', '=category=2']);
  }

  private handleLegacyLogin(socket: Socket, sentence: RouterOsSentence): void {
    const username = this.getAttribute(sentence, 'name');
    const response = this.getAttribute(sentence, 'response');
    const challengeHex = this.options.challengeHex ?? '00112233445566778899aabbccddeeff';

    if (!username && !response) {
      this.write(socket, ['!done', `=ret=${challengeHex}`]);
      return;
    }

    const expectedUsername = this.options.username ?? 'admin';
    const expectedPassword = this.options.password ?? '';
    const expectedResponse = createChallengeResponse(expectedPassword, challengeHex);

    if (username === expectedUsername && response === expectedResponse) {
      this.write(socket, ['!done']);
      return;
    }

    this.write(socket, ['!trap', '=message=invalid user name or password', '=category=2']);
  }

  private handleResourcePrint(socket: Socket, sentence: RouterOsSentence): void {
    const tagWord = this.getTagWord(sentence);
    const resource = {
      version: '7.15.3',
      uptime: '1d2h3m',
      'cpu-load': '4',
      'free-memory': '123456789',
      ...this.options.resource,
    };

    this.write(socket, [
      '!re',
      ...Object.entries(resource).map(([key, value]) => `=${key}=${value}`),
      tagWord,
    ]);

    this.write(socket, ['!done', tagWord]);
  }

  private isValidCredential(username?: string, password?: string): boolean {
    const expectedUsername = this.options.username ?? 'admin';
    const expectedPassword = this.options.password ?? '';

    return username === expectedUsername && password === expectedPassword;
  }

  private getAttribute(sentence: RouterOsSentence, key: string): string | undefined {
    const prefix = `=${key}=`;
    const word = sentence.find((item) => item.startsWith(prefix));

    return word?.slice(prefix.length);
  }

  private getTagWord(sentence: RouterOsSentence): string {
    return sentence.find((item) => item.startsWith('.tag=')) ?? '.tag=';
  }

  private write(socket: Socket, sentence: RouterOsSentence): void {
    socket.write(encodeSentence(sentence));
  }
}
