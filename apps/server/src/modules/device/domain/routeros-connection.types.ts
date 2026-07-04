export interface RouterOsConnectionInput {
  host: string;
  port?: number;
  username: string;
  password: string;
  useTls?: boolean;
  timeoutMs?: number;
}

export interface RouterOsProbeResult {
  online: boolean;
  latencyMs?: number;
  identity?: string;
  version?: string;
  architecture?: string;
  boardName?: string;
  serialNumber?: string;
  error?: string;
  raw?: Record<string, unknown>;
}
