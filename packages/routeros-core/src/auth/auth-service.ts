import { RouterOsAuthError, RouterOsProtocolError } from '../errors/routeros-error.js';
import { encodeSentence } from '../protocol/encoder.js';
import { PacketAssembler } from '../protocol/packet-assembler.js';
import { replyParser } from '../protocol/reply-parser.js';
import { RouterReplyType, type RouterReply } from '../protocol/reply.js';
import type { RouterOsLoginMode, Transport } from '../types/index.js';
import { createChallengeResponse } from './md5-challenge.js';

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthServiceOptions {
  timeoutMs?: number;
  loginMode?: RouterOsLoginMode;
}

/**
 * AuthService
 *
 * Handles RouterOS login flows.
 *
 * Supported:
 * - modern login with username/password
 * - legacy challenge login
 * - auto fallback if the router returns a challenge
 */
export class AuthService {
  public constructor(private readonly transport: Transport) {}

  public async login(credentials: AuthCredentials, options: AuthServiceOptions = {}): Promise<void> {
    const timeoutMs = options.timeoutMs ?? 10000;
    const loginMode = options.loginMode ?? 'auto';

    if (loginMode === 'legacy') {
      await this.loginLegacy(credentials, timeoutMs);
      return;
    }

    const firstReply = await this.loginModern(credentials, timeoutMs);

    if (firstReply.type === RouterReplyType.Done && firstReply.words.ret && loginMode === 'auto') {
      await this.loginWithChallenge(credentials, firstReply.words.ret, { timeoutMs });
      return;
    }

    this.ensureLoginSuccess(firstReply, 'Unexpected authentication reply');
  }

  public async loginModern(credentials: AuthCredentials, timeoutMs = 10000): Promise<RouterReply> {
    await this.transport.write(
      encodeSentence([
        '/login',
        `=name=${credentials.username}`,
        `=password=${credentials.password}`,
      ]),
    );

    return this.readFirstReply(timeoutMs);
  }

  public async loginLegacy(credentials: AuthCredentials, timeoutMs = 10000): Promise<void> {
    await this.transport.write(encodeSentence(['/login']));

    const challengeReply = await this.readFirstReply(timeoutMs);
    const challenge = challengeReply.words.ret;

    if (!challenge) {
      this.ensureLoginSuccess(challengeReply, 'Legacy login did not return challenge');
      return;
    }

    await this.loginWithChallenge(credentials, challenge, { timeoutMs });
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
    this.ensureLoginSuccess(reply, 'Unexpected challenge authentication reply');
  }

  private ensureLoginSuccess(reply: RouterReply, protocolMessage: string): void {
    if (reply.type === RouterReplyType.Done) {
      return;
    }

    if (reply.type === RouterReplyType.Trap) {
      throw new RouterOsAuthError(reply.words.message ?? 'RouterOS authentication failed');
    }

    throw new RouterOsProtocolError(`${protocolMessage}: ${reply.type}`);
  }

  private async readFirstReply(timeoutMs: number): Promise<RouterReply> {
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
