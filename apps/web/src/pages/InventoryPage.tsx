export function InventoryPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h2>Inventory</h2>
        <p>Explore collected RouterOS system, services, routing and firewall inventory.</p>
      </div>

      <div className="card-grid">
        <div className="card">
          <span className="card-label">Status</span>
          <strong>Ready</strong>
          <p>Module placeholder is connected to the enterprise shell.</p>
        </div>
        <div className="card">
          <span className="card-label">Next</span>
          <strong>API Integration</strong>
          <p>This page will be connected to backend APIs in upcoming parts.</p>
        </div>
      </div>
    </div>
  );
}
