param(
  [ValidateSet('install', 'start', 'stop', 'restart', 'open', 'status', 'backup', 'uninstall', 'validate')]
  [string]$Action = 'start',
  [switch]$NoOpen,
  [string]$DataRoot = ''
)

$ErrorActionPreference = 'Stop'
$AppDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$CommonAppData = [Environment]::GetFolderPath('CommonApplicationData')
if ([string]::IsNullOrWhiteSpace($DataRoot)) {
  if ([string]::IsNullOrWhiteSpace($CommonAppData)) { throw 'Windows không cung cấp đường dẫn ProgramData.' }
  $DataRoot = Join-Path $CommonAppData 'MikroTik Manager Enterprise'
}
$DataDir = [IO.Path]::GetFullPath($DataRoot)
$Runtime = Join-Path $AppDir 'runtime\node.exe'
$ServiceExe = Join-Path $AppDir 'service\MME.Service.exe'
$ServiceXml = Join-Path $AppDir 'service\MME.Service.xml'
$Database = Join-Path $DataDir 'data\mme.db'
$BackupDir = Join-Path $DataDir 'backups'
$LogDir = Join-Path $DataDir 'logs'
$ConfigFile = Join-Path $DataDir 'config\mme.env'
$BootstrapLog = Join-Path $LogDir 'bootstrap.log'
$Port = 3000

function Write-BootstrapLog([string]$Message) {
  New-Item -ItemType Directory -Force $LogDir | Out-Null
  "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff') $Message" | Add-Content $BootstrapLog -Encoding UTF8
}

function Assert-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Thao tác này cần quyền Administrator.'
  }
}

function Assert-Prerequisites {
  Assert-Administrator
  if (-not [Environment]::Is64BitOperatingSystem) { throw 'MME chỉ hỗ trợ Windows x64.' }
  if ([Environment]::OSVersion.Version.Build -lt 19045) {
    throw 'Yêu cầu Windows 10 22H2 (build 19045) hoặc Windows 11 mới hơn.'
  }
  if (-not (Test-Path $Runtime)) { throw 'Thiếu Node.js runtime đi kèm bộ cài.' }
  if (-not (Test-Path $ServiceExe)) { throw 'Thiếu Windows Service wrapper đi kèm bộ cài.' }
  $driveRoot = [IO.Path]::GetPathRoot($DataDir)
  if ([string]::IsNullOrWhiteSpace($driveRoot)) { throw 'Không xác định được ổ đĩa lưu dữ liệu.' }
  $driveName = $driveRoot.Substring(0, 1)
  $drive = Get-PSDrive -Name $driveName
  if ($drive.Free -lt 2GB) { throw 'Cần tối thiểu 2 GB dung lượng trống.' }
}

function New-Secret([int]$Bytes = 32) {
  $buffer = New-Object byte[] $Bytes
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($buffer) } finally { $rng.Dispose() }
  return ([BitConverter]::ToString($buffer) -replace '-', '').ToLowerInvariant()
}

function Read-Environment {
  $values = @{}
  if (Test-Path $ConfigFile) {
    Get-Content $ConfigFile | Where-Object { $_ -match '^[A-Z0-9_]+=' } | ForEach-Object {
      $name, $value = $_ -split '=', 2
      $values[$name] = $value
    }
  }
  return $values
}

function Initialize-Environment {
  New-Item -ItemType Directory -Force (Split-Path $ConfigFile), (Split-Path $Database), $BackupDir, $LogDir | Out-Null
  if (Test-Path $ConfigFile) {
    $existingConfig = [IO.File]::ReadAllText($ConfigFile)
    if ($existingConfig -match '(?m)^APP_VERSION=') {
      $existingConfig = [Text.RegularExpressions.Regex]::Replace($existingConfig, '(?m)^APP_VERSION=.*$', 'APP_VERSION=4.1.11')
    } else {
      $existingConfig = $existingConfig.TrimEnd() + "`r`nAPP_VERSION=4.1.11`r`n"
    }
    [IO.File]::WriteAllText($ConfigFile, $existingConfig, (New-Object Text.UTF8Encoding($false)))
    return
  }
  $adminPassword = New-Secret 12
  $content = @"
NODE_ENV=production
APP_NAME=mikrotik-manager-enterprise
APP_VERSION=4.1.11
SERVER_HOST=127.0.0.1
SERVER_PORT=$Port
DATABASE_URL=file:$($Database.Replace('\','/'))
JWT_SECRET=$(New-Secret 32)
ENCRYPTION_KEY=$(New-Secret 32)
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=$adminPassword
BACKUP_STORAGE_PATH=$($BackupDir.Replace('\','/'))
WEB_DIST_PATH=$((Join-Path $AppDir 'web').Replace('\','/'))
SQLITE_SCHEMA_SQL=$((Join-Path $AppDir 'prisma\schema.sqlite.sql').Replace('\','/'))
LOG_LEVEL=info
"@
  [IO.File]::WriteAllText($ConfigFile, $content, (New-Object Text.UTF8Encoding($false)))
  $credentialsDirectory = [Environment]::GetFolderPath('Desktop')
  if ([string]::IsNullOrWhiteSpace($credentialsDirectory) -or -not (Test-Path $credentialsDirectory)) {
    $credentialsDirectory = Split-Path $ConfigFile
  }
  $credentials = Join-Path $credentialsDirectory 'MME-Thong-Tin-Dang-Nhap.txt'
  [IO.File]::WriteAllText($credentials, "URL: http://localhost:$Port`r`nEmail: admin@example.com`r`nMat khau: $adminPassword`r`n`r`nHay doi mat khau ngay sau lan dang nhap dau tien.", (New-Object Text.UTF8Encoding($false)))
}

function Set-ProcessEnvironment {
  foreach ($item in (Read-Environment).GetEnumerator()) {
    [Environment]::SetEnvironmentVariable($item.Key, $item.Value, 'Process')
  }
}

function Backup-Data {
  if (-not (Test-Path $Database)) { return $null }
  New-Item -ItemType Directory -Force $BackupDir | Out-Null
  $target = Join-Path $BackupDir "mme-before-upgrade-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
  Compress-Archive -Path (Join-Path $DataDir 'data\*'), $ConfigFile -DestinationPath $target -CompressionLevel Optimal
  return $target
}

function Restore-Data([string]$Archive) {
  if (-not $Archive -or -not (Test-Path $Archive)) { return }
  $temporary = Join-Path $env:TEMP "mme-rollback-$([Guid]::NewGuid())"
  try {
    Expand-Archive -Path $Archive -DestinationPath $temporary -Force
    $backupDatabase = Join-Path $temporary 'mme.db'
    if (-not (Test-Path $backupDatabase)) { $backupDatabase = Join-Path $temporary 'data\mme.db' }
    if (Test-Path $backupDatabase) { Copy-Item $backupDatabase $Database -Force }
  } finally {
    Remove-Item $temporary -Recurse -Force -ErrorAction SilentlyContinue
  }
}

function Write-ServiceConfiguration {
  $serverEntry = '"' + (Join-Path $AppDir 'dist\server.js') + '"'
  $environmentLines = (Read-Environment).GetEnumerator() | ForEach-Object {
    $name = [Security.SecurityElement]::Escape($_.Key)
    $value = [Security.SecurityElement]::Escape($_.Value)
    "  <env name=`"$name`" value=`"$value`" />"
  }
  $xml = @"
<service>
  <id>MME</id>
  <name>MikroTik Manager Enterprise</name>
  <description>Dịch vụ quản lý và giám sát MikroTik Enterprise.</description>
  <executable>$([Security.SecurityElement]::Escape($Runtime))</executable>
  <arguments>$([Security.SecurityElement]::Escape($serverEntry))</arguments>
  <workingdirectory>$([Security.SecurityElement]::Escape($AppDir))</workingdirectory>
$($environmentLines -join "`r`n")
  <logpath>$([Security.SecurityElement]::Escape($LogDir))</logpath>
  <log mode="roll-by-size-time"><sizeThreshold>10240</sizeThreshold><pattern>yyyyMMdd</pattern><autoRollAtTime>00:00:00</autoRollAtTime><zipOlderThanNumDays>7</zipOlderThanNumDays></log>
  <onfailure action="restart" delay="10 sec" />
  <stoptimeout>30 sec</stoptimeout>
</service>
"@
  [IO.File]::WriteAllText($ServiceXml, $xml, (New-Object Text.UTF8Encoding($false)))
}

function Get-MMERuntimeProcesses {
  return @(Get-CimInstance Win32_Process | Where-Object {
    ($_.Name -ieq 'node.exe' -or $_.Name -ieq 'MME.Service.exe') -and
    (
      ($_.ExecutablePath -and $_.ExecutablePath.StartsWith($AppDir, [StringComparison]::OrdinalIgnoreCase)) -or
      ($_.CommandLine -and $_.CommandLine.IndexOf($AppDir, [StringComparison]::OrdinalIgnoreCase) -ge 0)
    )
  })
}

function Stop-MMERuntime([int]$TimeoutSeconds = 30) {
  $service = Get-Service -Name MME -ErrorAction SilentlyContinue
  if ($service -and $service.Status -ne 'Stopped') {
    Stop-Service -Name MME -Force -ErrorAction SilentlyContinue
    try {
      $service.WaitForStatus(
        [ServiceProcess.ServiceControllerStatus]::Stopped,
        [TimeSpan]::FromSeconds([Math]::Min($TimeoutSeconds, 20))
      )
    } catch {
      Write-BootstrapLog 'Windows Service chưa dừng đúng hạn; sẽ giải phóng tiến trình runtime.'
    }
  }

  if (Test-Path $ServiceExe) {
    try { & $ServiceExe stop 2>$null | Out-Null } catch { }
  }

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $processes = @(Get-MMERuntimeProcesses)
    if ($processes.Count -eq 0) { return }
    foreach ($process in $processes) {
      Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 300
  } while ((Get-Date) -lt $deadline)

  $remaining = @(Get-MMERuntimeProcesses)
  if ($remaining.Count -gt 0) {
    throw "Không thể giải phóng tiến trình MME: $($remaining.ProcessId -join ', ')."
  }
}

function Wait-MMEHealthy([int]$TimeoutSeconds = 60) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $healthUrl = "http://127.0.0.1:$Port/ready"
  do {
    try {
      $response = Invoke-RestMethod -Uri $healthUrl -Method Get -TimeoutSec 3
      if ($response.status -eq 'ready') { return }
    } catch {
      # Dịch vụ có thể chưa bind cổng trong vài giây đầu.
    }
    Start-Sleep -Seconds 2
  } while ((Get-Date) -lt $deadline)

  $service = Get-Service -Name MME -ErrorAction SilentlyContinue
  $state = if ($service) { $service.Status } else { 'không tồn tại' }
  throw "Dịch vụ MME không sẵn sàng sau $TimeoutSeconds giây (trạng thái: $state). Xem log tại: $LogDir"
}

function Install-MME {
  Write-BootstrapLog 'Bắt đầu preflight.'
  Assert-Prerequisites
  Write-BootstrapLog 'Preflight đạt.'
  Stop-MMERuntime
  Write-BootstrapLog 'Đã dừng hoàn toàn runtime MME cũ.'
  Initialize-Environment
  Write-BootstrapLog 'Đã khởi tạo cấu hình và thư mục dữ liệu.'
  $backup = Backup-Data
  Set-ProcessEnvironment
  try {
    Write-BootstrapLog 'Bắt đầu khởi tạo SQLite.'
    # Windows PowerShell 5.1 chuyển mọi nội dung stderr của native process thành
    # ErrorRecord. Node.js hiện ghi cảnh báo SQLite experimental ra stderr dù
    # tiến trình kết thúc thành công, vì vậy tạm cho phép thu thập cả hai luồng
    # và chỉ quyết định thành công/thất bại bằng exit code thực tế của Node.js.
    $previousErrorActionPreference = $ErrorActionPreference
    try {
      $ErrorActionPreference = 'Continue'
      $setupOutput = & $Runtime (Join-Path $AppDir 'dist\scripts\setup-native.js') 2>&1
      $setupExitCode = $LASTEXITCODE
    } finally {
      $ErrorActionPreference = $previousErrorActionPreference
    }
    if ($setupOutput) { $setupOutput | Out-String | Add-Content $BootstrapLog -Encoding UTF8 }
    if ($setupExitCode -ne 0) { throw "Khởi tạo SQLite hoặc tài khoản quản trị thất bại (exit code: $setupExitCode)." }
    Write-BootstrapLog 'Khởi tạo SQLite đạt.'
  } catch {
    Restore-Data $backup
    throw "Nâng cấp thất bại; dữ liệu đã được rollback. $($_.Exception.Message)"
  }
  Write-ServiceConfiguration
  Write-BootstrapLog 'Đã tạo cấu hình Windows Service.'
  & $ServiceExe uninstall *> $null
  & $ServiceExe install
  if ($LASTEXITCODE -ne 0) { throw 'Không thể đăng ký Windows Service MME.' }
  & $ServiceExe start
  if ($LASTEXITCODE -ne 0) { throw 'Không thể khởi động Windows Service MME.' }
  Write-BootstrapLog 'Windows Service đã nhận lệnh khởi động.'
  try {
    Wait-MMEHealthy
  } catch {
    & $ServiceExe stop *> $null
    & $ServiceExe uninstall *> $null
    Restore-Data $backup
    throw
  }
  Write-BootstrapLog 'Cài đặt MME hoàn tất và API đã sẵn sàng.'
  if (-not $NoOpen) { Start-Process "http://localhost:$Port/setup" }
}

try {
  Write-BootstrapLog "Thực thi tác vụ: $Action"
  switch ($Action) {
    'install' { Install-MME }
    'start' { Assert-Administrator; & $ServiceExe start; Start-Process "http://localhost:$Port" }
    'stop' { Assert-Administrator; Stop-MMERuntime }
    'restart' { Assert-Administrator; Stop-MMERuntime; & $ServiceExe start }
    'open' { Start-Process "http://localhost:$Port" }
    'status' { Get-Service -Name MME -ErrorAction SilentlyContinue | Format-List; Read-Host 'Nhấn Enter để đóng' }
    'backup' { Assert-Administrator; Backup-Data }
    'uninstall' { Assert-Administrator; Stop-MMERuntime; & $ServiceExe uninstall }
    'validate' { Write-BootstrapLog 'Windows PowerShell validation đạt.' }
  }
} catch {
  try { Write-BootstrapLog "LỖI: $($_ | Out-String)" } catch { }
  if (-not $NoOpen) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show($_.Exception.Message, 'MikroTik Manager Enterprise', 'OK', 'Error') | Out-Null
  } else {
    Write-Error $_.Exception.Message
  }
  exit 1
}
