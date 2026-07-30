export const SYSLOG_FACILITIES = [
  'kernel',
  'user',
  'mail',
  'daemon',
  'auth',
  'syslog',
  'lpr',
  'news',
  'uucp',
  'clock',
  'authpriv',
  'ftp',
  'ntp',
  'audit',
  'alert',
  'clock2',
  'local0',
  'local1',
  'local2',
  'local3',
  'local4',
  'local5',
  'local6',
  'local7',
] as const;

export const SYSLOG_SEVERITIES = [
  'emergency',
  'alert',
  'critical',
  'error',
  'warning',
  'notice',
  'informational',
  'debug',
] as const;

export type SyslogProtocol = 'udp' | 'tcp' | 'internal';

export interface ParsedSyslogMessage {
  eventTime: Date | null;
  hostname: string | null;
  appName: string | null;
  processId: string | null;
  messageId: string | null;
  facility: number;
  facilityLabel: string;
  severity: number;
  severityLabel: string;
  priority: number;
  tag: string | null;
  message: string;
  rawMessage: string;
  structuredData: Record<string, Record<string, string>> | null;
}

export interface ReceivedSyslogMessage extends ParsedSyslogMessage {
  sourceAddress: string;
  sourcePort: number | null;
  protocol: SyslogProtocol;
  receivedAt: Date;
}

export interface SyslogReceiverSettings {
  enabled: boolean;
  udpEnabled: boolean;
  tcpEnabled: boolean;
  bindAddress: string;
  port: number;
  retentionDays: number;
  maxRecords: number;
  acceptUnmatched: boolean;
}

export interface SyslogReceiverStatus {
  enabled: boolean;
  running: boolean;
  udpListening: boolean;
  tcpListening: boolean;
  bindAddress: string;
  port: number;
  received: number;
  stored: number;
  dropped: number;
  parseErrors: number;
  queueDepth: number;
  activeTcpClients: number;
  startedAt: string | null;
  lastMessageAt: string | null;
  lastError: string | null;
}

export interface SyslogListQuery {
  page: number;
  pageSize: number;
  deviceId?: string;
  severity?: number;
  facility?: number;
  protocol?: SyslogProtocol;
  search?: string;
  from?: Date;
  to?: Date;
}
