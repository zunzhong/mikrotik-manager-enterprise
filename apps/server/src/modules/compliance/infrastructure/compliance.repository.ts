import { Prisma } from '@prisma/client';
import { prisma } from '../../../database/index.js';

export interface CreateComplianceResultInput {
  policyKey: string;
  severity: string;
  status: string;
  message: string;
  evidence?: Record<string, unknown>;
}

export class ComplianceRepository {
  public async latestSnapshot(deviceId: string) {
    return prisma.inventorySnapshot.findFirst({
      where: { deviceId },
      orderBy: { collectedAt: 'desc' },
      include: {
        sections: {
          include: {
            items: true,
          },
        },
      },
    });
  }

  public async createReport(input: {
    deviceId: string;
    snapshotId?: string;
    status: string;
    score: number;
    summary: Record<string, unknown>;
    results: CreateComplianceResultInput[];
  }) {
    return prisma.complianceReport.create({
      data: {
        deviceId: input.deviceId,
        snapshotId: input.snapshotId,
        status: input.status,
        score: input.score,
        summary: input.summary as Prisma.InputJsonValue,
        results: {
          create: input.results.map((result) => ({
            policyKey: result.policyKey,
            severity: result.severity,
            status: result.status,
            message: result.message,
            evidence:
              result.evidence === undefined
                ? Prisma.JsonNull
                : (result.evidence as Prisma.InputJsonValue),
          })),
        },
      },
      include: {
        results: true,
      },
    });
  }

  public async listReports(deviceId: string) {
    return prisma.complianceReport.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
      include: {
        results: true,
      },
    });
  }
}

export const complianceRepository = new ComplianceRepository();
