#ifndef MyAppVersion
  #define MyAppVersion "5.8.7"
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
; Process this explicit final file only after the complete payload has been extracted.
; RunPostInstall records any bootstrap failure. GetCustomSetupExitCode then
; guarantees that Setup.exe returns MME's dedicated non-zero exit code 100.
Source: "..\..\artifacts\payload\packaging\windows\MME-PostInstall.marker"; DestDir: "{app}\releases\{#MyAppVersion}\packaging\windows"; Flags: ignoreversion; AfterInstall: RunPostInstall

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

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File ""{app}\releases\{#MyAppVersion}\packaging\windows\MME-Control.ps1"" uninstall -NoOpen -DataRoot ""{commonappdata}\MikroTik Manager Enterprise"""; Flags: runhidden waituntilterminated; RunOnceId: "StopMMEService"

[Code]
var
  UpgradeGuardExecuted: Boolean;
  UpgradeGuardScriptPath: String;
  UpgradeGuardLogPath: String;
  PortPage: TInputQueryWizardPage;
  UseDefaultPortsCheck: TNewCheckBox;
  PostInstallFailed: Boolean;
  PostInstallChildExitCode: Integer;
  PostInstallFailureMessage: String;

procedure TogglePortInputs(Sender: TObject);
begin
  PortPage.Edits[0].Enabled := not UseDefaultPortsCheck.Checked;
  PortPage.Edits[1].Enabled := not UseDefaultPortsCheck.Checked;
end;

procedure InitializeWizard();
begin
  PortPage := CreateInputQueryPage(
    wpSelectDir,
    'Cấu hình cổng MME',
    'Backend/API và frontend/dashboard',
    'Đánh dấu bỏ qua để dùng chế độ tương thích mặc định: backend và frontend chung cổng 3000.'
  );
  PortPage.Add('Cổng backend/API:', False);
  PortPage.Add('Cổng frontend/dashboard:', False);
  PortPage.Values[0] := '3000';
  PortPage.Values[1] := '3000';

  UseDefaultPortsCheck := TNewCheckBox.Create(PortPage);
  UseDefaultPortsCheck.Parent := PortPage.Surface;
  UseDefaultPortsCheck.Top := PortPage.Edits[1].Top + PortPage.Edits[1].Height + ScaleY(16);
  UseDefaultPortsCheck.Left := PortPage.Edits[1].Left;
  UseDefaultPortsCheck.Width := PortPage.Edits[1].Width;
  UseDefaultPortsCheck.Caption := 'Bỏ qua tùy chỉnh và dùng cổng mặc định';
  UseDefaultPortsCheck.Checked := True;
  UseDefaultPortsCheck.OnClick := @TogglePortInputs;
  TogglePortInputs(nil);
end;

function IsValidPort(const Value: String): Boolean;
var
  Port: LongInt;
begin
  { Use the integer parser provided by Inno Setup Pascal Script. }
  Port := StrToIntDef(Trim(Value), -1);
  Result := (Port >= 1) and (Port <= 65535);
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if (CurPageID = PortPage.ID) and (not UseDefaultPortsCheck.Checked) then
  begin
    if not IsValidPort(Trim(PortPage.Values[0])) then
    begin
      MsgBox('Cổng backend/API phải là số từ 1 đến 65535.', mbError, MB_OK);
      Result := False;
      exit;
    end;
    if not IsValidPort(Trim(PortPage.Values[1])) then
    begin
      MsgBox('Cổng frontend/dashboard phải là số từ 1 đến 65535.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

function GetBackendPort(Param: String): String;
var
  CommandLinePort: String;
begin
  CommandLinePort := Trim(ExpandConstant('{param:BACKENDPORT|}'));
  if IsValidPort(CommandLinePort) then Result := CommandLinePort
  else if CommandLinePort <> '' then Result := '-1'
  else if UseDefaultPortsCheck.Checked then Result := '0'
  else Result := Trim(PortPage.Values[0]);
end;

function GetFrontendPort(Param: String): String;
var
  CommandLinePort: String;
begin
  CommandLinePort := Trim(ExpandConstant('{param:FRONTENDPORT|}'));
  if IsValidPort(CommandLinePort) then Result := CommandLinePort
  else if CommandLinePort <> '' then Result := '-1'
  else if UseDefaultPortsCheck.Checked then Result := '0'
  else Result := Trim(PortPage.Values[1]);
end;

procedure RunPostInstall();
var
  ResultCode: Integer;
  Parameters: String;
  BootstrapLogPath: String;
  BootstrapFailurePath: String;
  FailureDetails: String;
  FailureLines: TArrayOfString;
  FailureLineIndex: Integer;
begin
  ResultCode := -1;
  BootstrapLogPath := ExpandConstant(
    '{commonappdata}\MikroTik Manager Enterprise\logs\bootstrap.log'
  );
  BootstrapFailurePath := ExpandConstant(
    '{commonappdata}\MikroTik Manager Enterprise\logs\bootstrap-error.txt'
  );
  Parameters := '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' +
    ExpandConstant(
      '{app}\releases\{#MyAppVersion}\packaging\windows\MME-Control.ps1'
    ) +
    '" install -NoOpen -DataRoot "' +
    ExpandConstant('{commonappdata}\MikroTik Manager Enterprise') +
    '" -BackendPort ' + GetBackendPort('') +
    ' -FrontendPort ' + GetFrontendPort('');

  if (not Exec(
    'powershell.exe',
    Parameters,
    '',
    SW_HIDE,
    ewWaitUntilTerminated,
    ResultCode
  )) or (ResultCode <> 0) then
  begin
    PostInstallFailed := True;
    PostInstallChildExitCode := ResultCode;
    FailureDetails := '';
    if LoadStringsFromFile(BootstrapFailurePath, FailureLines) then
    begin
      for FailureLineIndex := 0 to GetArrayLength(FailureLines) - 1 do
      begin
        if FailureDetails <> '' then
          FailureDetails := FailureDetails + #13#10;
        FailureDetails := FailureDetails + FailureLines[FailureLineIndex];
      end;
      if Length(FailureDetails) > 1600 then
        FailureDetails := Copy(FailureDetails, 1, 1600) + '...';
    end;
    PostInstallFailureMessage :=
      'MME initialization failed (child exit code ' + IntToStr(ResultCode) +
      '). Setup will return exit code 100.' + #13#10 + #13#10;
    if FailureDetails <> '' then
      PostInstallFailureMessage := PostInstallFailureMessage + FailureDetails + #13#10 + #13#10;
    PostInstallFailureMessage := PostInstallFailureMessage +
      'Full diagnostic log: ' + BootstrapLogPath;
    Log(PostInstallFailureMessage);
    if not WizardSilent then
      MsgBox(PostInstallFailureMessage, mbError, MB_OK);
  end;
end;

function GetCustomSetupExitCode: Integer;
begin
  if PostInstallFailed then
  begin
    Log(
      'Returning MME bootstrap failure exit code 100; child exit code was ' +
      IntToStr(PostInstallChildExitCode)
    );
    Result := 100;
  end
  else
    Result := 0;
end;

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
