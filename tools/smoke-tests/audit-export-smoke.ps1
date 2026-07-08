param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$ExportDir = ".\tmp\audit-export-smoke"
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-JsonApi {
  param(
    [string]$Method = "GET",
    [string]$Path,
    [object]$Body = $null
  )

  $uri = "$BaseUrl$Path"

  if ($Method.ToUpperInvariant() -eq "GET" -and $null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri
  }

  if ($null -eq $Body) {
    $Body = @{}
  }

  return Invoke-RestMethod `
    -Method $Method `
    -Uri $uri `
    -ContentType "application/json" `
    -Body ($Body | ConvertTo-Json -Depth 30)
}

function Assert-ApiSuccess {
  param(
    [object]$Response,
    [string]$Message
  )

  if ($null -eq $Response) {
    throw "$Message returned null response."
  }

  if ($Response.PSObject.Properties.Name -contains "success" -and $Response.success -ne $true) {
    throw "$Message returned success=false."
  }
}

function Assert-FileExists {
  param(
    [string]$Path,
    [string]$Message
  )

  if (-not (Test-Path $Path)) {
    throw "$Message file was not created: $Path"
  }

  $item = Get-Item $Path

  if ($item.Length -le 0) {
    throw "$Message file is empty: $Path"
  }
}

Write-Host "Audit Export Smoke Test" -ForegroundColor Green
Write-Host "BaseUrl: $BaseUrl"
Write-Host "ExportDir: $ExportDir"

New-Item -ItemType Directory -Force -Path $ExportDir | Out-Null

Write-Step "Seed demo audit events"
$seed = Invoke-JsonApi -Method "POST" -Path "/api/v1/audit/seed-demo" -Body @{}
Assert-ApiSuccess $seed "Seed demo audit events"
$seed | ConvertTo-Json -Depth 30

Write-Step "Export audit JSON"
$jsonExportPath = Join-Path $ExportDir "audit-log-smoke.json"
Invoke-WebRequest `
  -Uri "$BaseUrl/api/v1/audit/export?format=json&limit=1000" `
  -OutFile $jsonExportPath
Assert-FileExists $jsonExportPath "Audit JSON export"
$jsonContent = Get-Content $jsonExportPath -Raw | ConvertFrom-Json
Assert-ApiSuccess $jsonContent "Audit JSON export"

if (-not ($jsonContent.data.PSObject.Properties.Name -contains "items")) {
  throw "Audit JSON export missing data.items"
}

Write-Host "JSON export OK: $jsonExportPath"

Write-Step "Export audit CSV"
$csvExportPath = Join-Path $ExportDir "audit-log-smoke.csv"
Invoke-WebRequest `
  -Uri "$BaseUrl/api/v1/audit/export?format=csv&limit=1000" `
  -OutFile $csvExportPath
Assert-FileExists $csvExportPath "Audit CSV export"
$csvHeader = Get-Content $csvExportPath -TotalCount 1

if ($csvHeader -notlike "*id,createdAt,status,severity,action*") {
  throw "Audit CSV export header is invalid: $csvHeader"
}

Write-Host "CSV export OK: $csvExportPath"

Write-Step "Export failed audit CSV"
$failedCsvExportPath = Join-Path $ExportDir "audit-log-failures-smoke.csv"
Invoke-WebRequest `
  -Uri "$BaseUrl/api/v1/audit/export?format=csv&status=failure&limit=500" `
  -OutFile $failedCsvExportPath
Assert-FileExists $failedCsvExportPath "Audit failed CSV export"
$failedCsvHeader = Get-Content $failedCsvExportPath -TotalCount 1

if ($failedCsvHeader -notlike "*id,createdAt,status,severity,action*") {
  throw "Audit failed CSV export header is invalid: $failedCsvHeader"
}

Write-Host "Failed CSV export OK: $failedCsvExportPath"

Write-Host ""
Write-Host "Audit export smoke test completed." -ForegroundColor Green
