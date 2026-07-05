export interface RouterOsApiConnectionInput {
  host: string;
  port?: number;
  username: string;
  password: string;
  timeoutMs?: number;
}

export interface RouterOsApiProbeResult {
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
