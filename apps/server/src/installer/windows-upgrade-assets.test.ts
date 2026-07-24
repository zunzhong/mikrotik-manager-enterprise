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
    expect(installer).toContain('-BackendPort {code:GetBackendPort}');
    expect(installer).toContain('-FrontendPort {code:GetFrontendPort}');
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
});
