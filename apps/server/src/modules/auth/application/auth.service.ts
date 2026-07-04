import { HttpError } from '../../../errors/http-error.js';
import { authRepository } from '../infrastructure/auth.repository.js';
import { sessionRepository } from '../infrastructure/session.repository.js';
import { passwordService } from './password.service.js';
import { sessionTokenService } from './session-token.service.js';
import { tokenService } from './token.service.js';

export class AuthService {
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
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };

    function token() {
      return accessToken;
    }
  }

  public async refresh(refreshToken: string) {
    const session = await sessionRepository.findActiveByTokenHash(sessionTokenService.hash(refreshToken));

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
}

export const authService = new AuthService();
