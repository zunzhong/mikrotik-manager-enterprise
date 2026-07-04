import { prisma } from '../../../database/index.js';

export class AuthRepository {
  public findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  public findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

export const authRepository = new AuthRepository();
