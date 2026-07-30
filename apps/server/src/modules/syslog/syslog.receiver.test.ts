import { describe, expect, it } from 'vitest';
import { extractTcpFrames, normalizeRemoteAddress } from './syslog.receiver.js';

describe('Syslog TCP framing', () => {
  it('extracts newline-delimited frames', () => {
    const result = extractTcpFrames(Buffer.from('<13>one\n<14>two\n'));
    expect(result.frames.map((frame) => frame.toString())).toEqual(['<13>one', '<14>two']);
    expect(result.remainder.length).toBe(0);
  });

  it('extracts RFC 6587 octet-counted frames and keeps partial data', () => {
    const first = extractTcpFrames(Buffer.from('7 <13>one10 <14>'));
    expect(first.frames.map((frame) => frame.toString())).toEqual(['<13>one']);
    expect(first.remainder.toString()).toBe('10 <14>');
    const second = extractTcpFrames(Buffer.concat([first.remainder, Buffer.from('two!!!')]));
    expect(second.frames.map((frame) => frame.toString())).toEqual(['<14>two!!!']);
  });

  it('normalizes IPv4-mapped IPv6 addresses', () => {
    expect(normalizeRemoteAddress('::ffff:10.0.0.2')).toBe('10.0.0.2');
    expect(normalizeRemoteAddress('fe80::1%eth0')).toBe('fe80::1');
  });
});
