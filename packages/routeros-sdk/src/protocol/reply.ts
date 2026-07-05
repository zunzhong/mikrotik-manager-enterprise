export type RouterOsReplyType = '!re' | '!done' | '!trap' | '!fatal' | string;
export interface RouterOsReply { type: RouterOsReplyType; attributes: Record<string,string>; words: string[]; tag?: string; }
export function parseReply(sentence: string[]): RouterOsReply {
  const type = sentence[0] ?? ''; const attributes: Record<string,string> = {}; let tag: string | undefined;
  for (const word of sentence.slice(1)) { if (word.startsWith('=.tag=')) { tag = word.slice(6); continue; } if (word.startsWith('.tag=')) { tag = word.slice(5); continue; } if (!word.startsWith('=')) continue; const second = word.indexOf('=',1); if (second > 0) attributes[word.slice(1,second)] = word.slice(second+1); }
  return { type, attributes, words: sentence, tag };
}
export function firstData(replies: RouterOsReply[]): Record<string,string> { return replies.find((r)=>r.type==='!re')?.attributes ?? {}; }
