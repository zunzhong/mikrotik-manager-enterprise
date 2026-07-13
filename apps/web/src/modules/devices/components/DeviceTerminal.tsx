import { useState } from 'react';
import { deviceApi } from '../device.api';

export function DeviceTerminal({ deviceId, deviceName }: { deviceId: string; deviceName: string }) {
  const [command, setCommand] = useState('/system/resource/print');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  async function execute() {
    const value = command.trim();
    if (!value) return;
    const destructive =
      /\/(remove|reset-configuration|reboot|shutdown|format-drive|sup-output)/i.test(value);
    if (destructive && !window.confirm(`Lệnh này có thể thay đổi ${deviceName}. Tiếp tục?`)) return;

    setRunning(true);
    setOutput(`> ${value}\nĐang thực thi...`);
    try {
      const result = await deviceApi.terminal(deviceId, { command: value, confirm: destructive });
      setOutput(
        `> ${value}\n${result.message}\nHoàn tất: ${new Date(result.finishedAt).toLocaleString()}\n\n${JSON.stringify(result.data ?? [], null, 2)}`,
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
      <p className="muted">
        Nhập lệnh theo dạng API RouterOS, ví dụ <code>/interface/print</code> hoặc{' '}
        <code>/ping address=8.8.8.8 count=4</code>.
      </p>
      <div className="terminal-command-row">
        <input
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void execute();
          }}
          spellCheck={false}
        />
        <button
          className="small-button primary-button"
          type="button"
          onClick={() => void execute()}
          disabled={running}
        >
          {running ? 'Đang chạy...' : 'Run'}
        </button>
      </div>
      <pre className="terminal-output">{output || 'Sẵn sàng.'}</pre>
    </section>
  );
}
