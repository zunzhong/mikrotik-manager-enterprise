#ifndef MyAppVersion
  #define MyAppVersion "4.1.13"
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
function PowerShellSingleQuoted(Value: String): String;
begin
  Result := Value;
  StringChangeEx(Result, '''', '''''', True);
  Result := '''' + Result + '''';
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
  StopCommand: String;
begin
  Result := '';
  NeedsRestart := False;
  ResultCode := -1;

  { Không gọi MME-Control.ps1 cũ ở đây: bản cũ có thể trả về trước khi }
  { node.exe thực sự thoát, làm query_engine-windows.dll.node còn bị khóa. }
  StopCommand :=
    '$ErrorActionPreference=''Stop''; ' +
    '$app=' + PowerShellSingleQuoted(ExpandConstant('{app}')) + '; ' +
    '$service=Get-Service -Name MME -ErrorAction SilentlyContinue; ' +
    'if($service -and $service.Status -ne ''Stopped''){ ' +
      'Stop-Service -Name MME -Force -ErrorAction SilentlyContinue; ' +
      'try { $service.WaitForStatus([ServiceProcess.ServiceControllerStatus]::Stopped,[TimeSpan]::FromSeconds(20)) } catch {} }; ' +
    '$deadline=(Get-Date).AddSeconds(15); ' +
    'do { ' +
      '$processes=@(Get-CimInstance Win32_Process | Where-Object { ' +
        '($_.Name -ieq ''node.exe'' -or $_.Name -ieq ''MME.Service.exe'') -and ' +
        '(($_.ExecutablePath -and $_.ExecutablePath.StartsWith($app,[StringComparison]::OrdinalIgnoreCase)) -or ' +
        '($_.CommandLine -and $_.CommandLine.IndexOf($app,[StringComparison]::OrdinalIgnoreCase) -ge 0)) }); ' +
      'foreach($process in $processes){ Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue }; ' +
      'if($processes.Count -eq 0){ break }; Start-Sleep -Milliseconds 300 ' +
    '} while((Get-Date) -lt $deadline); ' +
    '$remaining=@(Get-CimInstance Win32_Process | Where-Object { ' +
      '($_.Name -ieq ''node.exe'' -or $_.Name -ieq ''MME.Service.exe'') -and ' +
      '(($_.ExecutablePath -and $_.ExecutablePath.StartsWith($app,[StringComparison]::OrdinalIgnoreCase)) -or ' +
      '($_.CommandLine -and $_.CommandLine.IndexOf($app,[StringComparison]::OrdinalIgnoreCase) -ge 0)) }); ' +
    'if($remaining.Count -gt 0){ exit 32 }; ' +
    '$locked=@(); ' +
    'if(Test-Path $app){ ' +
      '$engines=@(Get-ChildItem -Path $app -Recurse -Filter ''query_engine-windows*.dll.node'' -ErrorAction SilentlyContinue); ' +
      'foreach($engine in $engines){ try { ' +
        '$stream=[IO.File]::Open($engine.FullName,[IO.FileMode]::Open,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None); ' +
        '$stream.Dispose() ' +
      '} catch { $locked += $engine.FullName } } }; ' +
    'if($locked.Count -gt 0){ exit 33 }';

  if (not Exec('powershell.exe',
    '-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "' + StopCommand + '"',
    '', SW_HIDE, ewWaitUntilTerminated, ResultCode)) or (ResultCode <> 0) then
    Result := 'Không thể giải phóng tiến trình MME đang sử dụng tệp chương trình (mã ' +
      IntToStr(ResultCode) + '). ' +
      'Hãy đóng cửa sổ MME rồi chạy lại bộ cài bằng quyền Administrator. ' +
      'Không chọn bỏ qua tệp DLL.';
end;
