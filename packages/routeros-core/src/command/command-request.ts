export type RouterCommandValue = string | number | boolean;

export interface CommandRequest {
  path: string;
  attributes?: Record<string, RouterCommandValue>;
  queries?: string[];
  tag?: string;
  timeoutMs?: number;
}
