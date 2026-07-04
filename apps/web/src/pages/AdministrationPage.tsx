import { AdministrationPageView } from '../modules/rbac/components/AdministrationPageView';

export function AdministrationPage() {
  return (
    <div className="page">
      <div className="page-header">
        <h2>Administration</h2>
        <p>Enterprise IAM: users, roles and permissions.</p>
      </div>

      <AdministrationPageView />
    </div>
  );
}
