import { getDevicePermissionState, type DeviceGuardPrincipal } from './device-permissions';
import './device-guard.css';

export interface DevicePermissionNoticeProps {
  principal?: DeviceGuardPrincipal | null;
}

export function DevicePermissionNotice({ principal }: DevicePermissionNoticeProps) {
  const state = getDevicePermissionState(principal);

  if (state.canManage && state.canConnect && state.canSync && state.canTest) {
    return (
      <div className="device-permission-notice device-permission-notice-ok">
        Bạn có đủ quyền thao tác Device Engine.
      </div>
    );
  }

  return (
    <div className="device-permission-notice device-permission-notice-warning">
      <strong>Device permission state</strong>
      <ul>
        {!state.canManage ? <li>{state.missingManageReason}</li> : null}
        {!state.canConnect ? <li>{state.missingConnectReason}</li> : null}
        {!state.canSync ? <li>{state.missingSyncReason}</li> : null}
        {!state.canTest ? <li>{state.missingTestReason}</li> : null}
        {!state.canReboot ? <li>{state.missingRebootReason}</li> : null}
      </ul>
    </div>
  );
}
