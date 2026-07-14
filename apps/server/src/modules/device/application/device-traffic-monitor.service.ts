import { prisma } from '../../../database/index.js';

export type TrafficPeriod = 'hour' | 'day' | 'month' | 'year';

interface PreviousCounter {
  at: number;
  rx: bigint;
  tx: bigint;
}

interface TrafficBucket {
  key: string;
  label: string;
  from: string;
  rxBytes: number;
  txBytes: number;
  totalBytes: number;
}

function bigIntValue(value: unknown): bigint {
  try {
    return BigInt(String(value ?? 0));
  } catch {
    return 0n;
  }
}

function runningValue(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  return String(value ?? '').toLowerCase() === 'true';
}

function periodBounds(period: TrafficPeriod, anchorText?: string) {
  const anchor = anchorText ? new Date(`${anchorText}T12:00:00.000Z`) : new Date();
  const safeAnchor = Number.isNaN(anchor.getTime()) ? new Date() : anchor;
  let from: Date;
  let to: Date;

  if (period === 'hour') {
    from = new Date(
      Date.UTC(safeAnchor.getUTCFullYear(), safeAnchor.getUTCMonth(), safeAnchor.getUTCDate()),
    );
    to = new Date(from);
    to.setUTCDate(to.getUTCDate() + 1);
  } else if (period === 'day') {
    from = new Date(Date.UTC(safeAnchor.getUTCFullYear(), safeAnchor.getUTCMonth(), 1));
    to = new Date(Date.UTC(safeAnchor.getUTCFullYear(), safeAnchor.getUTCMonth() + 1, 1));
  } else if (period === 'month') {
    from = new Date(Date.UTC(safeAnchor.getUTCFullYear(), 0, 1));
    to = new Date(Date.UTC(safeAnchor.getUTCFullYear() + 1, 0, 1));
  } else {
    from = new Date(Date.UTC(safeAnchor.getUTCFullYear() - 4, 0, 1));
    to = new Date(Date.UTC(safeAnchor.getUTCFullYear() + 1, 0, 1));
  }

  return { from, to };
}

function bucketIdentity(date: Date, period: TrafficPeriod): { key: string; label: string } {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  if (period === 'hour') {
    return { key: `${year}-${month}-${day}-${hour}`, label: `${String(hour).padStart(2, '0')}:00` };
  }
  if (period === 'day') {
    return {
      key: `${year}-${month}-${day}`,
      label: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
    };
  }
  if (period === 'month') {
    return { key: `${year}-${month}`, label: `${String(month).padStart(2, '0')}/${year}` };
  }
  return { key: String(year), label: String(year) };
}

function advance(date: Date, period: TrafficPeriod): Date {
  const next = new Date(date);
  if (period === 'hour') next.setUTCHours(next.getUTCHours() + 1);
  else if (period === 'day') next.setUTCDate(next.getUTCDate() + 1);
  else if (period === 'month') next.setUTCMonth(next.getUTCMonth() + 1);
  else next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next;
}

export class DeviceTrafficMonitorService {
  private readonly previous = new Map<string, PreviousCounter>();

  public async record(deviceId: string, interfaces: object[], collectedAt: string): Promise<void> {
    const at = new Date(collectedAt);
    const atMs = at.getTime();
    if (Number.isNaN(atMs)) return;

    const rows = interfaces.map((raw, index) => {
      const item = raw as Record<string, unknown>;
      const interfaceName = String(item.name ?? `interface-${index + 1}`);
      const rx = bigIntValue(item['rx-byte'] ?? item.rxByte);
      const tx = bigIntValue(item['tx-byte'] ?? item.txByte);
      const cacheKey = `${deviceId}:${interfaceName}`;
      const old = this.previous.get(cacheKey);
      const elapsedSeconds = old ? Math.max(0.001, (atMs - old.at) / 1000) : 0;
      const rxDelta = old && rx >= old.rx ? rx - old.rx : 0n;
      const txDelta = old && tx >= old.tx ? tx - old.tx : 0n;
      this.previous.set(cacheKey, { at: atMs, rx, tx });

      return {
        deviceId,
        interfaceName,
        collectedAt: at,
        rxBytes: rx,
        txBytes: tx,
        rxDeltaBytes: rxDelta,
        txDeltaBytes: txDelta,
        rxBps: elapsedSeconds > 0 ? (Number(rxDelta) * 8) / elapsedSeconds : 0,
        txBps: elapsedSeconds > 0 ? (Number(txDelta) * 8) / elapsedSeconds : 0,
        running: runningValue(item.running),
      };
    });

    if (rows.length > 0) await prisma.trafficSample.createMany({ data: rows });
  }

  public async history(input: {
    deviceId: string;
    period: TrafficPeriod;
    interfaceName?: string;
    anchor?: string;
  }) {
    const { from, to } = periodBounds(input.period, input.anchor);
    const where = {
      deviceId: input.deviceId,
      collectedAt: { gte: from, lt: to },
      ...(input.interfaceName && input.interfaceName !== 'all'
        ? { interfaceName: input.interfaceName }
        : {}),
    };
    const samples = await prisma.trafficSample.findMany({ where, orderBy: { collectedAt: 'asc' } });
    const names = await prisma.trafficSample.findMany({
      where: { deviceId: input.deviceId },
      distinct: ['interfaceName'],
      select: { interfaceName: true },
      orderBy: { interfaceName: 'asc' },
    });

    const buckets = new Map<string, TrafficBucket>();
    for (let cursor = new Date(from); cursor < to; cursor = advance(cursor, input.period)) {
      const identity = bucketIdentity(cursor, input.period);
      buckets.set(identity.key, {
        ...identity,
        from: cursor.toISOString(),
        rxBytes: 0,
        txBytes: 0,
        totalBytes: 0,
      });
    }

    for (const sample of samples) {
      const identity = bucketIdentity(sample.collectedAt, input.period);
      const bucket = buckets.get(identity.key);
      if (!bucket) continue;
      bucket.rxBytes += Number(sample.rxDeltaBytes);
      bucket.txBytes += Number(sample.txDeltaBytes);
      bucket.totalBytes = bucket.rxBytes + bucket.txBytes;
    }

    const latestByInterface = new Map<string, (typeof samples)[number]>();
    for (const sample of samples) latestByInterface.set(sample.interfaceName, sample);
    const currentSamples = [...latestByInterface.values()];
    const latest = currentSamples.sort(
      (left, right) => right.collectedAt.getTime() - left.collectedAt.getTime(),
    )[0];
    return {
      deviceId: input.deviceId,
      period: input.period,
      interfaceName: input.interfaceName ?? 'all',
      from: from.toISOString(),
      to: to.toISOString(),
      interfaces: names.map((item) => item.interfaceName),
      current: latest
        ? {
            interfaceName: input.interfaceName ?? 'all',
            rxBps: currentSamples.reduce((total, sample) => total + sample.rxBps, 0),
            txBps: currentSamples.reduce((total, sample) => total + sample.txBps, 0),
            running: currentSamples.some((sample) => sample.running),
            collectedAt: latest.collectedAt.toISOString(),
          }
        : null,
      totals: [...buckets.values()].reduce(
        (total, bucket) => ({
          rxBytes: total.rxBytes + bucket.rxBytes,
          txBytes: total.txBytes + bucket.txBytes,
          totalBytes: total.totalBytes + bucket.totalBytes,
        }),
        { rxBytes: 0, txBytes: 0, totalBytes: 0 },
      ),
      buckets: [...buckets.values()],
    };
  }
}

export const deviceTrafficMonitorService = new DeviceTrafficMonitorService();
