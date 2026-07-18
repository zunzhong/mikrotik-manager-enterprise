import { prisma } from '../../../database/index.js';

function normalizeTags(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function normalizeConnectionStatus(status: string): 'online' | 'offline' {
  // "degraded" historically meant that RouterOS was reachable but a health
  // threshold was exceeded. Connectivity is now deliberately binary.
  return status === 'online' || status === 'degraded' ? 'online' : 'offline';
}

function normalizeDevice<T extends { tags: unknown; status: string }>(
  device: T,
): Omit<T, 'tags' | 'status'> & { tags: string[]; status: 'online' | 'offline' } {
  return {
    ...device,
    tags: normalizeTags(device.tags),
    status: normalizeConnectionStatus(device.status),
  };
}

export interface DeviceCreateRecord {
  name: string;
  host: string;
  port: number;
  username: string;
  passwordEncrypted: string;
  useTls: boolean;
  loginMode: string;
  groupId?: string;
  tags: string[];
}

export interface DeviceUpdateRecord {
  name?: string;
  host?: string;
  port?: number;
  username?: string;
  passwordEncrypted?: string;
  useTls?: boolean;
  loginMode?: string;
  groupId?: string | null;
  tags?: string[];
  status?: string;
  lastSeenAt?: Date | null;
  lastError?: string | null;
}

export class DeviceRepository {
  public async create(data: DeviceCreateRecord) {
    return normalizeDevice(await prisma.device.create({ data: { ...data, status: 'offline' } }));
  }

  public async normalizeConnectionStatuses() {
    const [reachable, unreachable] = await prisma.$transaction([
      prisma.device.updateMany({ where: { status: 'degraded' }, data: { status: 'online' } }),
      prisma.device.updateMany({
        where: { status: { notIn: ['online', 'offline', 'degraded'] } },
        data: { status: 'offline' },
      }),
    ]);
    return { reachable: reachable.count, unreachable: unreachable.count };
  }

  public async findMany() {
    return (await prisma.device.findMany({ orderBy: { createdAt: 'desc' } })).map(normalizeDevice);
  }

  public async findById(id: string) {
    const device = await prisma.device.findUnique({ where: { id } });
    return device ? normalizeDevice(device) : null;
  }

  public async update(id: string, data: DeviceUpdateRecord) {
    return normalizeDevice(await prisma.device.update({ where: { id }, data }));
  }

  public async delete(id: string) {
    return prisma.device.delete({ where: { id } });
  }
}

export const deviceRepository = new DeviceRepository();
