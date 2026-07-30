import { describe, expect, it } from 'vitest';
import { parseSyslogMessage } from './syslog.parser.js';

describe('Syslog parser', () => {
  it('parses RFC 5424 structured messages', () => {
    const parsed = parseSyslogMessage(
      '<134>1 2026-07-27T12:34:56.000Z core-router MME 123 CONFIG [meta@32473 interface="ether1"] link is up',
    );
    expect(parsed).toMatchObject({
      priority: 134,
      facility: 16,
      facilityLabel: 'local0',
      severity: 6,
      severityLabel: 'informational',
      hostname: 'core-router',
      appName: 'MME',
      processId: '123',
      messageId: 'CONFIG',
      message: 'link is up',
    });
    expect(parsed.structuredData).toEqual({ 'meta@32473': { interface: 'ether1' } });
  });

  it('parses RFC 3164 messages and tags', () => {
    const parsed = parseSyslogMessage(
      '<132>Jul 27 12:34:56 edge-router system[44]: rebooted',
      new Date('2026-07-27T13:00:00Z'),
    );
    expect(parsed).toMatchObject({
      facility: 16,
      severity: 4,
      hostname: 'edge-router',
      appName: 'system',
      processId: '44',
      message: 'rebooted',
    });
  });

  it('keeps RouterOS and malformed input searchable without control characters', () => {
    const parsed = parseSyslogMessage('<134>router-info: interface ether1 up\u0000\u0007');
    expect(parsed.facilityLabel).toBe('local0');
    expect(parsed.severityLabel).toBe('informational');
    expect(parsed.message).toBe('router-info: interface ether1 up');
    expect(parsed.rawMessage).not.toContain('\u0000');
  });
});
