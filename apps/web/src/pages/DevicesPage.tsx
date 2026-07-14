import { Navigate } from 'react-router-dom';

export function DevicesPage() {
  return <Navigate to="/devices/list" replace />;
}
