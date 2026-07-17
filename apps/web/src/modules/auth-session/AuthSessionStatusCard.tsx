import { useAuthSession } from './useAuthSession';
import './auth-session.css';
import { useLanguage } from '../../i18n/LanguageContext';

function joinList(items: string[] | undefined): string {
  if (!items || items.length === 0) {
    return 'none';
  }

  return items.join(', ');
}

export function AuthSessionStatusCard() {
  const { tr } = useLanguage();
  const { current, rbacPrincipal, loading, error, refresh } = useAuthSession();

  const user = current?.user;

  return (
    <section className="auth-session-card">
      <div className="auth-session-card__header">
        <div>
          <p className="auth-session-card__eyebrow">{tr('Phiên đăng nhập', 'Auth Session')}</p>
          <h3>
            {current?.authenticated
              ? tr('Đã xác thực', 'Authenticated')
              : tr('Ẩn danh', 'Anonymous')}
          </h3>
          <p>
            {tr(
              'Phiên máy chủ hiện tại và thông tin RBAC.',
              'Current server session and RBAC principal.',
            )}
          </p>
        </div>

        <button type="button" disabled={loading} onClick={() => void refresh()}>
          {loading ? tr('Đang tải...', 'Loading...') : tr('Làm mới', 'Refresh')}
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="auth-session-card__grid">
        <div>
          <span>{tr('Mã người dùng', 'User ID')}</span>
          <strong>{user?.id ?? 'anonymous'}</strong>
        </div>
        <div>
          <span>Email</span>
          <strong>{user?.email ?? 'none'}</strong>
        </div>
        <div>
          <span>{tr('Vai trò', 'Roles')}</span>
          <strong>{joinList(user?.roleIds)}</strong>
        </div>
        <div>
          <span>{tr('Quản trị cao nhất', 'Super Admin')}</span>
          <strong>{user?.isSuperAdmin ? tr('có', 'yes') : tr('không', 'no')}</strong>
        </div>
      </div>

      <div className="auth-session-card__section">
        <h4>{tr('Quyền hạn', 'Permissions')}</h4>
        <div className="auth-session-card__chips">
          {(user?.permissions ?? []).map((permission) => (
            <span key={permission}>{permission}</span>
          ))}

          {(user?.permissions.length ?? 0) === 0 ? <span>none</span> : null}
        </div>
      </div>

      <div className="auth-session-card__section">
        <h4>{tr('Định danh RBAC', 'RBAC Principal')}</h4>
        <pre>
          {JSON.stringify(
            rbacPrincipal ?? {
              authenticated: false,
              principal: null,
            },
            null,
            2,
          )}
        </pre>
      </div>
    </section>
  );
}
