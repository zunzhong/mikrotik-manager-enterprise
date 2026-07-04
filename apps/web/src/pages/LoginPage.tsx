import { useState } from 'react';
import { authApi } from '../modules/auth/auth.api';

export function LoginPage() {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function login() {
    setMessage('Signing in...');

    try {
      const result = await authApi.login(email, password);
      window.localStorage.setItem('mme-token', result.token);
      setMessage(`Signed in as ${result.user.email}`);
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
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />

        <button className="theme-toggle" onClick={login}>Sign in</button>

        {message ? <div className="info-banner">{message}</div> : null}
      </div>
    </div>
  );
}
