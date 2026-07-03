export const RouterReplyType = {
  Re: 're',
  Done: 'done',
  Trap: 'trap',
  Fatal: 'fatal',
  Unknown: 'unknown',
} as const;

export type RouterReplyType = (typeof RouterReplyType)[keyof typeof RouterReplyType];

export interface RouterReply {
  type: RouterReplyType;
  words: Record<string, string>;
  tag?: string;
  raw: string[];
}

export interface RouterTrapReply extends RouterReply {
  type: typeof RouterReplyType.Trap;
  message?: string;
  category?: string;
}

export interface RouterFatalReply extends RouterReply {
  type: typeof RouterReplyType.Fatal;
  message?: string;
}
