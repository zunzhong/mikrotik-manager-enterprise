import { createHash, randomBytes } from 'node:crypto';

export class SessionTokenService {
  public createRefreshToken(): string {
    return randomBytes(48).toString('base64url');
  }

  public hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  public expiresAt(rememberMe = false): Date {
    const days = rememberMe ? 30 : 7;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}

export const sessionTokenService = new SessionTokenService();
