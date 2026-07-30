import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = fileURLToPath(new URL('../../../../', import.meta.url));

function read(relativePath: string): string {
  return readFileSync(`${repositoryRoot}${relativePath}`, 'utf8');
}

describe('Windows in-place upgrade assets', () => {
  it('keeps both PowerShell 5.1 scripts encoded with UTF-8 BOM', () => {
    for (const fileName of ['MME-Control.ps1', 'MME-PreInstall.ps1']) {
      const content = readFileSync(`${repositoryRoot}packaging/windows/${fileName}`);
      expect([...content.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    }
  });

  it('extracts and executes the pre-install guard before replacing payload files', () => {
    const installer = read('packaging/windows/mme-installer.iss');
    expect(installer).toContain('Source: "MME-PreInstall.ps1"; Flags: dontcopy');
    expect(installer).toContain("ExtractTemporaryFile('MME-PreInstall.ps1')");
    expect(installer.indexOf('Source: "MME-PreInstall.ps1"')).toBeLessThan(
      installer.indexOf('Source: "..\\..\\artifacts\\payload\\*"'),
    );
    expect(installer).toContain('DestDir: "{app}\\releases\\{#MyAppVersion}"');
    expect(installer).toContain('SetupMutex=Global\\MikroTikManagerEnterpriseInstaller');
    expect(installer).toContain('procedure DeinitializeSetup()');
    expect(installer).toContain('-RollbackOnly');
    expect(installer).toContain(
      '{app}\\releases\\{#MyAppVersion}\\packaging\\windows\\MME-Control.ps1',
    );
    expect(installer).toContain('AfterInstall: RunPostInstall');
    expect(installer).toContain('MME-PostInstall.marker');
    expect(installer).toContain('procedure RunPostInstall()');
    expect(installer).toContain('function GetCustomSetupExitCode: Integer');
    expect(installer).toContain('PostInstallFailed := True');
    expect(installer).toContain('Result := 100');
    expect(installer).not.toContain('RaiseException(');
    expect(installer).toContain('(ResultCode <> 0)');
    expect(installer).not.toContain('[Run]');
  });

  it('guards every executable/native file class and restores the old service on failure', () => {
    const preInstall = read('packaging/windows/MME-PreInstall.ps1');
    expect(preInstall).toContain("@('.exe', '.dll', '.node')");
    expect(preInstall).toContain('taskkill.exe /PID');
    expect(preInstall).toContain('Get-LockedCriticalFiles');
    expect(preInstall).toContain('Restore-PreviousService');
    expect(preInstall).toContain('Restore-SavedService');
    expect(preInstall).toContain('[switch]$RollbackOnly');
    expect(preInstall).toContain('upgrade-state.json');
    expect(preInstall).toContain('previousServiceExe');
    expect(preInstall).toContain('Get-MMEProcessTree');
    const control = read('packaging/windows/MME-Control.ps1');
    expect(control).toContain('Restore-PreviousReleaseService');
    expect(control).toContain('Clear-UpgradeState');
  });

  it('stress-tests three upgrades and verifies installed hashes in Windows CI', () => {
    const workflow = read('.github/workflows/platform-installers.yml');
    expect(workflow).toContain('for ($cycle = 1; $cycle -le 3; $cycle++)');
    expect(workflow).toContain('Assert-InstalledCriticalFiles');
    expect(workflow).toContain('mme-upgrade-lock-test.js');
    expect(workflow).toContain('upgrade-external-lock-test.dll');
    expect(workflow).toContain('Service cũ không được phục hồi');
    expect(workflow).toContain('mô phỏng hủy/lỗi giải nén');
    expect(workflow).toContain('-RollbackOnly');
    expect(workflow).toContain('upgrade-preflight.log');
  });

  it('offers compatible default ports and verifies separate frontend/backend ports', () => {
    const installer = read('packaging/windows/mme-installer.iss');
    const control = read('packaging/windows/MME-Control.ps1');
    const workflow = read('.github/workflows/platform-installers.yml');

    expect(installer).toContain("'Cấu hình cổng MME'");
    expect(installer).toContain('UseDefaultPortsCheck.Checked := True');
    expect(installer).toContain('{param:BACKENDPORT|}');
    expect(installer).toContain('{param:FRONTENDPORT|}');
    expect(installer).toContain(`'" -BackendPort ' + GetBackendPort('')`);
    expect(installer).toContain(`' -FrontendPort ' + GetFrontendPort('')`);
    expect(installer).toContain('Port := StrToIntDef(Trim(Value), -1)');
    expect(installer).not.toContain('TryStrToInt');
    expect(control).toContain('[int]$BackendPort = 0');
    expect(control).toContain('[int]$FrontendPort = 0');
    expect(control).toContain('Assert-PortAvailable $BackendRuntimePort');
    expect(control).toContain('FRONTEND_PORT=$FrontendRuntimePort');
    expect(workflow).toContain("'/FRONTENDPORT=3080'");
    expect(workflow).toContain('Assert-SeparateFrontendPort');
    expect(workflow).toContain("smoke-frontend-assets.mjs 'http://127.0.0.1:3000'");
    expect(workflow).toContain("smoke-frontend-assets.mjs 'http://127.0.0.1:3080'");
  });

  it('installs and verifies the centralized Syslog listener on Windows', () => {
    const control = read('packaging/windows/MME-Control.ps1');
    const workflow = read('.github/workflows/platform-installers.yml');

    expect(control).toContain('SYSLOG_PORT=$DefaultSyslogPort');
    expect(control).toContain('Ensure-SyslogFirewall');
    expect(control).toContain("New-NetFirewallRule -DisplayName 'MME Syslog UDP'");
    expect(control).toContain("New-NetFirewallRule -DisplayName 'MME Syslog TCP'");
    expect(control).toContain('Remove-SyslogFirewall');
    expect(control).toContain('Resolve-SyslogPort');
    expect(control).toContain('Test-SyslogPortAvailable');
    expect(control).toContain('@(5514, 6514, 10514)');
    expect(control).toContain('Write-InstallState');
    expect(control).toContain('Write-InitialCredentials');
    expect(control).toContain('Write-InitialCredentials -FreshDatabase:(-not $hadDatabase)');
    expect(control).toContain('Restore-InstallTransaction');
    expect(control).toContain('Remove-Item $Database, "$Database-wal", "$Database-shm"');
    expect(control).toContain("Join-Path $DataDir 'MME-Thong-Tin-Dang-Nhap.txt'");
    expect(workflow).toContain('Assert-Syslog');
    expect(workflow).toContain("smoke-syslog.mjs 'http://127.0.0.1:3000'");
    expect(workflow).toContain('syslog-windows-smoke.json');
    expect(workflow).toContain('SYSLOG_PORT_LOCKED');
    expect(workflow).toContain('Installer phải trả exit code 100');
    expect(workflow).toContain('install-state.json');
  });
});
