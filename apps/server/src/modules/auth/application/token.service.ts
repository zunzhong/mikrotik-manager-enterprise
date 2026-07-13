import { createHmac, timingSafeEqual } from 'node:crypto';

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
  private readonly secret: string;

  public constructor(secret?: string) {
    this.secret = secret ?? process.env.JWT_SECRET ?? process.env.ENCRYPTION_KEY ?? 'dev-secret';

    if (process.env.NODE_ENV === 'production' && this.secret === 'dev-secret') {
      throw new Error('JWT_SECRET must be configured in production.');
    }
  }

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
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [header, body, signature] = parts;
      if (!header || !body || !signature) return null;

      const decodedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf-8')) as {
        alg?: string;
        typ?: string;
      };
      if (decodedHeader.alg !== 'HS256' || decodedHeader.typ !== 'JWT') return null;

      const expected = this.signature(`${header}.${body}`);
      const actualBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expected);
      if (
        actualBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(actualBuffer, expectedBuffer)
      )
        return null;

      const payload = JSON.parse(
        Buffer.from(body, 'base64url').toString('utf-8'),
      ) as AuthTokenPayload;
      if (!payload.userId || !payload.email || !payload.role || !Number.isFinite(payload.exp)) {
        return null;
      }
      if (payload.exp < Math.floor(Date.now() / 1000)) return null;

      return payload;
    } catch {
      return null;
    }
  }

  private signature(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }
}

export const tokenService = new TokenService();
