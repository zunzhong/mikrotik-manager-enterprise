import { RouterOsProtocolError } from '../errors/routeros-error.js';
import { RouterReplyType, type RouterReply } from './reply.js';
import type { RouterOsSentence } from '../types/index.js';

/**
 * ReplyParser
 *
 * Converts RouterOS raw sentences into structured replies.
 */
export class ReplyParser {
  public parse(sentence: RouterOsSentence): RouterReply {
    if (sentence.length === 0) {
      throw new RouterOsProtocolError('Cannot parse empty RouterOS reply sentence');
    }

    const [head, ...words] = sentence;

    const reply: RouterReply = {
      type: this.parseType(head),
      words: {},
      raw: [...sentence],
    };

    for (const word of words) {
      if (word.startsWith('.tag=')) {
        reply.tag = word.slice('.tag='.length);
        continue;
      }

      if (!word.startsWith('=')) {
        reply.raw.push(word);
        continue;
      }

      const parsed = this.parseAttribute(word);
      reply.words[parsed.key] = parsed.value;
    }

    return reply;
  }

  private parseType(word: string): RouterReplyType {
    switch (word) {
      case '!re':
        return RouterReplyType.Re;
      case '!done':
        return RouterReplyType.Done;
      case '!trap':
        return RouterReplyType.Trap;
      case '!fatal':
        return RouterReplyType.Fatal;
      default:
        return RouterReplyType.Unknown;
    }
  }

  private parseAttribute(word: string): { key: string; value: string } {
    const body = word.slice(1);
    const separatorIndex = body.indexOf('=');

    if (separatorIndex === -1) {
      return {
        key: body,
        value: '',
      };
    }

    return {
      key: body.slice(0, separatorIndex),
      value: body.slice(separatorIndex + 1),
    };
  }
}

export const replyParser = new ReplyParser();
