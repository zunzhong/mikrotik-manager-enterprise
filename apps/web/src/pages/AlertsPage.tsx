import { AlertCenter } from '../modules/alerts/components/AlertCenter';

export function AlertsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h2>Alert Center</h2>
        <p>Monitor inventory, compliance, backup and platform alerts.</p>
      </div>

      <AlertCenter />
    </div>
  );
}
