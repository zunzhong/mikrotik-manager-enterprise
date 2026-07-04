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

  public updatePassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  public createPasswordResetToken(input: { userId: string; tokenHash: string; expiresAt: Date }) {
    return prisma.passwordResetToken.create({
      data: input,
    });
  }

  public findPasswordResetToken(tokenHash: string) {
    return prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  public markPasswordResetTokenUsed(id: string) {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }
}

export const authRepository = new AuthRepository();
