#ifndef MyAppVersion
  #define MyAppVersion "4.1.2"
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

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "..\..\artifacts\payload\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
Name: "{commonappdata}\MikroTik Manager Enterprise"
Name: "{commonappdata}\MikroTik Manager Enterprise\data"
Name: "{commonappdata}\MikroTik Manager Enterprise\config"
Name: "{commonappdata}\MikroTik Manager Enterprise\backups"
Name: "{commonappdata}\MikroTik Manager Enterprise\logs"

[Icons]
Name: "{group}\Open Dashboard"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\packaging\windows\MME-Control.ps1"" open"
Name: "{group}\Start MME"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\packaging\windows\MME-Control.ps1"" start"
Name: "{group}\Stop MME"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\packaging\windows\MME-Control.ps1"" stop"
Name: "{group}\Service Status"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\packaging\windows\MME-Control.ps1"" status"
Name: "{group}\Backup Data"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\packaging\windows\MME-Control.ps1"" backup"
Name: "{group}\Open Data Folder"; Filename: "explorer.exe"; Parameters: """{commonappdata}\MikroTik Manager Enterprise"""
Name: "{autodesktop}\MikroTik Manager Enterprise"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\packaging\windows\MME-Control.ps1"" open"

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File ""{app}\packaging\windows\MME-Control.ps1"" install -NoOpen -DataRoot ""{commonappdata}\MikroTik Manager Enterprise"""; Description: "Khởi tạo và chạy MikroTik Manager Enterprise"; Flags: runhidden waituntilterminated

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File ""{app}\packaging\windows\MME-Control.ps1"" uninstall -NoOpen -DataRoot ""{commonappdata}\MikroTik Manager Enterprise"""; Flags: runhidden waituntilterminated; RunOnceId: "StopMMEService"

[Code]
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
  ControlScript: String;
begin
  Result := '';
  ControlScript := ExpandConstant('{app}\packaging\windows\MME-Control.ps1');
  if FileExists(ControlScript) then
  begin
    if not Exec('powershell.exe',
      '-NoProfile -ExecutionPolicy Bypass -File "' + ControlScript + '" stop',
      '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
      Result := 'Không thể dừng dịch vụ MME trước khi nâng cấp.'
  end;
end;
