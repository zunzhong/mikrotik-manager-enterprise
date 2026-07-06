import { DeviceRealtimeMonitor } from './DeviceRealtimeMonitor';

export interface DeviceRealtimeMonitorPageProps {
  deviceId: string;
}

export function DeviceRealtimeMonitorPage({ deviceId }: DeviceRealtimeMonitorPageProps) {
  return <DeviceRealtimeMonitor deviceId={deviceId} />;
}
