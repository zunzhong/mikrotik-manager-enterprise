import { RouterOsAuthError, RouterOsProtocolError } from '../errors/routeros-error.js';
import { encodeSentence } from '../protocol/encoder.js';
import { PacketAssembler } from '../protocol/packet-assembler.js';
import { replyParser } from '../protocol/reply-parser.js';
import { RouterReplyType } from '../protocol/reply.js';
import type { Transport } from '../types/index.js';
import { createChallengeResponse } from './md5-challenge.js';

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthServiceOptions {
  timeoutMs?: number;
}

/**
 * AuthService
 *
 * Handles RouterOS login flows.
 *
 * Supported:
 * - modern login with username/password
 * - legacy challenge response helper
 */
export class AuthService {
  public constructor(private readonly transport: Transport) {}

  public async login(credentials: AuthCredentials, options: AuthServiceOptions = {}): Promise<void> {
    const timeoutMs = options.timeoutMs ?? 10000;

    await this.transport.write(
      encodeSentence([
        '/login',
        `=name=${credentials.username}`,
        `=password=${credentials.password}`,
      ]),
    );

    const reply = await this.readFirstReply(timeoutMs);

    if (reply.type === RouterReplyType.Done) {
      return;
    }

    if (reply.type === RouterReplyType.Trap) {
      throw new RouterOsAuthError(reply.words.message ?? 'RouterOS authentication failed');
    }

    throw new RouterOsProtocolError(`Unexpected authentication reply: ${reply.type}`);
  }

  public async loginWithChallenge(
    credentials: AuthCredentials,
    challengeHex: string,
    options: AuthServiceOptions = {},
  ): Promise<void> {
    const timeoutMs = options.timeoutMs ?? 10000;
    const response = createChallengeResponse(credentials.password, challengeHex);

    await this.transport.write(
      encodeSentence(['/login', `=name=${credentials.username}`, `=response=${response}`]),
    );

    const reply = await this.readFirstReply(timeoutMs);

    if (reply.type === RouterReplyType.Done) {
      return;
    }

    if (reply.type === RouterReplyType.Trap) {
      throw new RouterOsAuthError(reply.words.message ?? 'RouterOS authentication failed');
    }

    throw new RouterOsProtocolError(`Unexpected challenge authentication reply: ${reply.type}`);
  }

  private async readFirstReply(timeoutMs: number) {
    const assembler = new PacketAssembler();
    const timeoutAt = Date.now() + timeoutMs;

    for await (const chunk of this.transport.read()) {
      const replies = assembler.push(chunk).map((sentence) => replyParser.parse(sentence));

      if (replies.length > 0) {
        return replies[0];
      }

      if (Date.now() > timeoutAt) {
        break;
      }
    }

    throw new RouterOsAuthError('Authentication timed out');
  }
}
