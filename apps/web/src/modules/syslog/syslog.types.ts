export type SyslogProtocol = 'udp' | 'tcp' | 'internal';

export interface SyslogSettings {
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

export interface SyslogDevice {
  id: string;
  name: string;
  host: string;
  status: string;
}

export interface SyslogAlias {
  id: string;
  alias: string;
  deviceId: string;
  device: { id: string; name: string };
}

export interface SyslogOverview {
  total: number;
  last24Hours: number;
  unmatched: number;
  bySeverity: Array<{ severity: number; label: string; count: number }>;
  lastMessageAt: string | null;
  devices: SyslogDevice[];
  aliases: SyslogAlias[];
  settings: SyslogSettings;
  receiver: SyslogReceiverStatus;
  fileStorage: { path: string; lastError: string | null };
  recommendedServerAddresses: string[];
}

export interface SyslogMessage {
  id: string;
  deviceId: string | null;
  receivedAt: string;
  eventTime: string | null;
  sourceAddress: string;
  sourcePort: number | null;
  protocol: SyslogProtocol;
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
  structuredData: unknown;
  device: { id: string; name: string; host: string } | null;
}

export interface SyslogMessagePage {
  items: SyslogMessage[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface SyslogFilters {
  page: number;
  pageSize: number;
  deviceId?: string;
  severity?: number;
  facility?: number;
  protocol?: SyslogProtocol;
  search?: string;
  date?: string;
}

export interface RouterOsSyslogResult {
  deviceId: string;
  deviceName: string;
  success: boolean;
  error?: string;
  warning?: string;
  actionVerified?: boolean;
  ruleVerified?: boolean;
  deliveryVerified?: boolean | null;
  routerOsVersion?: string;
  configurationProfile?: string;
}
