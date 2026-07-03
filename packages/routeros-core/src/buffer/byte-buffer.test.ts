import { describe, expect, it } from 'vitest';
import { ByteBuffer } from './byte-buffer.js';

describe('ByteBuffer', () => {
  it('starts empty', () => {
    const buffer = new ByteBuffer();

    expect(buffer.length).toBe(0);
    expect(buffer.isEmpty).toBe(true);
  });

  it('appends and reads data', () => {
    const buffer = new ByteBuffer();

    buffer.append(Buffer.from('hello'));
    buffer.append(Buffer.from('world'));

    expect(buffer.length).toBe(10);
    expect(buffer.read(5)?.toString()).toBe('hello');
    expect(buffer.read(5)?.toString()).toBe('world');
    expect(buffer.isEmpty).toBe(true);
  });

  it('returns null when not enough data is available', () => {
    const buffer = new ByteBuffer();

    buffer.append(Buffer.from('abc'));

    expect(buffer.peek(4)).toBeNull();
    expect(buffer.read(4)).toBeNull();
    expect(buffer.length).toBe(3);
  });

  it('supports readUInt8', () => {
    const buffer = new ByteBuffer();

    buffer.append(Buffer.from([1, 2, 3]));

    expect(buffer.readUInt8()).toBe(1);
    expect(buffer.readUInt8(2)).toBe(3);
    expect(buffer.readUInt8(3)).toBeNull();
  });

  it('clears data', () => {
    const buffer = new ByteBuffer();

    buffer.append(Buffer.from('abc'));
    buffer.clear();

    expect(buffer.length).toBe(0);
    expect(buffer.isEmpty).toBe(true);
  });
});
