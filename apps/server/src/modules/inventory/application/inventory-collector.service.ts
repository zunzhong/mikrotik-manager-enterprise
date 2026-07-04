import { RouterClient, RouterOsError } from '@mme/routeros-core';
import { encryptionService } from '../../../security/encryption.service.js';
import { deviceRepository } from '../../device/infrastructure/device.repository.js';
import { collectorRegistry, defaultInventoryCollectors } from '../collector/index.js';
import { inventoryRepository } from '../infrastructure/inventory.repository.js';

if (collectorRegistry.list().length === 0) {
  collectorRegistry.registerMany(defaultInventoryCollectors);
}

export class InventoryCollectorService {
  public async collect(deviceId: string) {
    const device = await deviceRepository.findById(deviceId);

    if (!device) {
      throw new Error('Device not found');
    }

    const client = new RouterClient({
      host: device.host,
      port: device.port,
      username: device.username,
      password: encryptionService.decrypt(device.passwordEncrypted),
      tls: device.useTls,
      loginMode: device.loginMode as 'auto' | 'modern' | 'legacy',
      timeoutMs: 10000,
    });

    const collectors = collectorRegistry.enabledByDefault();

    const snapshot = await inventoryRepository.createSnapshot({
      deviceId,
      source: 'manual',
      status: 'running',
      summary: { collectorsPlanned: collectors.length },
    });

    const collectedSections = [];
    const failedCollectors = [];

    try {
      await client.connect();

      for (const collector of collectors) {
        const result = await collector.collect({ deviceId, client });

        if (!result.success) {
          failedCollectors.push({ key: result.key, path: result.path, error: result.error });
          continue;
        }

        const created = await inventoryRepository.createSection({
          snapshotId: snapshot.id,
          name: result.label,
          category: result.category,
          path: result.path,
          items: result.rows,
        });

        collectedSections.push(created);
      }

      await client.close();

      return {
        snapshotId: snapshot.id,
        deviceId,
        collectorsPlanned: collectors.length,
        sectionsCollected: collectedSections.length,
        failedCollectors,
      };
    } catch (error) {
      await client.close().catch(() => undefined);

      return {
        snapshotId: snapshot.id,
        deviceId,
        collectorsPlanned: collectors.length,
        sectionsCollected: collectedSections.length,
        failedCollectors,
        errorCode: error instanceof RouterOsError ? error.code : 'UNKNOWN_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const inventoryCollectorService = new InventoryCollectorService();
