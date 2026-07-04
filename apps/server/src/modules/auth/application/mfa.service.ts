import { HttpError } from '../../../errors/http-error.js';
import { authRepository } from '../infrastructure/auth.repository.js';
import { mfaRepository } from '../infrastructure/mfa.repository.js';
import { totpService } from './totp.service.js';

export class MfaService {
  public async status(userId: string) {
    const mfa = await mfaRepository.findByUser(userId);
    return { configured: Boolean(mfa), enabled: Boolean(mfa?.enabled), enabledAt: mfa?.enabledAt ?? null };
  }

  public async setup(userId: string) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
    const secret = totpService.createSecret();
    await mfaRepository.upsertPending(userId, secret);
    return {
      secret,
      otpauthUrl: totpService.createUri({ secret, email: user.email }),
      currentCode: totpService.code(secret),
      note: 'currentCode is returned only for local development testing.',
    };
  }

  public async enable(userId: string, code: string) {
    const mfa = await mfaRepository.findByUser(userId);
    if (!mfa) throw new HttpError(400, 'MFA_NOT_CONFIGURED', 'MFA setup must be started first');
    if (!totpService.verify(mfa.secretEncrypted, code)) throw new HttpError(400, 'INVALID_MFA_CODE', 'Invalid MFA code');
    return mfaRepository.enable(userId);
  }

  public async disable(userId: string, code: string) {
    const mfa = await mfaRepository.findByUser(userId);
    if (!mfa?.enabled) throw new HttpError(400, 'MFA_NOT_ENABLED', 'MFA is not enabled');
    if (!totpService.verify(mfa.secretEncrypted, code)) throw new HttpError(400, 'INVALID_MFA_CODE', 'Invalid MFA code');
    return mfaRepository.disable(userId);
  }

  public async verifyLogin(userId: string, code?: string) {
    const mfa = await mfaRepository.findByUser(userId);
    if (!mfa?.enabled) return { required: false, verified: true };
    if (!code) return { required: true, verified: false };
    return { required: true, verified: totpService.verify(mfa.secretEncrypted, code) };
  }
}

export const mfaService = new MfaService();
