import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';

interface PreflightResult {
  ready: boolean;
  checks: Record<'database' | 'schema' | 'adminUser' | 'storage' | 'environment', boolean>;
  storage: { freeBytes: number; minimumBytes: number };
  guidance: Record<string, string | null>;
}

const labels: Record<keyof PreflightResult['checks'], string> = {
  database: 'Kết nối cơ sở dữ liệu',
  schema: 'Cấu trúc dữ liệu',
  adminUser: 'Tài khoản quản trị',
  storage: 'Dung lượng lưu trữ',
  environment: 'Cấu hình và khóa bảo mật',
};

export function SetupPage() {
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function check() {
    setLoading(true);
    setError(null);
    try {
      setResult(await apiGet<PreflightResult>('/api/v1/setup/preflight'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể kiểm tra hệ thống.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void check();
  }, []);

  return (
    <main className="setup-page">
      <section className="setup-card">
        <div className="brand">
          <img className="brand-logo" src="/brand/mme-logo-192.png" alt="MME" />
          <div>
            <strong>MikroTik Manager</strong>
            <span>Enterprise Setup Wizard</span>
          </div>
        </div>

        <h1>Kiểm tra trước khi cài đặt</h1>
        <p>Trình hướng dẫn kiểm tra dữ liệu, tài khoản quản trị, lưu trữ và bảo mật.</p>

        {error ? <div className="error-banner">{error}</div> : null}

        <div className="setup-checks">
          {result
            ? Object.entries(result.checks).map(([key, passed]) => (
                <article className={passed ? 'setup-check passed' : 'setup-check failed'} key={key}>
                  <span>{passed ? '✓' : '!'}</span>
                  <div>
                    <strong>{labels[key as keyof PreflightResult['checks']]}</strong>
                    <small>{passed ? 'Sẵn sàng' : (result.guidance[key] ?? 'Cần cấu hình')}</small>
                  </div>
                </article>
              ))
            : null}
        </div>

        {result?.ready ? (
          <div className="info-banner">Hệ thống đã sẵn sàng. Bạn có thể đăng nhập quản trị.</div>
        ) : null}

        <div className="setup-actions">
          <button type="button" disabled={loading} onClick={() => void check()}>
            {loading ? 'Đang kiểm tra…' : 'Kiểm tra lại'}
          </button>
          {result?.ready ? <a href="/login">Đi tới đăng nhập</a> : null}
        </div>
      </section>
    </main>
  );
}
