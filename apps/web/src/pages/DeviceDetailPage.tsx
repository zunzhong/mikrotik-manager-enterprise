import { Navigate, useParams } from 'react-router-dom';
import { DeviceExplorer } from '../modules/devices/components/DeviceExplorer';

export function DeviceDetailPage() {
  const { deviceId } = useParams();
  if (!deviceId) return <Navigate to="/devices/list" replace />;
  return <DeviceExplorer detailOnlyId={deviceId} />;
}
