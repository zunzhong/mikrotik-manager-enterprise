import { deviceRepository } from '../../device/infrastructure/device.repository.js';
import { inventoryCollectorService } from './inventory-collector.service.js';
import { topologyService } from '../../topology/application/topology.service.js';

const INVENTORY_INTERVAL_MS = 30 * 60 * 1000;

export interface InventorySchedulerStatus {
  running: boolean;
  intervalMs: number;
  inFlight: boolean;
  deviceCount: number;
  lastRunAt?: string;
  nextRunAt?: string;
  lastError?: string;
}

export class InventorySchedulerService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private inFlight = false;
  private deviceCount = 0;
  private lastRunAt: string | undefined;
  private nextRunAt: string | undefined;
  private lastError: string | undefined;
  private readonly deviceJobs = new Set<string>();
  private onError: (error: unknown) => void = () => undefined;

  public start(onError?: (error: unknown) => void): InventorySchedulerStatus {
    if (onError) this.onError = onError;
    if (this.timer) return this.status();
    this.timer = setInterval(() => void this.runOnce(), INVENTORY_INTERVAL_MS);
    this.nextRunAt = new Date(Date.now() + INVENTORY_INTERVAL_MS).toISOString();
    void this.runOnce();
    return this.status();
  }

  public stop(): InventorySchedulerStatus {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.nextRunAt = undefined;
    return this.status();
  }

  public status(): InventorySchedulerStatus {
    return {
      running: this.timer !== null,
      intervalMs: INVENTORY_INTERVAL_MS,
      inFlight: this.inFlight,
      deviceCount: this.deviceCount,
      lastRunAt: this.lastRunAt,
      nextRunAt: this.nextRunAt,
      lastError: this.lastError,
    };
  }

  public async runOnce(source: 'scheduler' | 'topology' = 'scheduler') {
    if (this.inFlight) return this.status();
    this.inFlight = true;
    this.lastRunAt = new Date().toISOString();
    this.lastError = undefined;

    try {
      const devices = await deviceRepository.findMany();
      this.deviceCount = devices.length;
      const results = await Promise.allSettled(
        devices.map((device) => inventoryCollectorService.collect(device.id, source)),
      );
      const rejected = results.filter((result) => result.status === 'rejected');
      if (rejected.length > 0) this.lastError = `${rejected.length} inventory job(s) failed`;
      await topologyService.capture();
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Inventory scheduler failed';
      this.onError(error);
    } finally {
      this.inFlight = false;
      this.nextRunAt = this.timer
        ? new Date(Date.now() + INVENTORY_INTERVAL_MS).toISOString()
        : undefined;
    }

    return this.status();
  }

  public async runDevice(deviceId: string, source: 'topology' = 'topology') {
    if (this.deviceJobs.has(deviceId)) {
      return { skipped: true, reason: 'already-running' as const };
    }

    this.deviceJobs.add(deviceId);
    try {
      const result = await inventoryCollectorService.collect(deviceId, source);
      await topologyService.capture();
      await topologyService.capture(deviceId);
      this.lastRunAt = new Date().toISOString();
      this.lastError = result.error;
      return { skipped: false, result };
    } finally {
      this.deviceJobs.delete(deviceId);
    }
  }
}

export const inventorySchedulerService = new InventorySchedulerService();
