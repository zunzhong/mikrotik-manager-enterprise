#ifndef MyAppVersion
  #define MyAppVersion "5.4.0"
#endif

#define MyAppName "MikroTik Manager Enterprise"
#define MyAppPublisher "MikroTik Manager Enterprise Community"
#define MyAppURL "https://github.com/zunzhong/mikrotik-manager-enterprise"

[Setup]
AppId={{5DB4C77A-3CA2-4DD8-8C6F-7528454A2D85}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={autopf}\MikroTik Manager Enterprise
DefaultGroupName={#MyAppName}
OutputDir=..\..\artifacts
OutputBaseFilename=MikroTik-Manager-Enterprise-Setup-{#MyAppVersion}-x64
Compression=lzma2/ultra64
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
WizardStyle=modern
MinVersion=10.0.19045
CloseApplications=yes
RestartApplications=no
SetupLogging=yes
SetupIconFile=mme-logo.ico
SetupMutex=Global\MikroTikManagerEnterpriseInstaller

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "MME-PreInstall.ps1"; Flags: dontcopy
Source: "..\..\artifacts\payload\*"; DestDir: "{app}\releases\{#MyAppVersion}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
Name: "{commonappdata}\MikroTik Manager Enterprise"
Name: "{commonappdata}\MikroTik Manager Enterprise\data"
Name: "{commonappdata}\MikroTik Manager Enterprise\config"
Name: "{commonappdata}\MikroTik Manager Enterprise\backups"
Name: "{commonappdata}\MikroTik Manager Enterprise\logs"

[Icons]
Name: "{group}\Open Dashboard"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\releases\{#MyAppVersion}\packaging\windows\MME-Control.ps1"" open"; IconFilename: "{app}\releases\{#MyAppVersion}\packaging\windows\mme-logo.ico"
Name: "{group}\Start MME"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\releases\{#MyAppVersion}\packaging\windows\MME-Control.ps1"" start"; IconFilename: "{app}\releases\{#MyAppVersion}\packaging\windows\mme-logo.ico"
Name: "{group}\Stop MME"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\releases\{#MyAppVersion}\packaging\windows\MME-Control.ps1"" stop"; IconFilename: "{app}\releases\{#MyAppVersion}\packaging\windows\mme-logo.ico"
Name: "{group}\Service Status"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\releases\{#MyAppVersion}\packaging\windows\MME-Control.ps1"" status"; IconFilename: "{app}\releases\{#MyAppVersion}\packaging\windows\mme-logo.ico"
Name: "{group}\Backup Data"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\releases\{#MyAppVersion}\packaging\windows\MME-Control.ps1"" backup"; IconFilename: "{app}\releases\{#MyAppVersion}\packaging\windows\mme-logo.ico"
Name: "{group}\Open Data Folder"; Filename: "explorer.exe"; Parameters: """{commonappdata}\MikroTik Manager Enterprise"""; IconFilename: "{app}\releases\{#MyAppVersion}\packaging\windows\mme-logo.ico"
Name: "{autodesktop}\MikroTik Manager Enterprise"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\releases\{#MyAppVersion}\packaging\windows\MME-Control.ps1"" open"; IconFilename: "{app}\releases\{#MyAppVersion}\packaging\windows\mme-logo.ico"

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File ""{app}\releases\{#MyAppVersion}\packaging\windows\MME-Control.ps1"" install -NoOpen -DataRoot ""{commonappdata}\MikroTik Manager Enterprise"""; Description: "Khởi tạo và chạy MikroTik Manager Enterprise"; Flags: runhidden waituntilterminated

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File ""{app}\releases\{#MyAppVersion}\packaging\windows\MME-Control.ps1"" uninstall -NoOpen -DataRoot ""{commonappdata}\MikroTik Manager Enterprise"""; Flags: runhidden waituntilterminated; RunOnceId: "StopMMEService"

[Code]
var
  UpgradeGuardExecuted: Boolean;
  UpgradeGuardScriptPath: String;
  UpgradeGuardLogPath: String;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
  Parameters: String;
begin
  Result := '';
  NeedsRestart := False;
  ResultCode := -1;
  UpgradeGuardExecuted := False;
  ExtractTemporaryFile('MME-PreInstall.ps1');
  UpgradeGuardScriptPath := ExpandConstant('{tmp}\MME-PreInstall.ps1');
  UpgradeGuardLogPath := ExpandConstant('{commonappdata}\MikroTik Manager Enterprise\logs\upgrade-preflight.log');
  Parameters := '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + UpgradeGuardScriptPath +
    '" -AppDir "' + ExpandConstant('{app}') +
    '" -DataRoot "' + ExpandConstant('{commonappdata}\MikroTik Manager Enterprise') +
    '" -LogPath "' + UpgradeGuardLogPath + '"';
  if (not Exec('powershell.exe',
    Parameters,
    '', SW_HIDE, ewWaitUntilTerminated, ResultCode)) or (ResultCode <> 0) then
    Result := 'Không thể chuẩn bị nâng cấp MME an toàn (mã ' + IntToStr(ResultCode) + '). ' +
      'Bộ cài chưa thay đổi file chương trình và đã cố khôi phục service cũ. ' +
      'Xem log: ' + UpgradeGuardLogPath + '. Không chọn bỏ qua bất kỳ file nào.'
  else
    UpgradeGuardExecuted := True;
end;

procedure DeinitializeSetup();
var
  ResultCode: Integer;
  Parameters: String;
begin
  if not UpgradeGuardExecuted then
    exit;

  { MME-Control clears upgrade-state.json only after the new service passes /ready.
    If extraction, post-install initialization or cancellation interrupted Setup,
    this idempotent rollback restores the previous service. }
  Parameters := '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + UpgradeGuardScriptPath +
    '" -AppDir "' + ExpandConstant('{app}') +
    '" -DataRoot "' + ExpandConstant('{commonappdata}\MikroTik Manager Enterprise') +
    '" -LogPath "' + UpgradeGuardLogPath + '" -RollbackOnly';
  if (not Exec('powershell.exe', Parameters, '', SW_HIDE, ewWaitUntilTerminated, ResultCode)) or
    (ResultCode <> 0) then
    Log('MME rollback guard returned exit code ' + IntToStr(ResultCode) +
      '. See ' + UpgradeGuardLogPath);
end;
