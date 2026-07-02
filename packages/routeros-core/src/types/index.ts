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
