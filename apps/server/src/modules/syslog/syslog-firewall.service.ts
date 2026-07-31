import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import type { SyslogReceiverSettings } from './syslog.types.js';

const execFileAsync = promisify(execFile);

export function windowsFirewallArguments(
  settings: SyslogReceiverSettings,
  scriptPath = resolve('packaging/windows/MME-Control.ps1'),
): string[] {
  return [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    scriptPath,
    settings.enabled ? 'firewall' : 'firewall-remove',
    '-NoOpen',
    ...(settings.enabled ? ['-SyslogPort', String(settings.port)] : []),
  ];
}

export class SyslogFirewallService {
  public async sync(settings: SyslogReceiverSettings): Promise<void> {
    if (process.platform !== 'win32') return;
    await execFileAsync('powershell.exe', windowsFirewallArguments(settings), {
      windowsHide: true,
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    });
  }
}

export const syslogFirewallService = new SyslogFirewallService();
