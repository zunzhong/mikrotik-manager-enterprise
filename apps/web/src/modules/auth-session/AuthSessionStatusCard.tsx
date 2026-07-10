import { useAuthSession } from './useAuthSession';
import './auth-session.css';

function joinList(items: string[] | undefined): string {
  if (!items || items.length === 0) {
    return 'none';
  }

  return items.join(', ');
}

export function AuthSessionStatusCard() {
  const { current, rbacPrincipal, loading, error, refresh } = useAuthSession();

  const user = current?.user;

  return (
    <section className="auth-session-card">
      <div className="auth-session-card__header">
        <div>
          <p className="auth-session-card__eyebrow">Auth Session</p>
          <h3>{current?.authenticated ? 'Authenticated' : 'Anonymous'}</h3>
          <p>Current server-side auth session and RBAC principal preview.</p>
        </div>

        <button type="button" disabled={loading} onClick={() => void refresh()}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="auth-session-card__grid">
        <div>
          <span>User ID</span>
          <strong>{user?.id ?? 'anonymous'}</strong>
        </div>
        <div>
          <span>Email</span>
          <strong>{user?.email ?? 'none'}</strong>
        </div>
        <div>
          <span>Roles</span>
          <strong>{joinList(user?.roleIds)}</strong>
        </div>
        <div>
          <span>Super Admin</span>
          <strong>{user?.isSuperAdmin ? 'yes' : 'no'}</strong>
        </div>
      </div>

      <div className="auth-session-card__section">
        <h4>Permissions</h4>
        <div className="auth-session-card__chips">
          {(user?.permissions ?? []).map((permission) => (
            <span key={permission}>{permission}</span>
          ))}

          {(user?.permissions.length ?? 0) === 0 ? <span>none</span> : null}
        </div>
      </div>

      <div className="auth-session-card__section">
        <h4>RBAC Principal</h4>
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
