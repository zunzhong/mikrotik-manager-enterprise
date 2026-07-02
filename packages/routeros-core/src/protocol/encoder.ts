import type { RouterOsSentence } from '../types/index.js';
import { encodeLength } from './length.js';

export function encodeSentence(sentence: RouterOsSentence): Buffer {
  const chunks: Buffer[] = [];

  for (const word of sentence) {
    const wordBuffer = Buffer.from(word, 'utf8');
    chunks.push(encodeLength(wordBuffer.length), wordBuffer);
  }

  chunks.push(Buffer.from([0]));
  return Buffer.concat(chunks);
}
