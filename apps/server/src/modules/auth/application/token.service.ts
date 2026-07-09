import { createHmac } from 'node:crypto';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: string;
  exp: number;
}

function base64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

export class TokenService {
  private readonly secret = process.env.JWT_SECRET ?? process.env.ENCRYPTION_KEY ?? 'dev-secret';

  public sign(payload: Omit<AuthTokenPayload, 'exp'>, expiresInSeconds = 60 * 60 * 8): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const body: AuthTokenPayload = {
      ...payload,
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    };

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedBody = base64url(JSON.stringify(body));
    const signature = this.signature(`${encodedHeader}.${encodedBody}`);

    return `${encodedHeader}.${encodedBody}.${signature}`;
  }

  public verify(token: string): AuthTokenPayload | null {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return null;

    const expected = this.signature(`${header}.${body}`);
    if (expected !== signature) return null;

    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf-8'),
    ) as AuthTokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  }

  private signature(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }
}

export const tokenService = new TokenService();
