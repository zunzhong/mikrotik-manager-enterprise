import { describe, expect, it } from 'vitest';
import { ReplyParser } from './reply-parser.js';
import { RouterReplyType } from './reply.js';

describe('ReplyParser', () => {
  const parser = new ReplyParser();

  it('parses !re replies', () => {
    const reply = parser.parse([
      '!re',
      '=version=7.15.3',
      '=uptime=1d2h',
      '=cpu-load=4',
      '.tag=req-1',
    ]);

    expect(reply.type).toBe(RouterReplyType.Re);
    expect(reply.tag).toBe('req-1');
    expect(reply.words.version).toBe('7.15.3');
    expect(reply.words.uptime).toBe('1d2h');
    expect(reply.words['cpu-load']).toBe('4');
  });

  it('parses !done replies', () => {
    const reply = parser.parse(['!done', '.tag=req-1']);

    expect(reply.type).toBe(RouterReplyType.Done);
    expect(reply.tag).toBe('req-1');
  });

  it('parses !trap replies', () => {
    const reply = parser.parse([
      '!trap',
      '=message=invalid user name or password',
      '=category=2',
      '.tag=req-2',
    ]);

    expect(reply.type).toBe(RouterReplyType.Trap);
    expect(reply.tag).toBe('req-2');
    expect(reply.words.message).toBe('invalid user name or password');
    expect(reply.words.category).toBe('2');
  });

  it('parses !fatal replies', () => {
    const reply = parser.parse(['!fatal', '=message=session terminated']);

    expect(reply.type).toBe(RouterReplyType.Fatal);
    expect(reply.words.message).toBe('session terminated');
  });

  it('parses empty attributes', () => {
    const reply = parser.parse(['!re', '=comment=']);

    expect(reply.words.comment).toBe('');
  });

  it('parses unknown reply type', () => {
    const reply = parser.parse(['!custom', '=x=y']);

    expect(reply.type).toBe(RouterReplyType.Unknown);
    expect(reply.words.x).toBe('y');
  });

  it('throws on empty sentence', () => {
    expect(() => parser.parse([])).toThrow();
  });
});
