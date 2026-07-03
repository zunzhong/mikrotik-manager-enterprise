import { apiGet } from '../../lib/api';

export interface InventorySectionDefinition {
  key: string;
  category: string;
  label: string;
  path: string;
  enabledByDefault: boolean;
}

export const inventoryApi = {
  sections: () => apiGet<InventorySectionDefinition[]>('/api/v1/inventory/sections'),
};
