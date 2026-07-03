import { prisma } from '../../../database/index.js';

export class DashboardService {
  public async summary() {
    const [
      totalDevices,
      onlineDevices,
      offlineDevices,
      openAlerts,
      criticalAlerts,
      latestCompliance,
      snapshots,
    ] = await Promise.all([
      prisma.device.count(),
      prisma.device.count({ where: { status: 'online' } }),
      prisma.device.count({ where: { status: 'offline' } }),
      prisma.alert.count({ where: { status: 'open' } }),
      prisma.alert.count({ where: { status: 'open', severity: 'critical' } }),
      prisma.complianceReport.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { score: true },
      }),
      prisma.inventorySnapshot.count(),
    ]);

    const averageCompliance =
      latestCompliance.length === 0
        ? 0
        : Math.round(
            latestCompliance.reduce((sum, report) => sum + report.score, 0) /
              latestCompliance.length,
          );

    return {
      devices: {
        total: totalDevices,
        online: onlineDevices,
        offline: offlineDevices,
        unknown: Math.max(totalDevices - onlineDevices - offlineDevices, 0),
      },
      alerts: {
        open: openAlerts,
        critical: criticalAlerts,
      },
      compliance: {
        averageScore: averageCompliance,
      },
      inventory: {
        snapshots,
      },
    };
  }

  public async deviceSummary() {
    const statuses = await prisma.device.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    const recentDevices = await prisma.device.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        host: true,
        status: true,
        lastSeenAt: true,
        lastError: true,
        updatedAt: true,
      },
    });

    return {
      byStatus: statuses.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      recent: recentDevices,
    };
  }

  public async alertSummary() {
    const bySeverity = await prisma.alert.groupBy({
      by: ['severity'],
      where: { status: 'open' },
      _count: {
        severity: true,
      },
    });

    const recent = await prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      bySeverity: bySeverity.map((item) => ({
        severity: item.severity,
        count: item._count.severity,
      })),
      recent,
    };
  }

  public async complianceSummary() {
    const recent = await prisma.complianceReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        device: {
          select: {
            id: true,
            name: true,
            host: true,
          },
        },
      },
    });

    const failed = recent.filter((item) => item.status === 'failed').length;
    const passed = recent.filter((item) => item.status === 'passed').length;

    return {
      recent,
      totals: {
        recent: recent.length,
        passed,
        failed,
      },
    };
  }

  public async inventorySummary() {
    const [snapshots, sections, items, diffs] = await Promise.all([
      prisma.inventorySnapshot.count(),
      prisma.inventorySection.count(),
      prisma.inventoryItem.count(),
      prisma.inventoryDiff.count(),
    ]);

    const recentSnapshots = await prisma.inventorySnapshot.findMany({
      orderBy: { collectedAt: 'desc' },
      take: 10,
      include: {
        device: {
          select: {
            id: true,
            name: true,
            host: true,
          },
        },
      },
    });

    return {
      totals: {
        snapshots,
        sections,
        items,
        diffs,
      },
      recentSnapshots,
    };
  }

  public async activity() {
    const [auditLogs, alerts] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.alert.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const activities = [
      ...auditLogs.map((item) => ({
        id: item.id,
        type: 'audit',
        title: item.action,
        entity: item.entity,
        entityId: item.entityId,
        createdAt: item.createdAt,
        data: item.metadata,
      })),
      ...alerts.map((item) => ({
        id: item.id,
        type: 'alert',
        title: item.title,
        entity: 'alert',
        entityId: item.id,
        createdAt: item.createdAt,
        data: item.metadata,
      })),
    ];

    return activities
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 30);
  }
}

export const dashboardService = new DashboardService();
