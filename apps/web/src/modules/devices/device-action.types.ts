export interface DeviceActionResult {
  action: string;
  success: boolean;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  message: string;
  data?: unknown;
}

export interface DevicePingInput {
  address?: string;
  count?: number;
}

export interface DeviceFileActionInput {
  name?: string;
  confirm?: boolean;
}

export interface DeviceTerminalInput {
  command: string;
  confirm?: boolean;
  transport?: 'api' | 'rest' | 'script' | 'rest-crud';
  restTls?: boolean;
  restPort?: number;
  restMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  restBody?: Record<string, unknown>;
}
