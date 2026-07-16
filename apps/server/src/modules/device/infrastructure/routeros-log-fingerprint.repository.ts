import { prisma } from '../../../database/index.js';

const BASELINE_FINGERPRINT = '__mme_routeros_log_baseline_v1__';

export interface RouterOsLogFingerprintInput {
  deviceId: string;
  fingerprint: string;
  logTime?: string;
  topics?: string;
  message?: string;
}

export class RouterOsLogFingerprintRepository {
  public async isInitialized(deviceId: string): Promise<boolean> {
    return Boolean(
      await prisma.routerOsLogFingerprint.findUnique({
        where: { deviceId_fingerprint: { deviceId, fingerprint: BASELINE_FINGERPRINT } },
        select: { id: true },
      }),
    );
  }

  public async markInitialized(deviceId: string): Promise<void> {
    await prisma.routerOsLogFingerprint.upsert({
      where: { deviceId_fingerprint: { deviceId, fingerprint: BASELINE_FINGERPRINT } },
      create: { deviceId, fingerprint: BASELINE_FINGERPRINT },
      update: {},
    });
  }

  public async exists(deviceId: string, fingerprint: string): Promise<boolean> {
    return Boolean(
      await prisma.routerOsLogFingerprint.findUnique({
        where: { deviceId_fingerprint: { deviceId, fingerprint } },
        select: { id: true },
      }),
    );
  }

  public async remember(input: RouterOsLogFingerprintInput): Promise<boolean> {
    try {
      await prisma.routerOsLogFingerprint.create({ data: input });
      return true;
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
        return false;
      }
      throw error;
    }
  }

  public async prune(deviceId: string, keep = 5000): Promise<void> {
    const stale = await prisma.routerOsLogFingerprint.findMany({
      where: { deviceId, fingerprint: { not: BASELINE_FINGERPRINT } },
      orderBy: { firstSeenAt: 'desc' },
      skip: keep,
      select: { id: true },
    });
    if (stale.length > 0) {
      await prisma.routerOsLogFingerprint.deleteMany({
        where: { id: { in: stale.map((item) => item.id) } },
      });
    }
  }
}

export const routerOsLogFingerprintRepository = new RouterOsLogFingerprintRepository();
