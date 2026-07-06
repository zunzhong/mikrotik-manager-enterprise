import { DeviceInterfaceExplorer } from './DeviceInterfaceExplorer';

export interface DeviceInterfaceExplorerPageProps {
  deviceId: string;
}

export function DeviceInterfaceExplorerPage({ deviceId }: DeviceInterfaceExplorerPageProps) {
  return <DeviceInterfaceExplorer deviceId={deviceId} />;
}
