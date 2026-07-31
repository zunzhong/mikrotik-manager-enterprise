param(
  [ValidateSet('install', 'start', 'stop', 'restart', 'open', 'status', 'backup', 'uninstall', 'validate', 'firewall', 'firewall-remove')]
  [string]$Action = 'start',
  [switch]$NoOpen,
  [string]$DataRoot = '',
  [ValidateRange(0, 65535)]
  [int]$BackendPort = 0,
  [ValidateRange(0, 65535)]
  [int]$FrontendPort = 0,
  [ValidateRange(0, 65535)]
  [int]$SyslogPort = 0
)

$ErrorActionPreference = 'Stop'
$AppDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$AppParent = Split-Path -Parent $AppDir
$InstallRoot = if ((Split-Path -Leaf $AppParent) -ieq 'releases') {
  Split-Path -Parent $AppParent
} else {
  $AppDir
}
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
$CredentialsFile = Join-Path $DataDir 'MME-Thong-Tin-Dang-Nhap.txt'
$BootstrapLog = Join-Path $LogDir 'bootstrap.log'
$BootstrapFailureFile = Join-Path $LogDir 'bootstrap-error.txt'
$InstallStateFile = Join-Path $DataDir 'install-state.json'
$UpgradeStateFile = Join-Path $DataDir 'config\upgrade-state.json'
$DefaultPort = 3000
$DefaultSyslogPort = 514
$BackendRuntimePort = if ($BackendPort -gt 0) { $BackendPort } else { $DefaultPort }
$FrontendRuntimePort = if ($FrontendPort -gt 0) { $FrontendPort } else { $BackendRuntimePort }
$script:InstallStage = 'startup'

function Write-BootstrapLog([string]$Message) {
  New-Item -ItemType Directory -Force $LogDir | Out-Null
  "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff') $Message" | Add-Content $BootstrapLog -Encoding UTF8
}

function Set-InstallStage([string]$Stage) {
  $script:InstallStage = $Stage
  Write-BootstrapLog "STAGE: $Stage"
}

function Write-BootstrapFailure([System.Management.Automation.ErrorRecord]$Failure) {
  try {
    New-Item -ItemType Directory -Force $LogDir | Out-Null
    $message = if ($Failure -and $Failure.Exception) {
      [string]$Failure.Exception.Message
    } else {
      [string]$Failure
    }
    $content = @"
Stage: $script:InstallStage
Error: $message
Diagnostic log: $BootstrapLog
"@
    [IO.File]::WriteAllText(
      $BootstrapFailureFile,
      $content.Trim(),
      (New-Object Text.UTF8Encoding($true))
    )
  } catch {
    # The original bootstrap error must remain the installer result.
  }
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

function Set-EnvironmentContentValue([string]$Content, [string]$Name, [string]$Value) {
  if ($Content -match "(?m)^$([Text.RegularExpressions.Regex]::Escape($Name))=") {
    return [Text.RegularExpressions.Regex]::Replace(
      $Content,
      "(?m)^$([Text.RegularExpressions.Regex]::Escape($Name))=.*$",
      "$Name=$Value"
    )
  }
  return $Content.TrimEnd() + "`r`n$Name=$Value`r`n"
}

function Get-EnvironmentContentValue([string]$Content, [string]$Name) {
  $pattern = "(?m)^$([Text.RegularExpressions.Regex]::Escape($Name))=(.*)$"
  if ($Content -match $pattern) { return $Matches[1].Trim() }
  return $null
}

function Resolve-LegacySqlitePath([string]$DatabaseUrl) {
  $candidates = New-Object 'System.Collections.Generic.List[string]'
  $path = $null
  if (-not [string]::IsNullOrWhiteSpace($DatabaseUrl) -and
    $DatabaseUrl.StartsWith('file:', [StringComparison]::OrdinalIgnoreCase)) {
    $path = $DatabaseUrl.Substring(5).Trim().Replace('/', '\')
    if (-not [string]::IsNullOrWhiteSpace($path)) {
      if ([IO.Path]::IsPathRooted($path)) {
        [void]$candidates.Add($path)
      } else {
        foreach ($basePath in @($InstallRoot, $AppDir, $DataDir)) {
          if (-not [string]::IsNullOrWhiteSpace($basePath)) {
            [void]$candidates.Add((Join-Path $basePath $path))
          }
        }
      }
    }
  }

  foreach ($conventionalPath in @(
    (Join-Path $InstallRoot 'data\mme.db'),
    (Join-Path $InstallRoot 'mme.db')
  )) {
    [void]$candidates.Add($conventionalPath)
  }
  $releasesRoot = Join-Path $InstallRoot 'releases'
  if (Test-Path $releasesRoot) {
    foreach ($release in @(Get-ChildItem $releasesRoot -Directory -ErrorAction SilentlyContinue)) {
      if (-not [string]::IsNullOrWhiteSpace($path)) {
        [void]$candidates.Add((Join-Path $release.FullName $path))
      }
      [void]$candidates.Add((Join-Path $release.FullName 'data\mme.db'))
      [void]$candidates.Add((Join-Path $release.FullName 'mme.db'))
    }
  }
  foreach ($candidate in $candidates) {
    try {
      $fullPath = [IO.Path]::GetFullPath($candidate)
      if ((Test-Path $fullPath -PathType Leaf) -and
        -not $fullPath.Equals($Database, [StringComparison]::OrdinalIgnoreCase)) {
        return $fullPath
      }
    } catch {
      # Continue to the next compatibility location.
    }
  }
  return $null
}

function Import-LegacySqliteDatabase([string]$LegacyDatabase) {
  if ([string]::IsNullOrWhiteSpace($LegacyDatabase) -or (Test-Path $Database)) { return }
  New-Item -ItemType Directory -Force (Split-Path $Database) | Out-Null
  Copy-Item $LegacyDatabase $Database -Force
  foreach ($suffix in @('-wal', '-shm')) {
    $sidecar = "$LegacyDatabase$suffix"
    if (Test-Path $sidecar) { Copy-Item $sidecar "$Database$suffix" -Force }
  }
  Write-BootstrapLog "Imported legacy SQLite database into persistent storage: $LegacyDatabase"
}

function Resolve-RuntimePorts {
  $values = Read-Environment
  $configuredBackend = 0
  $configuredFrontend = 0
  if ($values.ContainsKey('SERVER_PORT')) {
    [void][int]::TryParse([string]$values['SERVER_PORT'], [ref]$configuredBackend)
  }
  if ($values.ContainsKey('FRONTEND_PORT')) {
    [void][int]::TryParse([string]$values['FRONTEND_PORT'], [ref]$configuredFrontend)
  }
  $script:BackendRuntimePort = if ($BackendPort -gt 0) {
    $BackendPort
  } elseif ($configuredBackend -ge 1 -and $configuredBackend -le 65535) {
    $configuredBackend
  } else {
    $DefaultPort
  }
  $script:FrontendRuntimePort = if ($FrontendPort -gt 0) {
    $FrontendPort
  } elseif ($configuredFrontend -ge 1 -and $configuredFrontend -le 65535) {
    $configuredFrontend
  } else {
    $script:BackendRuntimePort
  }
}

function Write-InitialCredentials([switch]$FreshDatabase) {
  # Never overwrite credentials for an existing database: the administrator
  # may already have changed the password in MME. This path specifically
  # repairs fresh/partial installs where configuration exists but mme.db does not.
  if (-not $FreshDatabase) { return }
  $values = Read-Environment
  if (-not $values.ContainsKey('DEFAULT_ADMIN_EMAIL') -or
    -not $values.ContainsKey('DEFAULT_ADMIN_PASSWORD')) {
    throw 'Thiếu thông tin quản trị ban đầu trong cấu hình MME.'
  }
  $content = @"
URL: http://localhost:$FrontendRuntimePort
Backend API: http://localhost:$BackendRuntimePort
Email: $($values['DEFAULT_ADMIN_EMAIL'])
Mat khau: $($values['DEFAULT_ADMIN_PASSWORD'])

Hay doi mat khau ngay sau lan dang nhap dau tien.
"@
  [IO.File]::WriteAllText($CredentialsFile, $content, (New-Object Text.UTF8Encoding($false)))
  $desktop = [Environment]::GetFolderPath('Desktop')
  if (-not [string]::IsNullOrWhiteSpace($desktop) -and (Test-Path $desktop)) {
    [IO.File]::WriteAllText(
      (Join-Path $desktop 'MME-Thong-Tin-Dang-Nhap.txt'),
      $content,
      (New-Object Text.UTF8Encoding($false))
    )
  }
}

function Assert-PortAvailable([int]$Port, [string]$Name) {
  $listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, $Port)
  try {
    $listener.Start()
  } catch {
    throw "$Name $Port đang được tiến trình khác sử dụng. Hãy chọn cổng khác hoặc dừng tiến trình đó."
  } finally {
    try { $listener.Stop() } catch { }
  }
}

function Initialize-Environment {
  New-Item -ItemType Directory -Force (Split-Path $ConfigFile), (Split-Path $Database), $BackupDir, $LogDir | Out-Null
  $legacyBackupDir = Join-Path $InstallRoot 'data\backups'
  if (Test-Path $legacyBackupDir) {
    Copy-Item (Join-Path $legacyBackupDir '*') $BackupDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-BootstrapLog 'Đã chuyển file backup cũ sang vùng dữ liệu bền vững.'
  }
  if (Test-Path $ConfigFile) {
    $existingConfig = [IO.File]::ReadAllText($ConfigFile)
    $databaseUrl = Get-EnvironmentContentValue $existingConfig 'DATABASE_URL'
    if ($databaseUrl -and
      -not $databaseUrl.StartsWith('file:', [StringComparison]::OrdinalIgnoreCase)) {
      throw "The Windows installer supports the built-in SQLite database only. Existing DATABASE_URL uses another database engine; no data was changed."
    }
    if (-not (Test-Path $Database)) {
      Import-LegacySqliteDatabase (Resolve-LegacySqlitePath $databaseUrl)
    }
    $existingConfig = Set-EnvironmentContentValue $existingConfig 'DATABASE_URL' "file:$($Database.Replace('\','/'))"
    $existingConfig = Set-EnvironmentContentValue $existingConfig 'NODE_ENV' 'production'
    $existingConfig = Set-EnvironmentContentValue $existingConfig 'APP_NAME' 'mikrotik-manager-enterprise'
    if ($existingConfig -match '(?m)^APP_VERSION=') {
      $existingConfig = [Text.RegularExpressions.Regex]::Replace($existingConfig, '(?m)^APP_VERSION=.*$', 'APP_VERSION=5.9.3')
    } else {
      $existingConfig = $existingConfig.TrimEnd() + "`r`nAPP_VERSION=5.9.3`r`n"
    }
    foreach ($requiredValue in @{
      SERVER_HOST = '127.0.0.1'
      FRONTEND_HOST = '127.0.0.1'
      JWT_SECRET = (New-Secret 32)
      ENCRYPTION_KEY = (New-Secret 32)
      DEFAULT_ADMIN_EMAIL = 'admin@example.com'
      DEFAULT_ADMIN_PASSWORD = (New-Secret 12)
      LOG_LEVEL = 'info'
    }.GetEnumerator()) {
      if ([string]::IsNullOrWhiteSpace(
        [string](Get-EnvironmentContentValue $existingConfig $requiredValue.Key)
      )) {
        $existingConfig = Set-EnvironmentContentValue $existingConfig $requiredValue.Key $requiredValue.Value
        Write-BootstrapLog "Repaired missing required setting: $($requiredValue.Key)"
      }
    }
    $backendForFrontend = $DefaultPort
    if ($BackendPort -gt 0) {
      $backendForFrontend = $BackendPort
      $existingConfig = Set-EnvironmentContentValue $existingConfig 'SERVER_PORT' ([string]$BackendPort)
    } else {
      $configuredBackend = 0
      $configuredBackendValue = Get-EnvironmentContentValue $existingConfig 'SERVER_PORT'
      $backendIsValid = [int]::TryParse(
        [string]$configuredBackendValue,
        [ref]$configuredBackend
      )
      if ($backendIsValid -and $configuredBackend -ge 1 -and $configuredBackend -le 65535) {
        $backendForFrontend = $configuredBackend
      } else {
        $existingConfig = Set-EnvironmentContentValue $existingConfig 'SERVER_PORT' ([string]$DefaultPort)
      }
    }
    if ($FrontendPort -gt 0) {
      $existingConfig = Set-EnvironmentContentValue $existingConfig 'FRONTEND_PORT' ([string]$FrontendPort)
    } else {
      $configuredFrontend = 0
      $configuredFrontendValue = Get-EnvironmentContentValue $existingConfig 'FRONTEND_PORT'
      $frontendIsValid = [int]::TryParse(
        [string]$configuredFrontendValue,
        [ref]$configuredFrontend
      )
      $frontendIsValid = (
        $frontendIsValid -and
        $configuredFrontend -ge 1 -and
        $configuredFrontend -le 65535
      )
      if (-not $frontendIsValid) {
        $existingConfig = Set-EnvironmentContentValue $existingConfig 'FRONTEND_PORT' ([string]$backendForFrontend)
      }
    }
    $persistentBackupPath = $BackupDir.Replace('\','/')
    if ($existingConfig -match '(?m)^BACKUP_STORAGE_DIR=') {
      $existingConfig = [Text.RegularExpressions.Regex]::Replace($existingConfig, '(?m)^BACKUP_STORAGE_DIR=.*$', "BACKUP_STORAGE_DIR=$persistentBackupPath")
    } else {
      $existingConfig = $existingConfig.TrimEnd() + "`r`nBACKUP_STORAGE_DIR=$persistentBackupPath`r`n"
    }
    if ($existingConfig -match '(?m)^BACKUP_STORAGE_PATH=') {
      $existingConfig = [Text.RegularExpressions.Regex]::Replace($existingConfig, '(?m)^BACKUP_STORAGE_PATH=.*$', "BACKUP_STORAGE_PATH=$persistentBackupPath")
    } else {
      $existingConfig = $existingConfig.TrimEnd() + "`r`nBACKUP_STORAGE_PATH=$persistentBackupPath`r`n"
    }
    $webDistPath = (Join-Path $AppDir 'web').Replace('\','/')
    if ($existingConfig -match '(?m)^WEB_DIST_PATH=') {
      $existingConfig = [Text.RegularExpressions.Regex]::Replace($existingConfig, '(?m)^WEB_DIST_PATH=.*$', "WEB_DIST_PATH=$webDistPath")
    } else {
      $existingConfig = $existingConfig.TrimEnd() + "`r`nWEB_DIST_PATH=$webDistPath`r`n"
    }
    $sqliteSchemaPath = (Join-Path $AppDir 'prisma\schema.sqlite.sql').Replace('\','/')
    if ($existingConfig -match '(?m)^SQLITE_SCHEMA_SQL=') {
      $existingConfig = [Text.RegularExpressions.Regex]::Replace($existingConfig, '(?m)^SQLITE_SCHEMA_SQL=.*$', "SQLITE_SCHEMA_SQL=$sqliteSchemaPath")
    } else {
      $existingConfig = $existingConfig.TrimEnd() + "`r`nSQLITE_SCHEMA_SQL=$sqliteSchemaPath`r`n"
    }
    foreach ($syslogDefault in @{
      SYSLOG_ENABLED = 'true'
      SYSLOG_UDP_ENABLED = 'true'
      SYSLOG_TCP_ENABLED = 'true'
      SYSLOG_BIND_ADDRESS = '0.0.0.0'
      SYSLOG_PORT = [string]$DefaultSyslogPort
      SYSLOG_RETENTION_DAYS = '30'
      SYSLOG_MAX_RECORDS = '500000'
      SYSLOG_ACCEPT_UNMATCHED = 'true'
    }.GetEnumerator()) {
      if ($existingConfig -notmatch "(?m)^$([Text.RegularExpressions.Regex]::Escape($syslogDefault.Key))=") {
        $existingConfig = Set-EnvironmentContentValue $existingConfig $syslogDefault.Key $syslogDefault.Value
      }
    }
    [IO.File]::WriteAllText($ConfigFile, $existingConfig, (New-Object Text.UTF8Encoding($false)))
    return
  }
  $adminPassword = New-Secret 12
  $content = @"
NODE_ENV=production
APP_NAME=mikrotik-manager-enterprise
APP_VERSION=5.9.3
SERVER_HOST=127.0.0.1
SERVER_PORT=$BackendRuntimePort
FRONTEND_HOST=127.0.0.1
FRONTEND_PORT=$FrontendRuntimePort
DATABASE_URL=file:$($Database.Replace('\','/'))
JWT_SECRET=$(New-Secret 32)
ENCRYPTION_KEY=$(New-Secret 32)
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=$adminPassword
SYSLOG_ENABLED=true
SYSLOG_UDP_ENABLED=true
SYSLOG_TCP_ENABLED=true
SYSLOG_BIND_ADDRESS=0.0.0.0
SYSLOG_PORT=$DefaultSyslogPort
SYSLOG_RETENTION_DAYS=30
SYSLOG_MAX_RECORDS=500000
SYSLOG_ACCEPT_UNMATCHED=true
BACKUP_STORAGE_DIR=$($BackupDir.Replace('\','/'))
BACKUP_STORAGE_PATH=$($BackupDir.Replace('\','/'))
WEB_DIST_PATH=$((Join-Path $AppDir 'web').Replace('\','/'))
SQLITE_SCHEMA_SQL=$((Join-Path $AppDir 'prisma\schema.sqlite.sql').Replace('\','/'))
LOG_LEVEL=info
"@
  [IO.File]::WriteAllText($ConfigFile, $content, (New-Object Text.UTF8Encoding($false)))
}

function Set-ProcessEnvironment {
  foreach ($item in (Read-Environment).GetEnumerator()) {
    [Environment]::SetEnvironmentVariable($item.Key, $item.Value, 'Process')
  }
}

function Get-NativeOutputSummary($Output, [int]$MaximumLines = 12) {
  if (-not $Output) { return 'No diagnostic output was produced.' }
  $lines = @(
    ($Output | Out-String) -split "`r?`n" |
      ForEach-Object { $_.Trim() } |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  )
  if ($lines.Count -eq 0) { return 'No diagnostic output was produced.' }
  return (($lines | Select-Object -Last $MaximumLines) -join ' | ')
}

function Invoke-ServiceWrapper([string]$Command) {
  $previousErrorActionPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $output = & $ServiceExe $Command 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorActionPreference
  }
  Write-BootstrapLog "WinSW command '$Command' returned exit code $exitCode."
  if ($output) { $output | Out-String | Add-Content $BootstrapLog -Encoding UTF8 }
  return [PSCustomObject]@{
    Command = $Command
    ExitCode = $exitCode
    Output = $output
  }
}

function Get-ServiceLogSummary([int]$MaximumLines = 20) {
  if (-not (Test-Path $LogDir)) { return 'No Windows Service log exists.' }
  $lines = @()
  foreach ($file in @(
    Get-ChildItem $LogDir -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -match '(?i)^MME.*\.(err|out|wrapper)\.log$' } |
      Sort-Object LastWriteTime |
      Select-Object -Last 3
  )) {
    $lines += "[$($file.Name)]"
    $lines += @(Get-Content $file.FullName -Tail $MaximumLines -ErrorAction SilentlyContinue)
  }
  return Get-NativeOutputSummary $lines $MaximumLines
}

function Ensure-SyslogFirewall([int]$PortOverride = 0) {
  $values = Read-Environment
  if ($PortOverride -le 0 -and
    (-not $values.ContainsKey('SYSLOG_ENABLED') -or $values['SYSLOG_ENABLED'] -ne 'true')) {
    return
  }
  $port = if ($PortOverride -gt 0) { $PortOverride } else { $DefaultSyslogPort }
  if ($PortOverride -le 0 -and $values.ContainsKey('SYSLOG_PORT')) {
    $configured = 0
    if ([int]::TryParse([string]$values['SYSLOG_PORT'], [ref]$configured) -and
      $configured -ge 1 -and $configured -le 65535) {
      $port = $configured
    }
  }
  Get-NetFirewallRule -DisplayName 'MME Syslog UDP' -ErrorAction SilentlyContinue |
    Remove-NetFirewallRule -ErrorAction SilentlyContinue
  Get-NetFirewallRule -DisplayName 'MME Syslog TCP' -ErrorAction SilentlyContinue |
    Remove-NetFirewallRule -ErrorAction SilentlyContinue
  New-NetFirewallRule -DisplayName 'MME Syslog UDP' -Group 'MikroTik Manager Enterprise Syslog' `
    -Direction Inbound -Action Allow -Protocol UDP -LocalPort $port -Profile Any `
    -RemoteAddress LocalSubnet | Out-Null
  New-NetFirewallRule -DisplayName 'MME Syslog TCP' -Group 'MikroTik Manager Enterprise Syslog' `
    -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -Profile Any `
    -RemoteAddress LocalSubnet | Out-Null
  Write-BootstrapLog "Windows Firewall allows Syslog UDP/TCP port $port from LocalSubnet on every network profile."
}

function Test-SyslogPortAvailable([int]$Port) {
  $tcp = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Any, $Port)
  $udp = $null
  $available = $false
  try {
    $tcp.Start()
    $udp = New-Object Net.Sockets.UdpClient($Port)
    $available = $true
  } catch {
    $available = $false
  } finally {
    try { $tcp.Stop() } catch { }
    if ($udp) { try { $udp.Close() } catch { } }
  }
  return $available
}

function Resolve-SyslogPort {
  $values = Read-Environment
  if (-not $values.ContainsKey('SYSLOG_ENABLED') -or $values['SYSLOG_ENABLED'] -ne 'true') {
    return 0
  }
  $port = $DefaultSyslogPort
  if ($values.ContainsKey('SYSLOG_PORT')) {
    $configured = 0
    if ([int]::TryParse([string]$values['SYSLOG_PORT'], [ref]$configured) -and
      $configured -ge 1 -and $configured -le 65535) {
      $port = $configured
    }
  }

  if (Test-SyslogPortAvailable $port) { return $port }

  foreach ($fallbackPort in @(5514, 6514, 10514)) {
    if ($fallbackPort -eq $port) { continue }
    if (Test-SyslogPortAvailable $fallbackPort) {
      $content = [IO.File]::ReadAllText($ConfigFile)
      $content = Set-EnvironmentContentValue $content 'SYSLOG_PORT' ([string]$fallbackPort)
      [IO.File]::WriteAllText($ConfigFile, $content, (New-Object Text.UTF8Encoding($false)))
      Write-BootstrapLog "Cổng Syslog $port đang bận; tự động chuyển sang cổng $fallbackPort."
      return $fallbackPort
    }
  }
  throw "Không tìm được cổng Syslog UDP/TCP khả dụng trong danh sách: $port, 5514, 6514, 10514."
}

function Remove-SyslogFirewall {
  Get-NetFirewallRule -Group 'MikroTik Manager Enterprise Syslog' -ErrorAction SilentlyContinue |
    Remove-NetFirewallRule -ErrorAction SilentlyContinue
}

function Backup-Data {
  $paths = @()
  if (Test-Path (Split-Path $Database)) {
    $dataFiles = @(Get-ChildItem (Split-Path $Database) -Force -ErrorAction SilentlyContinue)
    $paths += @($dataFiles | ForEach-Object { $_.FullName })
  }
  if (Test-Path $ConfigFile) { $paths += $ConfigFile }
  if (Test-Path $CredentialsFile) { $paths += $CredentialsFile }
  if (Test-Path $InstallStateFile) { $paths += $InstallStateFile }
  if ($paths.Count -eq 0) { return $null }
  New-Item -ItemType Directory -Force $BackupDir | Out-Null
  $target = Join-Path $BackupDir "mme-before-upgrade-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
  Compress-Archive -Path $paths -DestinationPath $target -CompressionLevel Optimal
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
    $backupConfig = Join-Path $temporary 'mme.env'
    if (-not (Test-Path $backupConfig)) { $backupConfig = Join-Path $temporary 'config\mme.env' }
    if (Test-Path $backupConfig) { Copy-Item $backupConfig $ConfigFile -Force }
    $backupCredentials = Join-Path $temporary 'MME-Thong-Tin-Dang-Nhap.txt'
    if (Test-Path $backupCredentials) { Copy-Item $backupCredentials $CredentialsFile -Force }
    $backupInstallState = Join-Path $temporary 'install-state.json'
    if (Test-Path $backupInstallState) { Copy-Item $backupInstallState $InstallStateFile -Force }
  } finally {
    Remove-Item $temporary -Recurse -Force -ErrorAction SilentlyContinue
  }
}

function Restore-InstallTransaction(
  [string]$Archive,
  [bool]$HadDatabase,
  [bool]$HadConfig,
  [bool]$HadCredentials,
  [bool]$HadInstallState
) {
  Restore-Data $Archive
  if (-not $HadDatabase) {
    Remove-Item $Database, "$Database-wal", "$Database-shm" -Force -ErrorAction SilentlyContinue
  }
  if (-not $HadConfig) {
    Remove-Item $ConfigFile -Force -ErrorAction SilentlyContinue
  }
  if (-not $HadCredentials) {
    Remove-Item $CredentialsFile -Force -ErrorAction SilentlyContinue
  }
  if (-not $HadInstallState) {
    Remove-Item $InstallStateFile -Force -ErrorAction SilentlyContinue
  }
}

function Clear-UpgradeState {
  if (Test-Path $UpgradeStateFile) {
    Remove-Item $UpgradeStateFile -Force
    if (Test-Path $UpgradeStateFile) {
      throw 'Không thể xóa trạng thái rollback sau khi hoàn tất.'
    }
  }
}

function Restore-PreviousReleaseService {
  if (-not (Test-Path $UpgradeStateFile)) { return }
  $state = Get-Content $UpgradeStateFile -Raw | ConvertFrom-Json
  $previousServiceExe = [string]$state.previousServiceExe
  $previousServiceXml = [string]$state.previousServiceXml
  if ([string]::IsNullOrWhiteSpace($previousServiceExe) -or
    -not (Test-Path $previousServiceExe) -or
    -not (Test-Path $previousServiceXml)) {
    throw "Không tìm thấy release cũ để rollback: $previousServiceExe"
  }

  Write-BootstrapLog "Bắt đầu rollback Windows Service về release cũ: $previousServiceExe"
  try { Stop-Service -Name MME -Force -ErrorAction SilentlyContinue } catch { }
  try { & $ServiceExe stop *> $null } catch { }
  try { & $ServiceExe uninstall *> $null } catch { }
  & sc.exe delete MME *> $null
  $deadline = (Get-Date).AddSeconds(15)
  do {
    if (-not (Get-CimInstance Win32_Service -Filter "Name='MME'" -ErrorAction SilentlyContinue)) { break }
    Start-Sleep -Milliseconds 300
  } while ((Get-Date) -lt $deadline)

  if (Get-CimInstance Win32_Service -Filter "Name='MME'" -ErrorAction SilentlyContinue) {
    throw 'Không thể gỡ đăng ký Windows Service của release lỗi.'
  }

  & $previousServiceExe install
  if ($LASTEXITCODE -ne 0) { throw 'Không thể đăng ký lại Windows Service của release cũ.' }
  if ([bool]$state.previousServiceWasRunning) {
    & $previousServiceExe start
    if ($LASTEXITCODE -ne 0) { throw 'Không thể khởi động lại Windows Service của release cũ.' }
  }
  Clear-UpgradeState
  Write-BootstrapLog 'Đã rollback Windows Service về release cũ.'
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
  $allProcesses = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)
  $ids = New-Object 'System.Collections.Generic.HashSet[int]'
  $serviceProcess = Get-CimInstance Win32_Service -Filter "Name='MME'" -ErrorAction SilentlyContinue
  if ($serviceProcess -and [int]$serviceProcess.ProcessId -gt 0) {
    [void]$ids.Add([int]$serviceProcess.ProcessId)
  }
  foreach ($process in $allProcesses) {
    $pathMatches = $process.ExecutablePath -and
      $process.ExecutablePath.StartsWith($AppDir, [StringComparison]::OrdinalIgnoreCase)
    $commandMatches = $process.CommandLine -and
      $process.CommandLine.IndexOf($AppDir, [StringComparison]::OrdinalIgnoreCase) -ge 0
    if (($process.Name -ieq 'node.exe' -or $process.Name -ieq 'MME.Service.exe') -and
      ($pathMatches -or $commandMatches)) {
      [void]$ids.Add([int]$process.ProcessId)
    }
  }
  do {
    $changed = $false
    foreach ($process in $allProcesses) {
      if ($ids.Contains([int]$process.ParentProcessId) -and $ids.Add([int]$process.ProcessId)) {
        $changed = $true
      }
    }
  } while ($changed)
  return @($allProcesses | Where-Object { $ids.Contains([int]$_.ProcessId) })
}

function Get-LockedMMEProgramFiles {
  if (-not (Test-Path $AppDir)) { return @() }
  $locked = @()
  $criticalFiles = @(
    Get-ChildItem -Path $AppDir -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Extension -in @('.exe', '.dll', '.node') }
  )
  foreach ($file in $criticalFiles) {
    try {
      $stream = [IO.File]::Open(
        $file.FullName,
        [IO.FileMode]::Open,
        [IO.FileAccess]::Read,
        [IO.FileShare]::None
      )
      $stream.Dispose()
    } catch {
      $locked += $file.FullName
    }
  }
  return @($locked)
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
    $service.Close()
  }

  if (Test-Path $ServiceExe) {
    try { & $ServiceExe stop 2>$null | Out-Null } catch { }
  }

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $processes = @(Get-MMERuntimeProcesses)
    $lockedFiles = @(Get-LockedMMEProgramFiles)
    if ($processes.Count -eq 0 -and $lockedFiles.Count -eq 0) { return }
    foreach ($process in $processes) {
      & taskkill.exe /PID ([string]$process.ProcessId) /T /F *> $null
    }
    Start-Sleep -Milliseconds 300
  } while ((Get-Date) -lt $deadline)

  $remaining = @(Get-MMERuntimeProcesses)
  if ($remaining.Count -gt 0) {
    throw "Không thể giải phóng tiến trình MME: $($remaining.ProcessId -join ', ')."
  }
  $remainingLocks = @(Get-LockedMMEProgramFiles)
  if ($remainingLocks.Count -gt 0) {
    throw "Không thể mở khóa file chương trình MME: $($remainingLocks -join '; ')."
  }
}

function Wait-MMEHealthy([int]$TimeoutSeconds = 60) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $healthUrl = "http://127.0.0.1:$BackendRuntimePort/ready"
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
  $serviceDetail = Get-ServiceLogSummary
  throw "MME service was not ready after $TimeoutSeconds seconds (state: $state). $serviceDetail"
}

function Write-InstallState {
  $service = Get-CimInstance Win32_Service -Filter "Name='MME'" -ErrorAction SilentlyContinue
  if (-not $service -or $service.State -ne 'Running') {
    throw 'Windows Service MME chưa ở trạng thái Running.'
  }
  if ($service.StartMode -ne 'Auto') {
    throw "Windows Service MME không ở chế độ tự khởi động: $($service.StartMode)."
  }
  if (-not (Test-Path $ConfigFile)) { throw 'Thiếu file cấu hình MME sau cài đặt.' }
  if (-not (Test-Path $Database)) { throw 'Thiếu SQLite database MME sau cài đặt.' }
  if ((Get-Item $Database).Length -le 0) { throw 'SQLite database MME rỗng sau cài đặt.' }

  $values = Read-Environment
  $installedSyslogPort = 0
  if ($values.ContainsKey('SYSLOG_PORT')) {
    [void][int]::TryParse([string]$values['SYSLOG_PORT'], [ref]$installedSyslogPort)
  }
  $state = [ordered]@{
    version = [string]$values['APP_VERSION']
    installedAt = (Get-Date).ToUniversalTime().ToString('o')
    serviceName = 'MME'
    serviceState = [string]$service.State
    serviceStartMode = [string]$service.StartMode
    backendPort = $BackendRuntimePort
    frontendPort = $FrontendRuntimePort
    syslogPort = $installedSyslogPort
    credentialsFile = $CredentialsFile
    configFile = $ConfigFile
    databaseFile = $Database
  }
  [IO.File]::WriteAllText(
    $InstallStateFile,
    ($state | ConvertTo-Json -Depth 3),
    (New-Object Text.UTF8Encoding($false))
  )
}

function Remove-StaleReleases {
  $releasesRoot = Split-Path -Parent $AppDir
  if ((Split-Path -Leaf $releasesRoot) -ine 'releases' -or -not (Test-Path $releasesRoot)) {
    return
  }
  $otherReleases = @(
    Get-ChildItem -Path $releasesRoot -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -ne $AppDir } |
      Sort-Object LastWriteTime -Descending
  )
  foreach ($release in ($otherReleases | Select-Object -Skip 1)) {
    try {
      Remove-Item $release.FullName -Recurse -Force
      Write-BootstrapLog "Đã dọn release cũ: $($release.Name)."
    } catch {
      Write-BootstrapLog "Chưa thể dọn release cũ $($release.Name): $($_.Exception.Message)"
    }
  }
}

function Install-MME {
  Remove-Item $BootstrapFailureFile -Force -ErrorAction SilentlyContinue
  Write-BootstrapLog '============================================================'
  Set-InstallStage 'preflight'
  Assert-Prerequisites
  Write-BootstrapLog 'Preflight passed.'
  Set-InstallStage 'stop-old-runtime'
  Stop-MMERuntime
  Write-BootstrapLog 'Previous MME runtime stopped.'
  $hadDatabase = Test-Path $Database
  $hadConfig = Test-Path $ConfigFile
  $hadCredentials = Test-Path $CredentialsFile
  $hadInstallState = Test-Path $InstallStateFile
  Set-InstallStage 'backup-existing-data'
  $backup = Backup-Data
  try {
    Set-InstallStage 'repair-and-normalize-configuration'
    Initialize-Environment
    $databaseAvailableBeforeSetup = Test-Path $Database
    Resolve-RuntimePorts
    Write-BootstrapLog 'Configuration and persistent data paths are ready.'
    Set-InstallStage 'validate-network-ports'
    Assert-PortAvailable $BackendRuntimePort 'Cổng backend/API'
    if ($FrontendRuntimePort -ne $BackendRuntimePort) {
      Assert-PortAvailable $FrontendRuntimePort 'Cổng frontend/dashboard'
    }
    $resolvedSyslogPort = Resolve-SyslogPort
    if ($resolvedSyslogPort -gt 0) {
      try {
        Ensure-SyslogFirewall
      } catch {
        Write-BootstrapLog "CẢNH BÁO: Không thể tự cấu hình Windows Firewall cho Syslog: $($_.Exception.Message)"
      }
    }
    # Resolve-SyslogPort can persist a fallback port. Load the final values only
    # after all runtime ports have been validated and normalized.
    Set-ProcessEnvironment
  } catch {
    Restore-InstallTransaction $backup $hadDatabase $hadConfig $hadCredentials $hadInstallState
    Restore-PreviousReleaseService
    throw "Bootstrap validation failed; the previous configuration and service were restored. $($_.Exception.Message)"
  }
  try {
    Set-InstallStage 'initialize-database'
    Write-BootstrapLog 'Starting SQLite initialization.'
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
    if ($setupExitCode -ne 0) {
      $setupDetail = Get-NativeOutputSummary $setupOutput
      throw "Database or administrator initialization failed (exit code $setupExitCode). $setupDetail"
    }
    Write-InitialCredentials -FreshDatabase:(-not $databaseAvailableBeforeSetup)
    Write-BootstrapLog 'SQLite initialization passed.'
  } catch {
    Restore-InstallTransaction $backup $hadDatabase $hadConfig $hadCredentials $hadInstallState
    Restore-PreviousReleaseService
    throw "Nâng cấp thất bại; dữ liệu đã được rollback. $($_.Exception.Message)"
  }
  try {
    Set-InstallStage 'register-windows-service'
    Write-ServiceConfiguration
    Write-BootstrapLog 'Đã tạo cấu hình Windows Service.'
    [void](Invoke-ServiceWrapper 'uninstall')
    $serviceInstall = Invoke-ServiceWrapper 'install'
    if ($serviceInstall.ExitCode -ne 0) {
      throw "Unable to register the MME Windows Service. $(Get-NativeOutputSummary $serviceInstall.Output)"
    }
    $serviceStart = Invoke-ServiceWrapper 'start'
    if ($serviceStart.ExitCode -ne 0) {
      throw "Unable to start the MME Windows Service. $(Get-NativeOutputSummary $serviceStart.Output)"
    }
    Write-BootstrapLog 'Windows Service đã nhận lệnh khởi động.'
    Set-InstallStage 'wait-for-ready-endpoint'
    Wait-MMEHealthy
    Set-InstallStage 'write-install-receipt'
    Write-InstallState
  } catch {
    try { & $ServiceExe stop *> $null } catch { }
    try { & $ServiceExe uninstall *> $null } catch { }
    Restore-InstallTransaction $backup $hadDatabase $hadConfig $hadCredentials $hadInstallState
    Restore-PreviousReleaseService
    throw
  }
  Set-InstallStage 'completed'
  Write-BootstrapLog 'MME installation completed and the API is ready.'
  Clear-UpgradeState
  Remove-StaleReleases
  if (-not $NoOpen) { Start-Process "http://localhost:$FrontendRuntimePort/setup" }
}

Resolve-RuntimePorts

try {
  Write-BootstrapLog "Thực thi tác vụ: $Action"
  switch ($Action) {
    'install' { Install-MME }
    'start' { Assert-Administrator; & $ServiceExe start; Start-Process "http://localhost:$FrontendRuntimePort" }
    'stop' { Assert-Administrator; Stop-MMERuntime }
    'restart' { Assert-Administrator; Stop-MMERuntime; & $ServiceExe start }
    'open' { Start-Process "http://localhost:$FrontendRuntimePort" }
    'status' { Get-Service -Name MME -ErrorAction SilentlyContinue | Format-List; Read-Host 'Nhấn Enter để đóng' }
    'backup' { Assert-Administrator; Backup-Data }
    'uninstall' { Assert-Administrator; Stop-MMERuntime; & $ServiceExe uninstall; Remove-SyslogFirewall }
    'validate' { Write-BootstrapLog 'Windows PowerShell validation đạt.' }
    'firewall' { Assert-Administrator; Ensure-SyslogFirewall $SyslogPort }
    'firewall-remove' { Assert-Administrator; Remove-SyslogFirewall }
  }
} catch {
  Write-BootstrapFailure $_
  try { Write-BootstrapLog "LỖI: $($_ | Out-String)" } catch { }
  if (-not $NoOpen) {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show($_.Exception.Message, 'MikroTik Manager Enterprise', 'OK', 'Error') | Out-Null
  } else {
    Write-Error $_.Exception.Message
  }
  exit 1
}
