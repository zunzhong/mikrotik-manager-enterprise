param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$AlertId = "",
  [string]$DeviceId = ""
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

  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri
  }

  $json = $Body | ConvertTo-Json -Depth 20

  return Invoke-RestMethod `
    -Method $Method `
    -Uri $uri `
    -ContentType "application/json" `
    -Body $json
}

Write-Host "Alert Lifecycle Smoke Test" -ForegroundColor Green
Write-Host "BaseUrl: $BaseUrl"

Write-Step "Check Alert Lifecycle Summary"
$summary = Invoke-JsonApi -Path "/api/v1/alert-lifecycle/summary"
$summary | ConvertTo-Json -Depth 20

Write-Step "Check Active Alerts"
$active = Invoke-JsonApi -Path "/api/v1/alert-lifecycle/active"
$active | ConvertTo-Json -Depth 20

Write-Step "Check Recent Lifecycle Events"
$events = Invoke-JsonApi -Path "/api/v1/events?limit=20"
$events | ConvertTo-Json -Depth 20

if ($AlertId.Trim().Length -gt 0) {
  Write-Step "Acknowledge Alert: $AlertId"
  $ack = Invoke-JsonApi `
    -Method "POST" `
    -Path "/api/v1/alert-lifecycle/$AlertId/acknowledge" `
    -Body @{
      reason = "Smoke test acknowledge"
    }
  $ack | ConvertTo-Json -Depth 20

  Write-Step "Resolve Alert: $AlertId"
  $resolve = Invoke-JsonApi `
    -Method "POST" `
    -Path "/api/v1/alert-lifecycle/$AlertId/resolve" `
    -Body @{
      reason = "Smoke test resolve"
    }
  $resolve | ConvertTo-Json -Depth 20
}

if ($DeviceId.Trim().Length -gt 0) {
  Write-Step "Resolve Active Alerts For Device: $DeviceId"
  $deviceResolve = Invoke-JsonApi `
    -Method "POST" `
    -Path "/api/v1/alert-lifecycle/device/$DeviceId/resolve-active" `
    -Body @{
      reason = "Smoke test resolve active alerts for device"
    }
  $deviceResolve | ConvertTo-Json -Depth 20
}

Write-Step "Done"
Write-Host "Smoke test completed." -ForegroundColor Green
