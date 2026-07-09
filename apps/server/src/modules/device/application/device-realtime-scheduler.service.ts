import { deviceRepository } from '../infrastructure/device.repository.js';
import { deviceRealtimeService, type DeviceRealtimeView } from './device-realtime.service.js';

export interface DeviceRealtimeSchedulerStatus {
  running: boolean;
  intervalMs: number;
  ttlMs: number;
  deviceCount: number;
  inFlight: boolean;
  startedAt?: string;
  stoppedAt?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  lastRunDurationMs?: number;
  lastError?: string;
}

const DEFAULT_INTERVAL_MS = 10000;
const DEFAULT_TTL_MS = 15000;

export class DeviceRealtimeSchedulerService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private inFlight = false;
  private intervalMs = DEFAULT_INTERVAL_MS;
  private ttlMs = DEFAULT_TTL_MS;
  private deviceCount = 0;
  private startedAt: string | undefined;
  private stoppedAt: string | undefined;
  private lastRunAt: string | undefined;
  private nextRunAt: string | undefined;
  private lastRunDurationMs: number | undefined;
  private lastError: string | undefined;

  public status(): DeviceRealtimeSchedulerStatus {
    return {
      running: this.running,
      intervalMs: this.intervalMs,
      ttlMs: this.ttlMs,
      deviceCount: this.deviceCount,
      inFlight: this.inFlight,
      startedAt: this.startedAt,
      stoppedAt: this.stoppedAt,
      lastRunAt: this.lastRunAt,
      nextRunAt: this.nextRunAt,
      lastRunDurationMs: this.lastRunDurationMs,
      lastError: this.lastError,
    };
  }

  public start(input: { intervalMs?: number; ttlMs?: number } = {}): DeviceRealtimeSchedulerStatus {
    this.intervalMs = input.intervalMs ?? this.intervalMs;
    this.ttlMs = input.ttlMs ?? this.ttlMs;

    if (this.timer) {
      return this.status();
    }

    this.running = true;
    this.startedAt = new Date().toISOString();
    this.stoppedAt = undefined;
    this.nextRunAt = new Date(Date.now() + this.intervalMs).toISOString();

    this.timer = setInterval(() => {
      void this.runOnce();
    }, this.intervalMs);

    void this.runOnce();

    return this.status();
  }

  public stop(): DeviceRealtimeSchedulerStatus {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.running = false;
    this.stoppedAt = new Date().toISOString();
    this.nextRunAt = undefined;

    return this.status();
  }

  public async runOnce(): Promise<DeviceRealtimeSchedulerStatus> {
    if (this.inFlight) {
      return this.status();
    }

    const startedAtMs = Date.now();
    this.inFlight = true;
    this.lastRunAt = new Date().toISOString();
    this.lastError = undefined;

    try {
      const devices = await deviceRepository.findMany();
      this.deviceCount = devices.length;

      await Promise.allSettled(
        devices.map((device) =>
          deviceRealtimeService.refreshSnapshot(device.id, {
            ttlMs: this.ttlMs,
            source: 'scheduler',
            pollIntervalMs: this.intervalMs,
          }),
        ),
      );

      this.lastRunDurationMs = Date.now() - startedAtMs;
      this.nextRunAt = this.running
        ? new Date(Date.now() + this.intervalMs).toISOString()
        : undefined;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Realtime scheduler failed';
    } finally {
      this.inFlight = false;
    }

    return this.status();
  }

  public cachedDevices(): DeviceRealtimeView[] {
    return deviceRealtimeService.listCached();
  }
}

export const deviceRealtimeSchedulerService = new DeviceRealtimeSchedulerService();
