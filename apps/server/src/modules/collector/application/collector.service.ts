import { eventBus, jobQueue } from '../../../core/index.js';
import { inventoryCollectorService } from '../../inventory/application/inventory-collector.service.js';
import { collectorPlans } from '../domain/collector-plan.js';

export interface InventoryCollectorJobPayload {
  deviceId: string;
  mode: 'full' | 'quick';
}

/**
 * CollectorService
 *
 * Coordinates enterprise data collection through the core job queue.
 */
export class CollectorService {
  public listPlans() {
    return collectorPlans;
  }

  public registerHandlers(): void {
    jobQueue.registerHandler<InventoryCollectorJobPayload>(
      'collector.inventory.full',
      async (job) => {
        await eventBus.emit('collector.inventory.started', job.payload);
        const result = await inventoryCollectorService.collect(job.payload.deviceId);
        await eventBus.emit('collector.inventory.completed', result);
      },
    );

    jobQueue.registerHandler<InventoryCollectorJobPayload>(
      'collector.inventory.quick',
      async (job) => {
        await eventBus.emit('collector.inventory.started', job.payload);
        const result = await inventoryCollectorService.collect(job.payload.deviceId);
        await eventBus.emit('collector.inventory.completed', result);
      },
    );
  }

  public async enqueueInventory(deviceId: string, mode: 'full' | 'quick' = 'full') {
    const jobType = mode === 'quick' ? 'collector.inventory.quick' : 'collector.inventory.full';

    return jobQueue.enqueue<InventoryCollectorJobPayload>(
      jobType,
      {
        deviceId,
        mode,
      },
      {
        maxAttempts: mode === 'quick' ? 1 : 2,
      },
    );
  }
}

export const collectorService = new CollectorService();
