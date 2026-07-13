import { createHash, randomBytes } from 'node:crypto';
import { HttpError } from '../../../errors/http-error.js';
import { authRepository } from '../infrastructure/auth.repository.js';
import { sessionRepository } from '../infrastructure/session.repository.js';
import { passwordPolicyService } from './password-policy.service.js';
import { passwordService } from './password.service.js';
import { sessionTokenService } from './session-token.service.js';
import { tokenService } from './token.service.js';

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class AuthService {
  public async profile(userId: string) {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new HttpError(404, 'USER_NOT_FOUND', 'User not found');
    }

    return { ...user, passwordConfigured: await authRepository.hasPassword(userId) };
  }

  public async updateProfile(userId: string, input: { email?: string; name?: string | null }) {
    const email = input.email?.trim().toLowerCase();
    if (email) {
      const existing = await authRepository.findUserByEmail(email);
      if (existing && existing.id !== userId) {
        throw new HttpError(409, 'EMAIL_ALREADY_EXISTS', 'Email is already in use');
      }
    }

    return authRepository.updateProfile(userId, {
      email,
      name: input.name === undefined ? undefined : input.name?.trim() || null,
    });
  }

  public async login(input: {
    email: string;
    password: string;
    rememberMe?: boolean;
    userAgent?: string;
    ipAddress?: string;
  }) {
    const user = await authRepository.findUserByEmail(input.email);

    if (!user || !user.isActive || !passwordService.verify(input.password, user.passwordHash)) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const accessToken = tokenService.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = sessionTokenService.createRefreshToken();

    await sessionRepository.create({
      userId: user.id,
      refreshTokenHash: sessionTokenService.hash(refreshToken),
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      expiresAt: sessionTokenService.expiresAt(input.rememberMe),
    });

    return {
      accessToken,
      refreshToken,
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  public async refresh(refreshToken: string) {
    const session = await sessionRepository.findActiveByTokenHash(
      sessionTokenService.hash(refreshToken),
    );

    if (!session || !session.user.isActive) {
      throw new HttpError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
    }

    await sessionRepository.touch(session.id);

    return {
      accessToken: tokenService.sign({
        userId: session.user.id,
        email: session.user.email,
        role: session.user.role,
      }),
    };
  }

  public sessions(userId: string) {
    return sessionRepository.listByUser(userId);
  }

  public revokeSession(userId: string, sessionId: string) {
    return sessionRepository.revoke(sessionId, userId);
  }

  public logoutAll(userId: string) {
    return sessionRepository.revokeAll(userId);
  }

  public logout() {
    return { ok: true, message: 'Client should remove tokens locally.' };
  }

  public async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await authRepository.findUserById(userId);
    const fullUser = user ? await authRepository.findUserByEmail(user.email) : null;

    if (!fullUser || !passwordService.verify(currentPassword, fullUser.passwordHash)) {
      throw new HttpError(401, 'INVALID_CURRENT_PASSWORD', 'Current password is invalid');
    }

    const policy = passwordPolicyService.validate(newPassword);
    if (!policy.valid) {
      throw new HttpError(400, 'PASSWORD_POLICY_FAILED', policy.errors.join(' '));
    }

    await authRepository.updatePassword(userId, passwordService.hash(newPassword));
    await sessionRepository.revokeAll(userId);

    return { changed: true };
  }

  public async requestPasswordReset(email: string) {
    const user = await authRepository.findUserByEmail(email);

    if (!user || !user.isActive) {
      return { requested: true };
    }

    const token = randomBytes(32).toString('base64url');

    await authRepository.createPasswordResetToken({
      userId: user.id,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    return {
      requested: true,
      resetToken: token,
      note: 'Development mode returns token directly. Email delivery will be added later.',
    };
  }

  public async confirmPasswordReset(token: string, newPassword: string) {
    const policy = passwordPolicyService.validate(newPassword);
    if (!policy.valid) {
      throw new HttpError(400, 'PASSWORD_POLICY_FAILED', policy.errors.join(' '));
    }

    const reset = await authRepository.findPasswordResetToken(hashResetToken(token));

    if (!reset || !reset.user.isActive) {
      throw new HttpError(400, 'INVALID_RESET_TOKEN', 'Invalid or expired reset token');
    }

    await authRepository.updatePassword(reset.userId, passwordService.hash(newPassword));
    await authRepository.markPasswordResetTokenUsed(reset.id);
    await sessionRepository.revokeAll(reset.userId);

    return { reset: true };
  }
}

export const authService = new AuthService();
