import { AlertCenter } from '../modules/alerts/components/AlertCenter';

export function AlertsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h2>Trung tâm cảnh báo</h2>
        <p>Theo dõi cảnh báo từ thiết bị, Inventory, Compliance, sao lưu và nền tảng.</p>
      </div>

      <AlertCenter />
    </div>
  );
}
