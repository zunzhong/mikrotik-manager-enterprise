import { prisma } from '../../../database/index.js';

export class AlertEvaluationRepository {
  public async listDevices(deviceId?: string) {
    return prisma.device.findMany({
      where: deviceId ? { id: deviceId } : undefined,
      select: {
        id: true,
        name: true,
        host: true,
        status: true,
        updatedAt: true,
      },
    });
  }

  public async latestSnapshot(deviceId: string) {
    return prisma.inventorySnapshot.findFirst({
      where: { deviceId },
      orderBy: { collectedAt: 'desc' },
      select: {
        id: true,
        collectedAt: true,
        status: true,
        summary: true,
      },
    });
  }

  public async latestComplianceReport(deviceId: string) {
    return prisma.complianceReport.findFirst({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        score: true,
        createdAt: true,
        summary: true,
      },
    });
  }

  public async latestCompletedBackup(deviceId: string) {
    return prisma.backupRecord.findFirst({
      where: {
        deviceId,
        status: 'completed',
      },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        fileName: true,
        completedAt: true,
      },
    });
  }
}

export const alertEvaluationRepository = new AlertEvaluationRepository();
