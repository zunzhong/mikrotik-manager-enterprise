import { useCallback, useMemo, useState } from 'react';
import { useAsyncData } from '../../../hooks/useAsyncData';
import { rbacApi, type AdminUser, type Permission, type Role } from '../rbac.api';
import { useLanguage } from '../../../i18n/LanguageContext';

type Tab = 'users' | 'roles' | 'permissions';

export function AdministrationPageView() {
  const { formatDateTime } = useLanguage();
  const users = useAsyncData(useCallback(() => rbacApi.users(), []));
  const roles = useAsyncData(useCallback(() => rbacApi.roles(), []));
  const permissions = useAsyncData(useCallback(() => rbacApi.permissions(), []));
  const [tab, setTab] = useState<Tab>('users');
  const [message, setMessage] = useState('');

  const permissionGroups = useMemo(() => {
    const groups = new Map<string, Permission[]>();
    for (const permission of permissions.data ?? []) {
      const list = groups.get(permission.category) ?? [];
      list.push(permission);
      groups.set(permission.category, list);
    }
    return [...groups.entries()];
  }, [permissions.data]);

  async function assignRole(user: AdminUser, roleId: string) {
    setMessage(`Assigning role to ${user.email}...`);
    try {
      await rbacApi.assignUserRole(user.id, roleId);
      setMessage('Role assigned.');
      users.refresh();
      roles.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Assign role failed');
    }
  }

  async function assignPermission(role: Role, permissionId: string) {
    setMessage(`Assigning permission to ${role.name}...`);
    try {
      await rbacApi.assignRolePermission(role.id, permissionId);
      setMessage('Permission assigned.');
      roles.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Assign permission failed');
    }
  }

  return (
    <div className="admin-page-view">
      <div className="admin-toolbar">
        <div>
          <h3>Administration</h3>
          <p>Manage users, roles and enterprise permissions.</p>
        </div>
        <button
          className="small-button"
          onClick={() => {
            users.refresh();
            roles.refresh();
            permissions.refresh();
          }}
        >
          Refresh
        </button>
      </div>

      {message ? <div className="info-banner">{message}</div> : null}
      {users.error ? <div className="error-banner">{users.error}</div> : null}
      {roles.error ? <div className="error-banner">{roles.error}</div> : null}
      {permissions.error ? <div className="error-banner">{permissions.error}</div> : null}

      <div className="admin-summary">
        <div className="summary-card">
          <span>Users</span>
          <strong>{users.data?.length ?? 0}</strong>
          <small>accounts</small>
        </div>
        <div className="summary-card">
          <span>Roles</span>
          <strong>{roles.data?.length ?? 0}</strong>
          <small>access profiles</small>
        </div>
        <div className="summary-card">
          <span>Permissions</span>
          <strong>{permissions.data?.length ?? 0}</strong>
          <small>capabilities</small>
        </div>
      </div>

      <div className="admin-tabs">
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
          Users
        </button>
        <button className={tab === 'roles' ? 'active' : ''} onClick={() => setTab('roles')}>
          Roles
        </button>
        <button
          className={tab === 'permissions' ? 'active' : ''}
          onClick={() => setTab('permissions')}
        >
          Permissions
        </button>
      </div>

      {tab === 'users' ? (
        <section className="admin-panel">
          <h3>Users</h3>
          <div className="admin-list">
            {(users.data ?? []).map((user) => (
              <article className="admin-row" key={user.id}>
                <div>
                  <h4>{user.name ?? user.email}</h4>
                  <p>{user.email}</p>
                  <small>
                    {user.isActive ? 'active' : 'disabled'} • created{' '}
                    {formatDateTime(user.createdAt)}
                  </small>
                  <div className="tag-row">
                    {user.roles.map((item) => (
                      <span className="status-badge" key={item.id}>
                        {item.role.name}
                      </span>
                    ))}
                    {user.roles.length === 0 ? <span className="status-badge">no role</span> : null}
                  </div>
                </div>
                <select
                  onChange={(event) => event.target.value && assignRole(user, event.target.value)}
                  defaultValue=""
                >
                  <option value="">Assign role...</option>
                  {(roles.data ?? []).map((role) => (
                    <option value={role.id} key={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === 'roles' ? (
        <section className="admin-panel">
          <h3>Roles</h3>
          <div className="admin-list">
            {(roles.data ?? []).map((role) => (
              <article className="admin-row" key={role.id}>
                <div>
                  <h4>{role.name}</h4>
                  <p>{role.description ?? role.key}</p>
                  <small>
                    {role.isSystem ? 'system role' : 'custom role'} • {role.permissions.length}{' '}
                    permissions
                  </small>
                  <div className="tag-row">
                    {role.permissions.slice(0, 8).map((item) => (
                      <span className="status-badge" key={item.id}>
                        {item.permission.key}
                      </span>
                    ))}
                    {role.permissions.length > 8 ? (
                      <span className="status-badge">+{role.permissions.length - 8}</span>
                    ) : null}
                  </div>
                </div>
                <select
                  onChange={(event) =>
                    event.target.value && assignPermission(role, event.target.value)
                  }
                  defaultValue=""
                >
                  <option value="">Assign permission...</option>
                  {(permissions.data ?? []).map((permission) => (
                    <option value={permission.id} key={permission.id}>
                      {permission.key}
                    </option>
                  ))}
                </select>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {tab === 'permissions' ? (
        <section className="admin-panel">
          <h3>Permissions Catalog</h3>
          <div className="permission-groups">
            {permissionGroups.map(([category, items]) => (
              <div className="permission-group" key={category}>
                <h4>{category}</h4>
                <div className="permission-list">
                  {items.map((permission) => (
                    <article className="permission-card" key={permission.id}>
                      <strong>{permission.key}</strong>
                      <span>{permission.name}</span>
                      <small>{permission.description}</small>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
