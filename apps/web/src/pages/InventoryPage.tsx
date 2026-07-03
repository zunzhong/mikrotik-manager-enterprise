import { InventoryExplorer } from '../modules/inventory/components/InventoryExplorer';

export function InventoryPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h2>Inventory Explorer</h2>
        <p>Explore RouterOS inventory sections used by collector, diff and compliance engines.</p>
      </div>

      <InventoryExplorer />
    </div>
  );
}
