export type DeviceStatus = 'online' | 'offline' | 'unknown' | 'degraded';

export interface Device {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  useTls: boolean;
  loginMode: string;
  status: string;
  lastSeenAt?: string;
  lastError?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DeviceInput {
  name: string;
  host: string;
  port?: number;
  username: string;
  password?: string;
  useTls?: boolean;
  loginMode?: string;
  tags?: string[];
  groupId?: string | null;
}

export interface RouterOsProbeInput {
  host: string;
  port?: number;
  username: string;
  password: string;
  timeoutMs?: number;
  tls?: boolean;
  useTls?: boolean;
  rejectUnauthorized?: boolean;
}

export interface RouterOsProbeResult {
  online: boolean;
  latencyMs?: number;
  identity?: string;
  version?: string;
  architecture?: string;
  boardName?: string;
  serialNumber?: string;
  uptime?: string;
  error?: string;
  raw?: Record<string, unknown>;
}
