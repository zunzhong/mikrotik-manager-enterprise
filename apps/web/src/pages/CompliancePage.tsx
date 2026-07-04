import { ComplianceCenter } from '../modules/compliance/components/ComplianceCenter';
export function CompliancePage() {
  return (
    <div className="page">
      <div className="page-header">
        <h2>Compliance Center</h2>
        <p>Run policy checks and review MikroTik configuration compliance.</p>
      </div>
      <ComplianceCenter />
    </div>
  );
}
