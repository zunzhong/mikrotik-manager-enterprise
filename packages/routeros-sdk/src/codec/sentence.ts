import { encodeWord } from './word.js';
export type RouterOsSentence = string[];
export function encodeSentence(words: RouterOsSentence): Buffer { return Buffer.concat([...words.map(encodeWord), encodeWord('')]); }
export function attribute(name: string, value: string | number | boolean): string { return `=${name}=${String(value)}`; }
export function query(name: string, value: string | number | boolean): string { return `?${name}=${String(value)}`; }
export function tag(value: string): string { return `.tag=${value}`; }
