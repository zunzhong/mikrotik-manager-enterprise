import { prisma } from '../../../database/index.js';

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
}

export class DeviceRepository {
  public async create(data: DeviceCreateRecord) {
    return prisma.device.create({ data });
  }

  public async findMany() {
    return prisma.device.findMany({ orderBy: { createdAt: 'desc' } });
  }

  public async findById(id: string) {
    return prisma.device.findUnique({ where: { id } });
  }

  public async update(id: string, data: DeviceUpdateRecord) {
    return prisma.device.update({ where: { id }, data });
  }

  public async delete(id: string) {
    return prisma.device.delete({ where: { id } });
  }
}

export const deviceRepository = new DeviceRepository();
