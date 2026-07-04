import { HttpError } from '../../../errors/http-error.js';
import { authRepository } from '../infrastructure/auth.repository.js';
import { passwordService } from './password.service.js';
import { tokenService } from './token.service.js';

export class AuthService {
  public async login(email: string, password: string) {
    const user = await authRepository.findUserByEmail(email);

    if (!user || !user.isActive || !passwordService.verify(password, user.passwordHash)) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const token = tokenService.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  public logout() {
    return {
      ok: true,
      message: 'Client should remove token locally.',
    };
  }
}

export const authService = new AuthService();
