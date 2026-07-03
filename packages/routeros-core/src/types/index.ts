export interface RouterClientOptions {
  host: string;
  port?: number;
  username?: string;
  password?: string;
  tls?: boolean;
  timeoutMs?: number;
  keepAlive?: boolean;
  rejectUnauthorized?: boolean;
  transportFactory?: (options: TcpTransportOptions) => Transport;
}

export interface RouterOsConnectionOptions {
  host: string;
  port?: number;
  timeoutMs?: number;
}

export interface TcpTransportOptions {
  host: string;
  port: number;
  timeoutMs: number;
}

export type RouterOsSentence = string[];

export interface Transport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  write(data: Buffer): Promise<void>;
  read(): AsyncIterable<Buffer>;
}
