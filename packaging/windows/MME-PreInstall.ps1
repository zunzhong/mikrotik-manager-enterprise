param(
  [Parameter(Mandatory = $true)]
  [string]$AppDir,
  [Parameter(Mandatory = $true)]
  [string]$DataRoot,
  [Parameter(Mandatory = $true)]
  [string]$LogPath,
  [ValidateRange(1, 300)]
  [int]$TimeoutSeconds = 60,
  [switch]$ValidateOnly,
  [switch]$RollbackOnly
)

$ErrorActionPreference = 'Stop'
$AppDir = [IO.Path]::GetFullPath($AppDir).TrimEnd('\')
$DataRoot = [IO.Path]::GetFullPath($DataRoot).TrimEnd('\')
$ServiceExe = Join-Path $AppDir 'service\MME.Service.exe'
$ServiceXml = Join-Path $AppDir 'service\MME.Service.xml'
$UpgradeStateFile = Join-Path $DataRoot 'config\upgrade-state.json'
$script:ServiceWasInstalled = $false
$script:ServiceWasRunning = $false
$script:PreviousServiceExe = $ServiceExe
$script:PreviousServiceXml = $ServiceXml

function Write-UpgradeLog([string]$Message) {
  try {
    $directory = Split-Path -Parent $LogPath
    if ($directory) { New-Item -ItemType Directory -Force $directory | Out-Null }
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss.fff') $Message" | Add-Content $LogPath -Encoding UTF8
  } catch {
    # Logging must never hide the actual upgrade result.
  }
}

function Assert-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Bộ cài phải chạy bằng quyền Administrator.'
  }
}

function Test-PathInsideApp([string]$Candidate) {
  if ([string]::IsNullOrWhiteSpace($Candidate)) { return $false }
  try {
    $fullPath = [IO.Path]::GetFullPath($Candidate).TrimEnd('\')
    return $fullPath.Equals($AppDir, [StringComparison]::OrdinalIgnoreCase) -or
      $fullPath.StartsWith($AppDir + '\', [StringComparison]::OrdinalIgnoreCase)
  } catch {
    return $false
  }
}

function Get-MMEProcessTree {
  $allProcesses = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue)
  $ids = New-Object 'System.Collections.Generic.HashSet[int]'
  $service = Get-CimInstance Win32_Service -Filter "Name='MME'" -ErrorAction SilentlyContinue
  if ($service -and [int]$service.ProcessId -gt 0) { [void]$ids.Add([int]$service.ProcessId) }

  foreach ($process in $allProcesses) {
    $pathMatches = Test-PathInsideApp ([string]$process.ExecutablePath)
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

function Stop-MMEProcessTree {
  $processes = @(Get-MMEProcessTree | Sort-Object CreationDate -Descending)
  foreach ($process in $processes) {
    Write-UpgradeLog "Dừng tiến trình $($process.Name), PID $($process.ProcessId), Parent $($process.ParentProcessId)."
    & taskkill.exe /PID ([string]$process.ProcessId) /T /F *> $null
  }
}

function Get-CriticalProgramFiles {
  if (-not (Test-Path $AppDir)) { return @() }
  return @(
    Get-ChildItem -Path $AppDir -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object { $_.Extension -in @('.exe', '.dll', '.node') }
  )
}

function Get-LockedCriticalFiles {
  $locked = @()
  foreach ($file in (Get-CriticalProgramFiles)) {
    try {
      $stream = [IO.File]::Open(
        $file.FullName,
        [IO.FileMode]::Open,
        [IO.FileAccess]::Read,
        [IO.FileShare]::None
      )
      $stream.Dispose()
    } catch {
      $locked += [PSCustomObject]@{
        Path = $file.FullName
        Error = $_.Exception.Message
      }
    }
  }
  return @($locked)
}

function Restore-PreviousService {
  if (-not $script:ServiceWasInstalled) { return }
  try {
    $service = Get-Service -Name MME -ErrorAction SilentlyContinue
    if (-not $service -and
      (Test-Path $script:PreviousServiceExe) -and
      (Test-Path $script:PreviousServiceXml)) {
      Write-UpgradeLog 'Khôi phục đăng ký Windows Service cũ sau khi preflight thất bại.'
      & $script:PreviousServiceExe install *> $null
      $service = Get-Service -Name MME -ErrorAction SilentlyContinue
    }
    if ($script:ServiceWasRunning -and $service) {
      Start-Service -Name MME -ErrorAction SilentlyContinue
    }
  } catch {
    Write-UpgradeLog "Không thể tự khôi phục service cũ: $($_.Exception.Message)"
  }
}

function Restore-SavedService {
  if (-not (Test-Path $UpgradeStateFile)) {
    Write-UpgradeLog 'Không có trạng thái release cũ cần rollback.'
    return
  }

  $state = Get-Content $UpgradeStateFile -Raw | ConvertFrom-Json
  $previousServiceExe = [string]$state.previousServiceExe
  $previousServiceXml = [string]$state.previousServiceXml
  if ([string]::IsNullOrWhiteSpace($previousServiceExe) -or
    -not (Test-Path $previousServiceExe) -or
    -not (Test-Path $previousServiceXml)) {
    throw "Không tìm thấy release cũ để rollback: $previousServiceExe"
  }

  Write-UpgradeLog "Khôi phục Windows Service từ release cũ: $previousServiceExe"
  try { Stop-Service -Name MME -Force -ErrorAction SilentlyContinue } catch { }
  Stop-MMEProcessTree
  $registeredService = Get-CimInstance Win32_Service -Filter "Name='MME'" -ErrorAction SilentlyContinue
  if ($registeredService) {
    & sc.exe delete MME *> $null
    $deleteDeadline = (Get-Date).AddSeconds(15)
    do {
      $registeredService = Get-CimInstance Win32_Service -Filter "Name='MME'" -ErrorAction SilentlyContinue
      if (-not $registeredService) { break }
      Start-Sleep -Milliseconds 300
    } while ((Get-Date) -lt $deleteDeadline)
    if ($registeredService) { throw 'Không thể gỡ đăng ký service chưa hoàn tất của bản mới.' }
  }

  & $previousServiceExe install *> $null
  if ($LASTEXITCODE -ne 0) { throw 'Không thể đăng ký lại Windows Service của release cũ.' }
  if ([bool]$state.previousServiceWasRunning) {
    & $previousServiceExe start *> $null
    if ($LASTEXITCODE -ne 0) { throw 'Không thể khởi động lại Windows Service của release cũ.' }
  }
  Clear-UpgradeState
  Write-UpgradeLog 'Rollback release cũ hoàn tất.'
}

function Save-UpgradeState {
  if (-not $script:ServiceWasInstalled) { return }
  $stateDirectory = Split-Path -Parent $UpgradeStateFile
  New-Item -ItemType Directory -Force $stateDirectory | Out-Null
  $state = [PSCustomObject]@{
    previousServiceExe = $script:PreviousServiceExe
    previousServiceXml = $script:PreviousServiceXml
    previousServiceWasRunning = [bool]$script:ServiceWasRunning
    createdAt = (Get-Date).ToUniversalTime().ToString('o')
  }
  [IO.File]::WriteAllText(
    $UpgradeStateFile,
    ($state | ConvertTo-Json -Depth 3),
    (New-Object Text.UTF8Encoding($false))
  )
  Write-UpgradeLog "Đã lưu trạng thái rollback release cũ: $($script:PreviousServiceExe)"
}

function Clear-UpgradeState {
  if (Test-Path $UpgradeStateFile) {
    Remove-Item $UpgradeStateFile -Force
    if (Test-Path $UpgradeStateFile) {
      throw 'Không thể xóa trạng thái rollback sau khi hoàn tất.'
    }
  }
}

function Stop-PreviousService {
  $service = Get-Service -Name MME -ErrorAction SilentlyContinue
  $serviceProcess = Get-CimInstance Win32_Service -Filter "Name='MME'" -ErrorAction SilentlyContinue
  $script:ServiceWasInstalled = $null -ne $service
  $script:ServiceWasRunning = $service -and $service.Status -ne 'Stopped'
  if ($serviceProcess -and $serviceProcess.PathName) {
    $executablePath = $null
    if ($serviceProcess.PathName -match '^\s*"([^"]+\.exe)"') {
      $executablePath = $Matches[1]
    } elseif ($serviceProcess.PathName -match '^\s*(.+?\.exe)(?:\s|$)') {
      $executablePath = $Matches[1]
    }
    if ($executablePath -and (Test-Path $executablePath)) {
      $script:PreviousServiceExe = $executablePath
      $script:PreviousServiceXml = [IO.Path]::ChangeExtension($executablePath, '.xml')
      Write-UpgradeLog "Service cũ sử dụng wrapper: $executablePath"
    }
  }

  if ($service -and $service.Status -ne 'Stopped') {
    Write-UpgradeLog "Yêu cầu dừng Windows Service MME (trạng thái: $($service.Status))."
    Stop-Service -Name MME -Force -ErrorAction SilentlyContinue
    try {
      $service.WaitForStatus(
        [ServiceProcess.ServiceControllerStatus]::Stopped,
        [TimeSpan]::FromSeconds(20)
      )
    } catch {
      Write-UpgradeLog 'Service chưa dừng đúng hạn; chuyển sang giải phóng cây tiến trình.'
    }
  }

  Stop-MMEProcessTree
  if ($service) { $service.Close() }
}

if ($ValidateOnly) {
  Write-UpgradeLog 'MME-PreInstall.ps1 validation đạt.'
  exit 0
}

if ($RollbackOnly) {
  try {
    Assert-Administrator
    Restore-SavedService
    exit 0
  } catch {
    Write-UpgradeLog "LỖI ROLLBACK: $($_ | Out-String)"
    Write-Error $_.Exception.Message
    exit 1
  }
}

try {
  Assert-Administrator
  Write-UpgradeLog "Bắt đầu preflight cài đè. AppDir=$AppDir; DataRoot=$DataRoot"
  if (Test-Path $UpgradeStateFile) {
    Write-UpgradeLog 'Phát hiện phiên nâng cấp trước chưa hoàn tất; khôi phục release cũ trước khi thử lại.'
    Restore-SavedService
  }
  Stop-PreviousService
  Save-UpgradeState

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $locked = @()
  $processes = @()
  $service = $null
  do {
    Stop-MMEProcessTree
    $processes = @(Get-MMEProcessTree)
    $locked = @(Get-LockedCriticalFiles)
    $service = Get-CimInstance Win32_Service -Filter "Name='MME'" -ErrorAction SilentlyContinue
    $serviceStopped = -not $service -or $service.State -eq 'Stopped'
    if ($processes.Count -eq 0 -and $locked.Count -eq 0 -and $serviceStopped) { break }
    Start-Sleep -Milliseconds 500
  } while ((Get-Date) -lt $deadline)

  if ($processes.Count -gt 0 -or $locked.Count -gt 0 -or (-not $serviceStopped)) {
    $processDetails = ($processes | ForEach-Object { "$($_.Name):$($_.ProcessId)" }) -join ', '
    $lockDetails = ($locked | ForEach-Object { "$($_.Path) [$($_.Error)]" }) -join '; '
    Write-UpgradeLog "Preflight thất bại. Processes=$processDetails; Locked=$lockDetails; ServiceState=$($service.State)"
    throw "Không thể giải phóng hoàn toàn phiên bản MME đang chạy. Tiến trình: $processDetails. File bị khóa: $lockDetails"
  }

  if ($service) {
    Write-UpgradeLog 'File đã mở khóa; xóa đăng ký service cũ để không thể tái khởi động trong lúc Inno Setup thay file.'
    & sc.exe delete MME *> $null
    $unregisterDeadline = (Get-Date).AddSeconds(20)
    do {
      Stop-MMEProcessTree
      $service = Get-CimInstance Win32_Service -Filter "Name='MME'" -ErrorAction SilentlyContinue
      if (-not $service) { break }
      & sc.exe delete MME *> $null
      Start-Sleep -Milliseconds 300
    } while ((Get-Date) -lt $unregisterDeadline)
    if ($service) { throw 'Windows chưa giải phóng đăng ký service MME cũ.' }
  }

  $processes = @(Get-MMEProcessTree)
  $locked = @(Get-LockedCriticalFiles)
  if ($processes.Count -gt 0 -or $locked.Count -gt 0) {
    throw 'Tiến trình hoặc khóa file xuất hiện lại sau khi gỡ service cũ.'
  }

  Write-UpgradeLog 'Preflight đạt: service cũ đã gỡ, không còn tiến trình và toàn bộ EXE/DLL/NODE đã mở khóa.'
  exit 0
} catch {
  Write-UpgradeLog "LỖI PREFLIGHT: $($_ | Out-String)"
  Restore-PreviousService
  if ($script:ServiceWasInstalled) { Clear-UpgradeState }
  Write-Error $_.Exception.Message
  exit 1
}
