import { randomUUID } from 'node:crypto';
import { prisma } from '../../database/index.js';
import type {
  ReceivedSyslogMessage,
  SyslogListQuery,
  SyslogReceiverSettings,
} from './syslog.types.js';

export interface SyslogDeviceIdentity {
  id: string;
  name: string;
  host: string;
  aliases: string[];
}

export interface StoredSyslogInput extends ReceivedSyslogMessage {
  deviceId: string | null;
}

export class SyslogRepository {
  public async ensureSettings(defaults: SyslogReceiverSettings) {
    return prisma.syslogSetting.upsert({
      where: { id: 'global' },
      update: {},
      create: { id: 'global', ...defaults },
    });
  }

  public settings() {
    return prisma.syslogSetting.findUnique({ where: { id: 'global' } });
  }

  public saveSettings(settings: SyslogReceiverSettings) {
    return prisma.syslogSetting.upsert({
      where: { id: 'global' },
      update: settings,
      create: { id: 'global', ...settings },
    });
  }

  public async deviceIdentities(): Promise<SyslogDeviceIdentity[]> {
    const devices = await prisma.device.findMany({
      select: {
        id: true,
        name: true,
        host: true,
        syslogAliases: { select: { alias: true } },
      },
    });
    return devices.map((device) => ({
      id: device.id,
      name: device.name,
      host: device.host,
      aliases: device.syslogAliases.map((item) => item.alias),
    }));
  }

  public async insertMany(messages: StoredSyslogInput[]): Promise<number> {
    if (messages.length === 0) return 0;
    const result = await prisma.syslogMessage.createMany({
      data: messages.map((message) => ({
        id: randomUUID(),
        deviceId: message.deviceId,
        receivedAt: message.receivedAt,
        eventTime: message.eventTime,
        sourceAddress: message.sourceAddress,
        sourcePort: message.sourcePort,
        protocol: message.protocol,
        hostname: message.hostname,
        appName: message.appName,
        processId: message.processId,
        messageId: message.messageId,
        facility: message.facility,
        facilityLabel: message.facilityLabel,
        severity: message.severity,
        severityLabel: message.severityLabel,
        priority: message.priority,
        tag: message.tag,
        message: message.message,
        rawMessage: message.rawMessage,
        structuredData: message.structuredData ?? undefined,
      })),
    });
    return result.count;
  }

  public async list(query: SyslogListQuery) {
    const where = {
      ...(query.deviceId === 'unmatched'
        ? { deviceId: null }
        : query.deviceId
          ? { deviceId: query.deviceId }
          : {}),
      ...(query.severity === undefined ? {} : { severity: query.severity }),
      ...(query.facility === undefined ? {} : { facility: query.facility }),
      ...(query.protocol ? { protocol: query.protocol } : {}),
      ...(query.from || query.to
        ? {
            receivedAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { message: { contains: query.search } },
              { rawMessage: { contains: query.search } },
              { hostname: { contains: query.search } },
              { sourceAddress: { contains: query.search } },
              { appName: { contains: query.search } },
            ],
          }
        : {}),
    };
    const [total, items] = await prisma.$transaction([
      prisma.syslogMessage.count({ where }),
      prisma.syslogMessage.findMany({
        where,
        include: { device: { select: { id: true, name: true, host: true } } },
        orderBy: { receivedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      pages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  public async overview() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [total, last24Hours, unmatched, bySeverity, latest, devices, aliases] =
      await prisma.$transaction([
        prisma.syslogMessage.count(),
        prisma.syslogMessage.count({ where: { receivedAt: { gte: since } } }),
        prisma.syslogMessage.count({ where: { deviceId: null } }),
        prisma.syslogMessage.groupBy({
          by: ['severity', 'severityLabel'],
          where: { receivedAt: { gte: since } },
          _count: { id: true },
          orderBy: { severity: 'asc' },
        }),
        prisma.syslogMessage.findFirst({ orderBy: { receivedAt: 'desc' } }),
        prisma.device.findMany({
          select: { id: true, name: true, host: true, status: true },
          orderBy: { name: 'asc' },
        }),
        prisma.syslogSourceAlias.findMany({
          include: { device: { select: { id: true, name: true } } },
          orderBy: { alias: 'asc' },
        }),
      ]);
    return {
      total,
      last24Hours,
      unmatched,
      bySeverity: (
        bySeverity as unknown as Array<{
          severity: number;
          severityLabel: string;
          _count: { id: number };
        }>
      ).map((item) => ({
        severity: item.severity,
        label: item.severityLabel,
        count: item._count.id,
      })),
      lastMessageAt: latest?.receivedAt.toISOString() ?? null,
      devices,
      aliases,
    };
  }

  public saveAlias(alias: string, aliasNormalized: string, deviceId: string) {
    return prisma.syslogSourceAlias.upsert({
      where: { aliasNormalized },
      update: { alias, deviceId },
      create: { alias, aliasNormalized, deviceId },
      include: { device: { select: { id: true, name: true } } },
    });
  }

  public async deleteAlias(id: string) {
    await prisma.syslogSourceAlias.delete({ where: { id } });
    return { id, deleted: true };
  }

  public async purge(retentionDays: number, maxRecords: number) {
    const cutoff = new Date(Date.now() - retentionDays * 86400_000);
    const expired = await prisma.syslogMessage.deleteMany({
      where: { receivedAt: { lt: cutoff } },
    });
    let overflowDeleted = 0;
    while (true) {
      const overflow = await prisma.syslogMessage.findMany({
        orderBy: { receivedAt: 'desc' },
        skip: maxRecords,
        take: 5000,
        select: { id: true },
      });
      if (overflow.length === 0) break;
      const deleted = await prisma.syslogMessage.deleteMany({
        where: { id: { in: overflow.map((item) => item.id) } },
      });
      overflowDeleted += deleted.count;
      if (overflow.length < 5000) break;
    }
    return {
      expired: expired.count,
      overflow: overflowDeleted,
      total: expired.count + overflowDeleted,
      cutoff: cutoff.toISOString(),
    };
  }

  public async clearAll() {
    const result = await prisma.syslogMessage.deleteMany();
    return { deleted: result.count };
  }
}

export const syslogRepository = new SyslogRepository();
