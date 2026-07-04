import { prisma } from '../../../database/index.js';

export class MfaRepository {
  public findByUser(userId: string) {
    return prisma.mfaSecret.findUnique({ where: { userId } });
  }

  public upsertPending(userId: string, secretEncrypted: string) {
    return prisma.mfaSecret.upsert({
      where: { userId },
      update: { secretEncrypted, enabled: false, enabledAt: null, disabledAt: null },
      create: { userId, secretEncrypted, enabled: false },
    });
  }

  public enable(userId: string) {
    return prisma.mfaSecret.update({ where: { userId }, data: { enabled: true, enabledAt: new Date(), disabledAt: null } });
  }

  public disable(userId: string) {
    return prisma.mfaSecret.update({ where: { userId }, data: { enabled: false, disabledAt: new Date() } });
  }
}

export const mfaRepository = new MfaRepository();
