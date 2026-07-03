import { inventorySections } from '../domain/inventory-section.js';
import { inventoryRepository } from '../infrastructure/inventory.repository.js';

export class InventoryService {
  public listSections() {
    return inventorySections;
  }

  public listSnapshots(deviceId: string) {
    return inventoryRepository.listSnapshots(deviceId);
  }
}

export const inventoryService = new InventoryService();
