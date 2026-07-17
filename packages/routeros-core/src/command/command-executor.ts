import {
  RouterOsCommandError,
  RouterOsFatalError,
  RouterOsTimeoutError,
} from '../errors/routeros-error.js';
import { encodeSentence } from '../protocol/encoder.js';
import { PacketAssembler } from '../protocol/packet-assembler.js';
import { replyParser } from '../protocol/reply-parser.js';
import { RouterReplyType } from '../protocol/reply.js';
import type { Transport } from '../types/index.js';
import type { CommandRequest } from './command-request.js';
import type { CommandResponse } from './command-response.js';
import { CommandTagGenerator } from './command-tag.js';

/**
 * CommandExecutor
 *
 * Sends RouterOS commands and collects replies until `!done`.
 *
 * This is the first implementation and intentionally processes one command
 * at a time. Concurrent tagged commands will be added after RouterClient
 * integration is stable.
 */
export class CommandExecutor {
  private readonly tagGenerator = new CommandTagGenerator();

  public constructor(private readonly transport: Transport) {}

  public async execute(request: CommandRequest): Promise<CommandResponse> {
    const tag = request.tag ?? this.tagGenerator.next();
    const timeoutMs = request.timeoutMs ?? 10000;
    const sentence = this.buildSentence(request, tag);

    await this.transport.write(encodeSentence(sentence));

    return this.readResponse(tag, timeoutMs);
  }

  private buildSentence(request: CommandRequest, tag: string): string[] {
    const sentence: string[] = [request.path];

    for (const [key, value] of Object.entries(request.attributes ?? {})) {
      sentence.push(`=${key}=${String(value)}`);
    }

    for (const query of request.queries ?? []) {
      sentence.push(query);
    }

    sentence.push(`.tag=${tag}`);

    return sentence;
  }

  private async readResponse(tag: string, timeoutMs: number): Promise<CommandResponse> {
    const assembler = new PacketAssembler();
    const rows: Array<Record<string, string>> = [];
    const raw: string[][] = [];
    const timeoutAt = Date.now() + timeoutMs;

    for await (const chunk of this.transport.read()) {
      const replies = assembler.push(chunk).map((sentence) => replyParser.parse(sentence));

      for (const reply of replies) {
        if (reply.tag && reply.tag !== tag) {
          continue;
        }

        raw.push(reply.raw);

        if (reply.type === RouterReplyType.Re) {
          rows.push(reply.words);
          continue;
        }

        if (reply.type === RouterReplyType.Done) {
          return {
            tag,
            rows,
            done: reply.words,
            raw,
          };
        }

        if (reply.type === RouterReplyType.Trap) {
          throw new RouterOsCommandError(
            reply.words.message ?? 'RouterOS command failed',
            reply.words.category,
          );
        }

        if (reply.type === RouterReplyType.Fatal) {
          throw new RouterOsFatalError(reply.words.message ?? 'RouterOS fatal error');
        }
      }

      if (Date.now() > timeoutAt) {
        break;
      }
    }

    throw new RouterOsTimeoutError(`Command ${tag} timed out after ${timeoutMs}ms`);
  }
}
