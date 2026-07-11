param(
  [switch]$SkipBuild,
  [switch]$SkipPrisma,
  [switch]$SkipTests,
  [string]$ReportPath = "repo-health-report.txt"
)

$ErrorActionPreference = "Continue"
$StartedAt = Get-Date
$Results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param(
    [string]$Name,
    [int]$ExitCode,
    [string]$Command
  )

  if ($ExitCode -eq 0) {
    $status = "PASS"
  } else {
    $status = "FAIL"
  }

  $Results.Add([pscustomobject]@{
    Name = $Name
    Status = $status
    ExitCode = $ExitCode
    Command = $Command
  }) | Out-Null

  if ($ExitCode -eq 0) {
    Write-Host ("PASS: {0}" -f $Name) -ForegroundColor Green
  } else {
    Write-Host ("FAIL: {0} (exit {1})" -f $Name, $ExitCode) -ForegroundColor Red
  }
}

function Run-Step {
  param(
    [string]$Name,
    [string]$Command
  )

  Write-Host ""
  Write-Host ("==> {0}" -f $Name) -ForegroundColor Cyan
  Write-Host $Command -ForegroundColor DarkGray
  cmd /c $Command
  $exitCode = $LASTEXITCODE
  Add-Result -Name $Name -ExitCode $exitCode -Command $Command
  return $exitCode
}

Write-Host "Repo Health Check + Auto Fix" -ForegroundColor Green
Write-Host ("Started: {0}" -f $StartedAt)
Write-Host ("Working directory: {0}" -f (Get-Location))

if ($null -eq (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  Write-Host "pnpm was not found in PATH." -ForegroundColor Red
  exit 1
}

Run-Step -Name "Install lockfile dependencies check" -Command "pnpm install --frozen-lockfile"

$formatCheck = Run-Step -Name "Format check" -Command "pnpm format:check"

if ($formatCheck -ne 0) {
  Write-Host ""
  Write-Host "==> Auto-fix formatting" -ForegroundColor Cyan
  cmd /c "pnpm format"
  Add-Result -Name "Auto format" -ExitCode $LASTEXITCODE -Command "pnpm format"
  Run-Step -Name "Format check after auto-fix" -Command "pnpm format:check"
}

if (-not $SkipPrisma) {
  Run-Step -Name "Prisma format" -Command "pnpm --filter @mme/server prisma:format"
  Run-Step -Name "Prisma generate" -Command "pnpm --filter @mme/server prisma:generate"
}

Run-Step -Name "Server typecheck" -Command "pnpm --filter @mme/server typecheck"
Run-Step -Name "Web typecheck" -Command "pnpm --filter @mme/web typecheck"
Run-Step -Name "Workspace typecheck" -Command "pnpm typecheck"

if (-not $SkipBuild) {
  Run-Step -Name "Workspace build" -Command "pnpm build"
}

if (-not $SkipTests) {
  Run-Step -Name "Workspace tests" -Command "pnpm test"
}

$FinishedAt = Get-Date
$Failed = @($Results | Where-Object { $_.ExitCode -ne 0 })

Write-Host ""
Write-Host "==> Summary" -ForegroundColor Cyan
$Results | Format-Table -AutoSize

$report = New-Object System.Collections.Generic.List[string]
$report.Add("# Repo Health Report") | Out-Null
$report.Add("") | Out-Null
$report.Add(("Started: {0}" -f $StartedAt)) | Out-Null
$report.Add(("Finished: {0}" -f $FinishedAt)) | Out-Null
$report.Add(("Working directory: {0}" -f (Get-Location))) | Out-Null
$report.Add("") | Out-Null
$report.Add("## Results") | Out-Null
$report.Add("") | Out-Null

foreach ($item in $Results) {
  $report.Add(("- [{0}] {1} - exit {2}" -f $item.Status, $item.Name, $item.ExitCode)) | Out-Null
  $report.Add(("  Command: {0}" -f $item.Command)) | Out-Null
}

$report.Add("") | Out-Null

if ($Failed.Count -eq 0) {
  $report.Add("Final status: PASS") | Out-Null
  Write-Host "Final status: PASS" -ForegroundColor Green
} else {
  $report.Add("Final status: FAIL") | Out-Null
  $report.Add("") | Out-Null
  $report.Add("Failed steps:") | Out-Null

  foreach ($item in $Failed) {
    $report.Add(("- {0}: {1}" -f $item.Name, $item.Command)) | Out-Null
  }

  Write-Host "Final status: FAIL" -ForegroundColor Red
  Write-Host "Send repo-health-report.txt and the terminal output so the failing step can be fixed." -ForegroundColor Yellow
}

$report | Set-Content -Path $ReportPath -Encoding UTF8
Write-Host ("Report saved to: {0}" -f $ReportPath)

if ($Failed.Count -ne 0) {
  exit 1
}

exit 0
