import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../modules/auth/auth.api';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function login() {
    setMessage('Signing in...');

    try {
      const result = await authApi.login(email, password);
      window.localStorage.setItem('mme-token', result.accessToken ?? result.token ?? '');
      setMessage(`Signed in as ${result.user?.email ?? email}`);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login failed');
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand">
          <div className="brand-mark">MME</div>
          <div>
            <strong>MikroTik Manager</strong>
            <span>Enterprise</span>
          </div>
        </div>

        <h1>Sign in</h1>
        <p>Access the enterprise management console.</p>

        <label>Email</label>
        <input value={email} onChange={(event) => setEmail(event.target.value)} />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void login();
          }}
        />

        <button className="theme-toggle" onClick={login}>
          Sign in
        </button>

        {message ? <div className="info-banner">{message}</div> : null}
        <a href="/setup">Kiểm tra cài đặt và cơ sở dữ liệu</a>
      </div>
    </div>
  );
}
