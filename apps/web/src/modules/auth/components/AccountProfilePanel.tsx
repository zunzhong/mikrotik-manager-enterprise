import { useEffect, useState } from 'react';
import { authApi, type AuthUser } from '../auth.api';

export function AccountProfilePanel() {
  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    authApi
      .me()
      .then((user) => {
        setProfile(user);
        setName(user.name ?? '');
        setEmail(user.email);
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Không thể tải thông tin tài khoản.'),
      );
  }, []);

  async function save() {
    setSaving(true);
    setMessage('Đang lưu thông tin tài khoản...');
    try {
      const updated = await authApi.updateProfile({ name, email });
      setProfile(updated);
      window.dispatchEvent(new CustomEvent('mme-profile-updated', { detail: updated }));
      setMessage('Đã cập nhật thông tin tài khoản. Email mới được dùng ở lần đăng nhập tiếp theo.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Cập nhật tài khoản thất bại.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="settings-panel account-profile-panel">
      <div className="settings-toolbar">
        <div>
          <h3>Thông tin tài khoản</h3>
          <p>Xem tên đăng nhập, vai trò và cập nhật hồ sơ của tài khoản hiện tại.</p>
        </div>
        <span className={`account-state ${profile?.isActive === false ? 'inactive' : ''}`}>
          {profile?.isActive === false ? 'Đã vô hiệu hóa' : 'Đang hoạt động'}
        </span>
      </div>

      <div className="account-profile-grid">
        <label>
          <span>Tên hiển thị</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
        </label>
        <label>
          <span>Email / tên đăng nhập</span>
          <input
            value={email}
            type="email"
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
          />
        </label>
        <label>
          <span>Mật khẩu</span>
          <input
            value={profile?.passwordConfigured === false ? 'Chưa thiết lập' : '••••••••••••'}
            type="text"
            readOnly
            aria-label="Trạng thái mật khẩu"
          />
          <small>
            Vì bảo mật, hệ thống không lưu mật khẩu dạng đọc được. Hãy dùng mục đổi mật khẩu bên
            dưới.
          </small>
        </label>
        <div className="account-meta">
          <span>Vai trò</span>
          <strong>{profile?.role ?? '—'}</strong>
          <small>
            Cập nhật gần nhất:{' '}
            {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleString() : '—'}
          </small>
        </div>
      </div>

      <button
        className="small-button primary-button"
        type="button"
        onClick={() => void save()}
        disabled={saving || !email}
      >
        {saving ? 'Đang lưu...' : 'Lưu thông tin tài khoản'}
      </button>
      {message ? <div className="info-banner">{message}</div> : null}
    </section>
  );
}
