import { describe, expect, it } from 'vitest';
import { SentenceDecoder } from './decoder.js';
import { encodeSentence } from './encoder.js';

describe('SentenceDecoder', () => {
  it('decodes a complete sentence', () => {
    const decoder = new SentenceDecoder();
    const sentence = ['/system/resource/print', '=detail=', '.tag=abc'];

    expect(decoder.push(encodeSentence(sentence))).toEqual([sentence]);
  });

  it('keeps backward compatibility for split TCP chunks', () => {
    const decoder = new SentenceDecoder();
    const sentence = ['/login', '=name=admin', '=password=secret'];
    const encoded = encodeSentence(sentence);

    expect(decoder.push(encoded.subarray(0, 3))).toEqual([]);
    expect(decoder.push(encoded.subarray(3))).toEqual([sentence]);
  });
});
