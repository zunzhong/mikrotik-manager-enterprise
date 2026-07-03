import { describe, expect, it } from 'vitest';
import { RouterOsAuthError } from '../errors/routeros-error.js';
import { encodeSentence } from '../protocol/encoder.js';
import { FakeTransport } from '../testing/fake-transport.js';
import { AuthService } from './auth-service.js';
import { createChallengeResponse } from './md5-challenge.js';

describe('AuthService', () => {
  it('authenticates with modern login', async () => {
    const transport = new FakeTransport();
    const auth = new AuthService(transport);

    const promise = auth.login({
      username: 'admin',
      password: 'secret',
    });

    transport.pushIncoming(encodeSentence(['!done']));

    await expect(promise).resolves.toBeUndefined();

    expect(transport.writes).toHaveLength(1);
  });

  it('throws on trap response', async () => {
    const transport = new FakeTransport();
    const auth = new AuthService(transport);

    const promise = auth.login({
      username: 'admin',
      password: 'wrong',
    });

    transport.pushIncoming(encodeSentence(['!trap', '=message=invalid user name or password']));

    await expect(promise).rejects.toBeInstanceOf(RouterOsAuthError);
  });

  it('creates legacy challenge response', () => {
    const response = createChallengeResponse('password', '00112233445566778899aabbccddeeff');

    expect(response).toMatch(/^00[a-f0-9]{32}$/);
  });

  it('authenticates with challenge response', async () => {
    const transport = new FakeTransport();
    const auth = new AuthService(transport);

    const promise = auth.loginWithChallenge(
      {
        username: 'admin',
        password: 'secret',
      },
      '00112233445566778899aabbccddeeff',
    );

    transport.pushIncoming(encodeSentence(['!done']));

    await expect(promise).resolves.toBeUndefined();

    expect(transport.writes).toHaveLength(1);
    expect(transport.writes[0].toString('utf8')).toContain('response');
  });

  it('authenticates with legacy login mode', async () => {
    const transport = new FakeTransport();
    const auth = new AuthService(transport);

    const promise = auth.login(
      {
        username: 'admin',
        password: 'secret',
      },
      {
        loginMode: 'legacy',
      },
    );

    transport.pushIncoming(encodeSentence(['!done', '=ret=00112233445566778899aabbccddeeff']));
    transport.pushIncoming(encodeSentence(['!done']));

    await expect(promise).resolves.toBeUndefined();
    expect(transport.writes).toHaveLength(2);
  });
});
