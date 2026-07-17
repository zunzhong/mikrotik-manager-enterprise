export interface CommandResponse {
  tag: string;
  rows: Array<Record<string, string>>;
  done: Record<string, string>;
  raw: string[][];
}
