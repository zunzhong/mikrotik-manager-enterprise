import { SYSLOG_FACILITIES, SYSLOG_SEVERITIES, type ParsedSyslogMessage } from './syslog.types.js';

const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function cleanText(value: string, maximum = 65535): string {
  let cleaned = '';
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (
      code === 0 ||
      (code >= 1 && code <= 8) ||
      code === 11 ||
      code === 12 ||
      (code >= 14 && code <= 31) ||
      code === 127
    ) {
      continue;
    }
    cleaned += character;
    if (cleaned.length >= maximum) break;
  }
  return cleaned.slice(0, maximum);
}

function nilValue(value: string | undefined): string | null {
  if (!value || value === '-') return null;
  return cleanText(value, 512);
}

function priorityParts(priority: number): {
  facility: number;
  facilityLabel: string;
  severity: number;
  severityLabel: string;
} {
  const normalized = Number.isInteger(priority) && priority >= 0 && priority <= 191 ? priority : 13;
  const facility = Math.floor(normalized / 8);
  const severity = normalized % 8;
  return {
    facility,
    facilityLabel: SYSLOG_FACILITIES[facility] ?? `facility-${facility}`,
    severity,
    severityLabel: SYSLOG_SEVERITIES[severity] ?? `severity-${severity}`,
  };
}

function parseStructuredData(input: string): {
  data: Record<string, Record<string, string>> | null;
  remainder: string;
} {
  if (!input.startsWith('[')) {
    return {
      data: null,
      remainder: input === '-' ? '' : input.startsWith('- ') ? input.slice(2) : input,
    };
  }

  const data: Record<string, Record<string, string>> = {};
  let index = 0;
  while (input[index] === '[') {
    let escaped = false;
    let end = index + 1;
    for (; end < input.length; end += 1) {
      const character = input[end];
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === ']') break;
    }
    if (end >= input.length) break;

    const block = input.slice(index + 1, end);
    const firstSpace = block.indexOf(' ');
    const id = firstSpace < 0 ? block : block.slice(0, firstSpace);
    const parameters: Record<string, string> = {};
    const parameterText = firstSpace < 0 ? '' : block.slice(firstSpace + 1);
    const expression = /([^\s=]+)="((?:\\["\\\]]|[^"])*)"/g;
    let match: RegExpExecArray | null;
    while ((match = expression.exec(parameterText))) {
      parameters[match[1]] = match[2].replace(/\\(["\\\]])/g, '$1');
    }
    data[cleanText(id, 128)] = parameters;
    index = end + 1;
  }

  return {
    data: Object.keys(data).length > 0 ? data : null,
    remainder: input.slice(index).replace(/^\s+/, ''),
  };
}

function parseRfc5424(
  body: string,
): Omit<
  ParsedSyslogMessage,
  'facility' | 'facilityLabel' | 'severity' | 'severityLabel' | 'priority' | 'rawMessage'
> | null {
  const match = /^([1-9]\d*)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+([\s\S]*)$/.exec(body);
  if (!match) return null;

  const [, , timestamp, hostname, appName, processId, messageId, tail] = match;
  const parsedDate = timestamp === '-' ? null : new Date(timestamp);
  const structured = parseStructuredData(tail);
  return {
    eventTime: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
    hostname: nilValue(hostname),
    appName: nilValue(appName),
    processId: nilValue(processId),
    messageId: nilValue(messageId),
    tag: nilValue(appName),
    message: cleanText(structured.remainder.trimStart()),
    structuredData: structured.data,
  };
}

function rfc3164Date(month: string, day: string, clock: string, now: Date): Date | null {
  const monthNumber = MONTHS[month];
  if (monthNumber === undefined) return null;
  const [hour, minute, second] = clock.split(':').map(Number);
  const result = new Date(now.getFullYear(), monthNumber, Number(day), hour, minute, second, 0);
  if (Number.isNaN(result.getTime())) return null;
  if (result.getTime() - now.getTime() > 7 * 86400_000)
    result.setFullYear(result.getFullYear() - 1);
  return result;
}

function parseRfc3164(
  body: string,
  now: Date,
): Omit<
  ParsedSyslogMessage,
  'facility' | 'facilityLabel' | 'severity' | 'severityLabel' | 'priority' | 'rawMessage'
> | null {
  const match = /^([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2}:\d{2}:\d{2})\s+(\S+)\s+([\s\S]*)$/.exec(
    body,
  );
  if (!match) return null;
  const [, month, day, clock, hostname, remainder] = match;
  const tagMatch = /^([^:\s[\]]{1,128})(?:\[(\d+)\])?:\s*([\s\S]*)$/.exec(remainder);
  return {
    eventTime: rfc3164Date(month, day, clock, now),
    hostname: nilValue(hostname),
    appName: nilValue(tagMatch?.[1]),
    processId: nilValue(tagMatch?.[2]),
    messageId: null,
    tag: nilValue(tagMatch?.[1]),
    message: cleanText(tagMatch?.[3] ?? remainder),
    structuredData: null,
  };
}

function parseIsoPrefix(
  body: string,
): Omit<
  ParsedSyslogMessage,
  'facility' | 'facilityLabel' | 'severity' | 'severityLabel' | 'priority' | 'rawMessage'
> | null {
  const match =
    /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\s+(\S+)\s+([\s\S]*)$/.exec(
      body,
    );
  if (!match) return null;
  const eventTime = new Date(match[1].replace(' ', 'T'));
  return {
    eventTime: Number.isNaN(eventTime.getTime()) ? null : eventTime,
    hostname: nilValue(match[2]),
    appName: null,
    processId: null,
    messageId: null,
    tag: null,
    message: cleanText(match[3]),
    structuredData: null,
  };
}

export function parseSyslogMessage(input: string | Buffer, now = new Date()): ParsedSyslogMessage {
  const rawMessage = cleanText(Buffer.isBuffer(input) ? input.toString('utf8') : input).trim();
  const priorityMatch = /^<(\d{1,3})>([\s\S]*)$/.exec(rawMessage);
  const priority = priorityMatch ? Number(priorityMatch[1]) : 13;
  const body = (priorityMatch?.[2] ?? rawMessage).trim();
  const priorityData = priorityParts(priority);

  const parsed = parseRfc5424(body) ??
    parseRfc3164(body, now) ??
    parseIsoPrefix(body) ?? {
      eventTime: null,
      hostname: null,
      appName: null,
      processId: null,
      messageId: null,
      tag: null,
      message: cleanText(body),
      structuredData: null,
    };

  return {
    ...parsed,
    ...priorityData,
    priority: priorityData.facility * 8 + priorityData.severity,
    rawMessage,
  };
}
