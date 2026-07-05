export interface CounterSample {
  rxBytes: number;
  txBytes: number;
  rxPackets?: number;
  txPackets?: number;
  sampledAt: Date;
}

export interface CalculatedRate {
  rxBps: number;
  txBps: number;
  rxPps: number;
  txPps: number;
  intervalMs: number;
}

export function calculateRate(previous: CounterSample, current: CounterSample): CalculatedRate {
  const intervalMs = Math.max(1, current.sampledAt.getTime() - previous.sampledAt.getTime());
  const seconds = intervalMs / 1000;

  return {
    rxBps: Math.max(0, ((current.rxBytes - previous.rxBytes) * 8) / seconds),
    txBps: Math.max(0, ((current.txBytes - previous.txBytes) * 8) / seconds),
    rxPps: Math.max(0, ((current.rxPackets ?? 0) - (previous.rxPackets ?? 0)) / seconds),
    txPps: Math.max(0, ((current.txPackets ?? 0) - (previous.txPackets ?? 0)) / seconds),
    intervalMs,
  };
}

export function parseRouterOsNumber(value: string | undefined): number {
  if (!value) return 0;
  const normalized = value.replace(/[^0-9.]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
