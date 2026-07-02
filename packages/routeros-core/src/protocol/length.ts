import { RouterOsProtocolError } from '../errors/routeros-error.js';

export function encodeLength(length: number): Buffer {
  if (!Number.isInteger(length) || length < 0) {
    throw new RouterOsProtocolError(`Invalid word length: ${length}`);
  }

  if (length < 0x80) return Buffer.from([length]);
  if (length < 0x4000) return Buffer.from([(length >> 8) | 0x80, length & 0xff]);

  if (length < 0x200000) {
    return Buffer.from([(length >> 16) | 0xc0, (length >> 8) & 0xff, length & 0xff]);
  }

  if (length < 0x10000000) {
    return Buffer.from([
      (length >> 24) | 0xe0,
      (length >> 16) & 0xff,
      (length >> 8) & 0xff,
      length & 0xff,
    ]);
  }

  return Buffer.from([
    0xf0,
    (length >> 24) & 0xff,
    (length >> 16) & 0xff,
    (length >> 8) & 0xff,
    length & 0xff,
  ]);
}

export function decodeLength(buffer: Buffer, offset = 0): { length: number; bytesRead: number } {
  const first = buffer[offset];

  if (first === undefined) {
    throw new RouterOsProtocolError('Cannot decode length from empty buffer');
  }

  if ((first & 0x80) === 0x00) return { length: first, bytesRead: 1 };

  if ((first & 0xc0) === 0x80) {
    ensureAvailable(buffer, offset, 2);
    return { length: ((first & ~0xc0) << 8) + buffer[offset + 1], bytesRead: 2 };
  }

  if ((first & 0xe0) === 0xc0) {
    ensureAvailable(buffer, offset, 3);
    return {
      length: ((first & ~0xe0) << 16) + (buffer[offset + 1] << 8) + buffer[offset + 2],
      bytesRead: 3,
    };
  }

  if ((first & 0xf0) === 0xe0) {
    ensureAvailable(buffer, offset, 4);
    return {
      length:
        ((first & ~0xf0) << 24) +
        (buffer[offset + 1] << 16) +
        (buffer[offset + 2] << 8) +
        buffer[offset + 3],
      bytesRead: 4,
    };
  }

  ensureAvailable(buffer, offset, 5);
  return {
    length:
      (buffer[offset + 1] << 24) +
      (buffer[offset + 2] << 16) +
      (buffer[offset + 3] << 8) +
      buffer[offset + 4],
    bytesRead: 5,
  };
}

function ensureAvailable(buffer: Buffer, offset: number, requiredBytes: number): void {
  if (buffer.length - offset < requiredBytes) {
    throw new RouterOsProtocolError('Incomplete RouterOS length field');
  }
}
