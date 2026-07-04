import { prisma } from '../../../database/index.js';

export class SessionRepository {
  public create(input: {
    userId: string;
    refreshTokenHash: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
  }) {
    return prisma.session.create({
      data: {
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
        expiresAt: input.expiresAt,
      },
    });
  }

  public findActiveByTokenHash(refreshTokenHash: string) {
    return prisma.session.findFirst({
      where: {
        refreshTokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  public listByUser(userId: string) {
    return prisma.session.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });
  }

  public touch(id: string) {
    return prisma.session.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }

  public revoke(id: string, userId: string) {
    return prisma.session.updateMany({
      where: { id, userId },
      data: { revokedAt: new Date() },
    });
  }

  public revokeAll(userId: string) {
    return prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export const sessionRepository = new SessionRepository();
