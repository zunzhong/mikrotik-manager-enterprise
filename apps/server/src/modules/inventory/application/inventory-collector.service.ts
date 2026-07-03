import { RouterClient, RouterOsError } from '@mme/routeros-core';
import { encryptionService } from '../../../security/encryption.service.js';
import { deviceRepository } from '../../device/infrastructure/device.repository.js';
import { inventorySections } from '../domain/inventory-section.js';
import { inventoryRepository } from '../infrastructure/inventory.repository.js';

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

    const snapshot = await inventoryRepository.createSnapshot({
      deviceId,
      source: 'manual',
      status: 'running',
      summary: {
        sectionsPlanned: inventorySections.filter((section) => section.enabledByDefault).length,
      },
    });

    const collectedSections = [];

    try {
      await client.connect();

      for (const section of inventorySections.filter((item) => item.enabledByDefault)) {
        try {
          const response = await client.command(section.path);
          const created = await inventoryRepository.createSection({
            snapshotId: snapshot.id,
            name: section.label,
            category: section.category,
            path: section.path,
            items: response.rows,
          });

          collectedSections.push(created);
        } catch {
          // Some RouterOS paths may not exist depending on packages/version.
          // We skip failed optional section collection in the foundation stage.
        }
      }

      await client.close();

      return {
        snapshotId: snapshot.id,
        deviceId,
        sectionsCollected: collectedSections.length,
      };
    } catch (error) {
      await client.close().catch(() => undefined);

      return {
        snapshotId: snapshot.id,
        deviceId,
        sectionsCollected: collectedSections.length,
        errorCode: error instanceof RouterOsError ? error.code : 'UNKNOWN_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const inventoryCollectorService = new InventoryCollectorService();
