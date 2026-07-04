import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export class PasswordService {
  public hash(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const hash = this.digest(password, salt);
    return `${salt}:${hash}`;
  }

  public verify(password: string, stored?: string | null): boolean {
    if (!stored) return false;

    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;

    const candidate = this.digest(password, salt);
    return timingSafeEqual(Buffer.from(candidate), Buffer.from(hash));
  }

  private digest(password: string, salt: string): string {
    return createHash('sha256').update(`${salt}:${password}`).digest('hex');
  }
}

export const passwordService = new PasswordService();
