import { describe, expect, it } from 'vitest';
import { TokenService } from './token.service.js';

const payload = {
  userId: 'user-1',
  email: 'admin@example.com',
  role: 'admin',
};

describe('TokenService', () => {
  it('signs and verifies a valid token', () => {
    const service = new TokenService('test-secret-at-least-32-characters');
    const token = service.sign(payload, 60);

    expect(service.verify(token)).toMatchObject(payload);
  });

  it('rejects a token signed by another secret', () => {
    const signer = new TokenService('signer-secret-at-least-32-characters');
    const verifier = new TokenService('other-secret-at-least-32-characters');

    expect(verifier.verify(signer.sign(payload, 60))).toBeNull();
  });

  it('rejects expired, malformed, and tampered tokens', () => {
    const service = new TokenService('test-secret-at-least-32-characters');
    const valid = service.sign(payload, 60);
    const [header, body] = valid.split('.');

    expect(service.verify(service.sign(payload, -1))).toBeNull();
    expect(service.verify('not-a-jwt')).toBeNull();
    expect(service.verify(`${header}.${body}.invalid`)).toBeNull();
    expect(service.verify('e30.e30.signature')).toBeNull();
  });
});
