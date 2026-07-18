import { useState } from 'react';
import { deviceApi } from '../device.api';
import { useLanguage } from '../../../i18n/LanguageContext';

export function DeviceTerminal({ deviceId, deviceName }: { deviceId: string; deviceName: string }) {
  const { formatDateTime } = useLanguage();
  const [command, setCommand] = useState('/log');
  const [transport, setTransport] = useState<'api' | 'rest' | 'script' | 'rest-crud'>('api');
  const [restTls, setRestTls] = useState(true);
  const [restPort, setRestPort] = useState(443);
  const [restMethod, setRestMethod] = useState<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>('GET');
  const [restBody, setRestBody] = useState('{}');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  async function execute() {
    const value = command.trim();
    if (!value) return;
    const destructive =
      /\/(remove|reset-configuration|reboot|shutdown|format-drive|sup-output)/i.test(value) ||
      (transport === 'rest-crud' && restMethod !== 'GET');
    if (destructive && !window.confirm(`Lệnh này có thể thay đổi ${deviceName}. Tiếp tục?`)) return;

    setRunning(true);
    setOutput(`> ${value}\nĐang thực thi...`);
    try {
      let parsedBody: Record<string, unknown> | undefined;
      if (transport === 'rest-crud') {
        const parsed = JSON.parse(restBody || '{}') as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('REST body phải là một JSON object.');
        }
        parsedBody = parsed as Record<string, unknown>;
      }
      const result = await deviceApi.terminal(deviceId, {
        command: value,
        confirm: destructive,
        transport,
        restTls,
        restPort,
        restMethod,
        restBody: parsedBody,
      });
      setHistory((current) => [value, ...current.filter((item) => item !== value)].slice(0, 12));
      setOutput(
        `> ${value}\n${result.success ? 'THÀNH CÔNG' : 'THẤT BẠI'} · ${result.message}\nHoàn tất: ${formatDateTime(result.finishedAt)} · ${result.durationMs} ms\n\n${JSON.stringify(result.data ?? [], null, 2)}`,
      );
    } catch (error) {
      setOutput(
        `> ${value}\nLỖI: ${error instanceof Error ? error.message : 'Không thể thực thi lệnh.'}`,
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="device-terminal">
      <header>
        <div>
          <p className="device-dashboard__eyebrow">New Terminal</p>
          <h3>RouterOS CLI — {deviceName}</h3>
        </div>
      </header>
      <div className="terminal-mode-row">
        <label>
          Chế độ thực thi
          <select
            value={transport}
            onChange={(event) => setTransport(event.target.value as typeof transport)}
          >
            <option value="api">RouterOS API / API-SSL</option>
            <option value="rest">REST API JSON</option>
            <option value="script">REST Script — CLI nguyên bản</option>
            <option value="rest-crud">REST CRUD — GET/PUT/PATCH/DELETE</option>
          </select>
        </label>
        {transport !== 'api' ? (
          <>
            <label className="terminal-check">
              <input
                type="checkbox"
                checked={restTls}
                onChange={(event) => {
                  setRestTls(event.target.checked);
                  setRestPort(event.target.checked ? 443 : 80);
                }}
              />
              HTTPS (www-ssl)
            </label>
            <label>
              Cổng REST
              <input
                type="number"
                min="1"
                max="65535"
                value={restPort}
                onChange={(event) => setRestPort(Number(event.target.value))}
              />
            </label>
          </>
        ) : null}
      </div>
      {transport === 'rest-crud' ? (
        <div className="terminal-crud-row">
          <label>
            HTTP method
            <select
              value={restMethod}
              onChange={(event) => setRestMethod(event.target.value as typeof restMethod)}
            >
              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => (
                <option key={method}>{method}</option>
              ))}
            </select>
          </label>
          <label>
            JSON body (không dùng cho GET/DELETE)
            <textarea
              value={restBody}
              onChange={(event) => setRestBody(event.target.value)}
              rows={4}
              spellCheck={false}
            />
          </label>
        </div>
      ) : null}
      <div className="terminal-command-row">
        <textarea
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void execute();
            }
          }}
          spellCheck={false}
          rows={transport === 'rest-crud' ? 1 : 3}
          placeholder={transport === 'rest-crud' ? '/ip/address hoặc /ip/address/*1' : '/log'}
        />
        <button
          className="small-button primary-button"
          type="button"
          onClick={() => void execute()}
          disabled={running}
        >
          {running ? 'Đang chạy...' : 'Thực thi lệnh'}
        </button>
      </div>
      <div className="terminal-presets">
        {[
          { label: 'Nhật ký', command: '/log', mode: 'api' as const },
          { label: 'Tài nguyên', command: '/system/resource/print', mode: 'api' as const },
          {
            label: 'Traffic interface',
            command: '/interface/print .proplist=name,type,running,rx-byte,tx-byte',
            mode: 'rest' as const,
          },
          { label: 'Ping', command: '/ping address=8.8.8.8 count=4', mode: 'rest' as const },
          {
            label: 'LTE monitor once',
            command: '/interface/lte/monitor numbers=0 once=""',
            mode: 'rest' as const,
          },
          {
            label: 'Lọc log error',
            command: '/log print where message~"error"',
            mode: 'script' as const,
          },
          {
            label: 'Ghi log MME',
            command: '/log info "MME REST terminal test"',
            mode: 'script' as const,
          },
          { label: 'Export compact', command: '/export compact=""', mode: 'rest' as const },
          { label: 'REST GET IP', command: '/ip/address', mode: 'rest-crud' as const },
          {
            label: 'REST GET Firewall',
            command: '/ip/firewall/filter',
            mode: 'rest-crud' as const,
          },
        ].map((example) => (
          <button
            key={example.label}
            type="button"
            onClick={() => {
              setCommand(example.command);
              setTransport(example.mode);
              if (example.mode === 'rest-crud') setRestMethod('GET');
            }}
          >
            {example.label}
          </button>
        ))}
      </div>
      {transport !== 'api' ? (
        <div className="terminal-rest-note">
          REST yêu cầu bật <code>www-ssl</code> (khuyến nghị) hoặc <code>www</code> và tài khoản
          RouterOS có policy <code>rest-api</code>. HTTPS tự ký được MME chấp nhận trong mạng quản
          trị.
        </div>
      ) : null}
      {history.length > 0 ? (
        <details className="terminal-history">
          <summary>Lịch sử lệnh trong phiên</summary>
          {history.map((item) => (
            <button key={item} type="button" onClick={() => setCommand(item)}>
              {item}
            </button>
          ))}
        </details>
      ) : null}
      <pre className="terminal-output">{output || 'Sẵn sàng.'}</pre>
    </section>
  );
}
