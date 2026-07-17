import { useEffect, useMemo, useState } from 'react';
import { SummaryCard } from '../dashboard/components/SummaryCard';
import { WidgetCard } from '../dashboard/components/WidgetCard';
import { rbacApi, type Permission, type Role } from './rbac.api';
import type {
  RbacPermissionCheckResult,
  RbacUserRoleAssignment,
  UserPermissionResult,
} from './rbac.types';
import './rbac.css';
import { useLanguage } from '../../i18n/LanguageContext';

function roleLabel(roles: Role[], roleId: string): string {
  return roles.find((role: Role) => role.id === roleId)?.name ?? roleId;
}

function roleHasPermission(role: Role, permissionKey: string): boolean {
  return role.permissions.some((item) => item.permission.key === permissionKey);
}

export function RbacPanel() {
  const { formatDateTime, tr } = useLanguage();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [userId, setUserId] = useState('demo-user');
  const [selectedRoleId, setSelectedRoleId] = useState('viewer');
  const [permissionToCheck, setPermissionToCheck] = useState('audit:export');
  const [assignments, setAssignments] = useState<RbacUserRoleAssignment[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermissionResult | null>(null);
  const [checkResult, setCheckResult] = useState<RbacPermissionCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wildcardRoles = useMemo(
    () => roles.filter((role: Role) => roleHasPermission(role, '*')).length,
    [roles],
  );

  async function loadCatalog() {
    setLoading(true);
    setError(null);

    try {
      const [nextRoles, nextPermissions] = await Promise.all([
        rbacApi.roles(),
        rbacApi.permissions(),
      ]);

      setRoles(nextRoles);
      setPermissions(nextPermissions);

      if (nextRoles.length > 0 && !nextRoles.some((role: Role) => role.id === selectedRoleId)) {
        setSelectedRoleId(nextRoles[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot load RBAC catalog');
    } finally {
      setLoading(false);
    }
  }

  async function loadUser() {
    if (!userId.trim()) return;

    setBusy(true);
    setError(null);

    try {
      const [nextAssignments, nextPermissions] = await Promise.all([
        rbacApi.userRoles(userId.trim()),
        rbacApi.userPermissions(userId.trim()),
      ]);

      setAssignments(nextAssignments);
      setUserPermissions(nextPermissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot load user RBAC');
    } finally {
      setBusy(false);
    }
  }

  async function assignRole() {
    if (!userId.trim() || !selectedRoleId) return;

    setBusy(true);
    setError(null);

    try {
      await rbacApi.assignUserRole(userId.trim(), selectedRoleId);
      await loadUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot assign role');
    } finally {
      setBusy(false);
    }
  }

  async function removeRole(roleId: string) {
    if (!userId.trim()) return;

    setBusy(true);
    setError(null);

    try {
      await rbacApi.removeUserRole(userId.trim(), roleId);
      await loadUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot remove role');
    } finally {
      setBusy(false);
    }
  }

  async function checkPermission() {
    if (!userId.trim() || !permissionToCheck.trim()) return;

    setBusy(true);
    setError(null);

    try {
      const result = await rbacApi.checkPermission(
        { userId: userId.trim() },
        permissionToCheck.trim(),
      );

      setCheckResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot check permission');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadCatalog();
  }, []);

  useEffect(() => {
    if (!loading) {
      void loadUser();
    }
  }, [loading]);

  return (
    <section className="rbac-panel">
      <div className="rbac-panel__header">
        <div>
          <p className="rbac-panel__eyebrow">Enterprise RBAC</p>
          <h3>{tr('Kiểm soát truy cập', 'Access Control')}</h3>
          <p>
            {tr(
              'Quản lý vai trò, gán người dùng và kiểm tra quyền.',
              'Manage roles, user assignments, and permission checks.',
            )}
          </p>
        </div>

        <div className="rbac-panel__actions">
          <button type="button" disabled={loading || busy} onClick={() => void loadCatalog()}>
            {tr('Làm mới danh mục', 'Refresh Catalog')}
          </button>
          <button type="button" disabled={loading || busy} onClick={() => void loadUser()}>
            {tr('Làm mới người dùng', 'Refresh User')}
          </button>
        </div>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="rbac-panel__cards">
        <SummaryCard
          label={tr('Vai trò', 'Roles')}
          value={roles.length}
          hint={tr('vai trò enterprise', 'enterprise roles')}
        />
        <SummaryCard
          label={tr('Quyền hạn', 'Permissions')}
          value={permissions.length}
          hint={tr('mục trong danh mục', 'catalog entries')}
        />
        <SummaryCard
          label={tr('Vai trò toàn quyền', 'Wildcard Roles')}
          value={wildcardRoles}
          hint={tr('quyền super admin', 'super admin access')}
        />
        <SummaryCard
          label={tr('Vai trò người dùng', 'User Roles')}
          value={assignments.length}
          hint={userId || 'selected user'}
        />
      </div>

      <WidgetCard
        title={tr('Gán vai trò người dùng', 'User Role Assignment')}
        description={tr('Gán hoặc gỡ vai trò cho người dùng', 'Assign or remove roles for a user')}
      >
        <div className="rbac-panel__form">
          <label>
            User ID
            <input value={userId} onChange={(event) => setUserId(event.target.value)} />
          </label>

          <label>
            Role
            <select
              value={selectedRoleId}
              onChange={(event) => setSelectedRoleId(event.target.value)}
            >
              {roles.map((role: Role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>

          <button type="button" disabled={busy || loading} onClick={() => void assignRole()}>
            {tr('Gán vai trò', 'Assign Role')}
          </button>
        </div>

        <div className="rbac-panel__assignments">
          {assignments.map((assignment: RbacUserRoleAssignment) => (
            <article key={assignment.id} className="rbac-panel__assignment">
              <div>
                <strong>{roleLabel(roles, assignment.roleId)}</strong>
                <small>
                  {assignment.roleId} · assigned {formatDateTime(assignment.createdAt)}
                </small>
              </div>

              <button
                type="button"
                disabled={busy}
                onClick={() => void removeRole(assignment.roleId)}
              >
                {tr('Gỡ', 'Remove')}
              </button>
            </article>
          ))}

          {!loading && assignments.length === 0 ? (
            <p className="muted">
              {tr('Người dùng chưa được gán vai trò.', 'No roles assigned for this user.')}
            </p>
          ) : null}
        </div>
      </WidgetCard>

      <WidgetCard
        title={tr('Kiểm tra quyền', 'Permission Check')}
        description={tr(
          'Xác minh quyền hiệu lực của người dùng',
          'Validate an effective user permission',
        )}
      >
        <div className="rbac-panel__form">
          <label>
            Permission
            <input
              value={permissionToCheck}
              onChange={(event) => setPermissionToCheck(event.target.value)}
            />
          </label>

          <button type="button" disabled={busy || loading} onClick={() => void checkPermission()}>
            {tr('Kiểm tra', 'Check')}
          </button>
        </div>

        {checkResult ? (
          <div className="rbac-panel__check" data-allowed={checkResult.allowed}>
            <strong>
              {checkResult.allowed ? tr('Được phép', 'Allowed') : tr('Bị từ chối', 'Denied')}
            </strong>
            <span>Permission: {checkResult.permission}</span>
            <span>Matched by: {checkResult.matchedBy ?? 'none'}</span>
          </div>
        ) : null}
      </WidgetCard>

      <WidgetCard
        title={tr('Quyền hiệu lực', 'Effective Permissions')}
        description={tr(`Quyền đã phân giải cho ${userId}`, `Permissions resolved for ${userId}`)}
      >
        <div className="rbac-panel__permissions">
          {(userPermissions?.permissions ?? []).map((permission: string) => (
            <span key={permission}>{permission}</span>
          ))}

          {!loading && (userPermissions?.permissions.length ?? 0) === 0 ? (
            <p className="muted">
              {tr(
                'Không có quyền hiệu lực cho người dùng này.',
                'No permissions resolved for this user.',
              )}
            </p>
          ) : null}
        </div>
      </WidgetCard>

      <WidgetCard
        title={tr('Danh mục vai trò', 'Role Catalog')}
        description={tr(
          'Vai trò enterprise và quyền tương ứng',
          'Enterprise roles and their permissions',
        )}
      >
        <div className="rbac-panel__roles">
          {roles.map((role: Role) => (
            <article key={role.id} className="rbac-panel__role">
              <div>
                <strong>{role.name}</strong>
                <small>
                  {role.id} · {role.description}
                </small>
              </div>
              <div className="rbac-panel__permissions">
                {role.permissions.map((item) => (
                  <span key={item.id}>{item.permission.key}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </WidgetCard>
    </section>
  );
}
