import { getAlertPermissionState, type AlertGuardPrincipal } from './alert-permissions';
import './alert-guard.css';

export interface AlertPermissionNoticeProps {
  principal?: AlertGuardPrincipal | null;
}

export function AlertPermissionNotice({ principal }: AlertPermissionNoticeProps) {
  const state = getAlertPermissionState(principal);

  if (
    state.canAcknowledge &&
    state.canResolve &&
    state.canSilence &&
    state.canBulk &&
    state.canManage
  ) {
    return (
      <div className="alert-permission-notice alert-permission-notice-ok">
        Bạn có đủ quyền thao tác Alert Engine.
      </div>
    );
  }

  return (
    <div className="alert-permission-notice alert-permission-notice-warning">
      <strong>Alert permission state</strong>
      <ul>
        {!state.canUpdate ? <li>{state.missingUpdateReason}</li> : null}
        {!state.canAcknowledge ? <li>{state.missingAcknowledgeReason}</li> : null}
        {!state.canResolve ? <li>{state.missingResolveReason}</li> : null}
        {!state.canSilence ? <li>{state.missingSilenceReason}</li> : null}
        {!state.canBulk ? <li>{state.missingBulkReason}</li> : null}
        {!state.canManage ? <li>{state.missingManageReason}</li> : null}
      </ul>
    </div>
  );
}
