import { DeviceDashboard } from './DeviceDashboard';

export interface DeviceDashboardPageProps {
  deviceId: string;
}

export function DeviceDashboardPage({ deviceId }: DeviceDashboardPageProps) {
  return <DeviceDashboard deviceId={deviceId} />;
}
