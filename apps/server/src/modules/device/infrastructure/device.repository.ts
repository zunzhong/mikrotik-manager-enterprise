import { prisma } from '../../../database/index.js';

function normalizeTags(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function normalizeDevice<T extends { tags: unknown }>(
  device: T,
): Omit<T, 'tags'> & { tags: string[] } {
  return { ...device, tags: normalizeTags(device.tags) };
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
    return normalizeDevice(await prisma.device.create({ data }));
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
