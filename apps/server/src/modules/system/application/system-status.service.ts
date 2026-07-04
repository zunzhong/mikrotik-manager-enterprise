import { prisma } from '../../../database/index.js';

export class SystemStatusService {
  public live() {
    return {
      status: 'live',
      service: 'mikrotik-manager-enterprise',
      timestamp: new Date().toISOString(),
    };
  }

  public async ready() {
    const checks = await this.checks();
    const ready = checks.every((check) => check.status === 'ok');

    return {
      status: ready ? 'ready' : 'not_ready',
      ready,
      checks,
      timestamp: new Date().toISOString(),
    };
  }

  public version() {
    return {
      name: 'mikrotik-manager-enterprise',
      version: process.env.npm_package_version ?? '0.1.0',
      node: process.version,
      environment: process.env.NODE_ENV ?? 'development',
    };
  }

  public async status() {
    const [checks, deviceCount, alertCount, snapshotCount] = await Promise.all([
      this.checks(),
      prisma.device.count(),
      prisma.alert.count({ where: { status: 'open' } }),
      prisma.inventorySnapshot.count(),
    ]);

    return {
      service: this.version(),
      health: {
        live: true,
        ready: checks.every((check) => check.status === 'ok'),
        checks,
      },
      metrics: {
        devices: deviceCount,
        openAlerts: alertCount,
        inventorySnapshots: snapshotCount,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async checks() {
    const checks = [];

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.push({
        name: 'database',
        status: 'ok',
      });
    } catch (error) {
      checks.push({
        name: 'database',
        status: 'error',
        message: error instanceof Error ? error.message : 'Database check failed',
      });
    }

    checks.push({
      name: 'runtime',
      status: 'ok',
      message: process.version,
    });

    return checks;
  }
}

export const systemStatusService = new SystemStatusService();
