import { describe, expect, it } from 'vitest';
import { encodeSentence } from './encoder.js';
import { PacketAssembler } from './packet-assembler.js';

describe('PacketAssembler', () => {
  it('returns a complete sentence from a single chunk', () => {
    const assembler = new PacketAssembler();
    const sentence = ['/system/identity/print'];

    expect(assembler.push(encodeSentence(sentence))).toEqual([sentence]);
  });

  it('returns no sentence for an incomplete chunk', () => {
    const assembler = new PacketAssembler();
    const sentence = ['/system/resource/print'];
    const encoded = encodeSentence(sentence);

    expect(assembler.push(encoded.subarray(0, 2))).toEqual([]);
  });

  it('assembles sentence split across many TCP chunks', () => {
    const assembler = new PacketAssembler();
    const sentence = ['/login', '=name=admin', '=password=secret'];
    const encoded = encodeSentence(sentence);

    const results = [
      ...assembler.push(encoded.subarray(0, 1)),
      ...assembler.push(encoded.subarray(1, 5)),
      ...assembler.push(encoded.subarray(5, 9)),
      ...assembler.push(encoded.subarray(9)),
    ];

    expect(results).toEqual([sentence]);
  });

  it('supports multiple sentences in one chunk', () => {
    const assembler = new PacketAssembler();

    const first = ['/system/identity/print'];
    const second = ['/system/resource/print'];

    const encoded = Buffer.concat([encodeSentence(first), encodeSentence(second)]);

    expect(assembler.push(encoded)).toEqual([first, second]);
  });

  it('supports clearing buffered data', () => {
    const assembler = new PacketAssembler();
    const sentence = ['/interface/print'];
    const encoded = encodeSentence(sentence);

    expect(assembler.push(encoded.subarray(0, 2))).toEqual([]);

    assembler.clear();

    expect(assembler.push(encoded.subarray(2))).toEqual([]);
  });
});
