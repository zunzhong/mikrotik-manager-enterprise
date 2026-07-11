param(
  [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"
$RunId = [DateTime]::UtcNow.Ticks

function Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Invoke-Json {
  param(
    [string]$Method,
    [string]$Path,
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )

  $uri = "$BaseUrl$Path"

  if ($null -eq $Body -and $Method.ToUpperInvariant() -eq "GET") {
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $Headers
  }

  if ($null -eq $Body) {
    $Body = @{}
  }

  return Invoke-RestMethod `
    -Method $Method `
    -Uri $uri `
    -Headers $Headers `
    -ContentType "application/json" `
    -Body ($Body | ConvertTo-Json -Depth 30)
}

function Get-StatusCode($ErrorRecord) {
  if ($null -eq $ErrorRecord.Exception.Response) {
    throw $ErrorRecord.Exception
  }

  return [int]$ErrorRecord.Exception.Response.StatusCode
}

function Expect-HttpError {
  param(
    [string]$Method,
    [string]$Path,
    [int]$StatusCode,
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )

  try {
    $result = Invoke-Json -Method $Method -Path $Path -Headers $Headers -Body $Body
    throw "Expected HTTP $StatusCode but request succeeded: $($result | ConvertTo-Json -Depth 20)"
  } catch {
    $actual = Get-StatusCode $_
    if ($actual -ne $StatusCode) {
      throw "Expected HTTP $StatusCode but got HTTP $actual"
    }
    Write-Host "Expected HTTP $StatusCode received."
  }
}

function Expect-NotForbidden {
  param(
    [string]$Method,
    [string]$Path,
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )

  try {
    return Invoke-Json -Method $Method -Path $Path -Headers $Headers -Body $Body
  } catch {
    $actual = Get-StatusCode $_
    if ($actual -eq 403) {
      throw "Expected request to pass RBAC guard, but got HTTP 403"
    }
    Write-Host "Request passed RBAC guard and failed later with non-403 HTTP $actual."
    return $null
  }
}

function Assert-Ok($Response, [string]$Name) {
  if ($null -eq $Response) {
    throw "$Name returned null response"
  }
  if (($Response.PSObject.Properties.Name -contains "success") -and $Response.success -ne $true) {
    throw "$Name returned success=false: $($Response | ConvertTo-Json -Depth 20)"
  }
}

Write-Host "Device Guard Smoke Test" -ForegroundColor Green
Write-Host "BaseUrl: $BaseUrl"

Step "Read routes remain open"
Assert-Ok (Invoke-Json -Method GET -Path "/api/v1/devices") "Device list"
Assert-Ok (Invoke-Json -Method GET -Path "/api/v1/realtime/devices") "Realtime devices"
Assert-Ok (Invoke-Json -Method GET -Path "/api/v1/realtime/scheduler/status") "Scheduler status"

$deviceBody = @{
  name = "Protected Smoke Device $RunId"
  host = "192.0.2.10"
  port = 8728
  username = "admin"
  password = ""
  useTls = $false
  loginMode = "auto"
  tags = @("protected-smoke")
}

Step "Device create is protected"
Expect-HttpError -Method POST -Path "/api/v1/devices" -StatusCode 403 -Body $deviceBody
$device = Invoke-Json -Method POST -Path "/api/v1/devices" -Headers @{ "x-rbac-permissions" = "device:manage" } -Body $deviceBody
Assert-Ok $device "Device create"
$DeviceId = $device.data.id
if ([string]::IsNullOrWhiteSpace($DeviceId)) { throw "Created device ID is missing" }
Write-Host "Created device: $DeviceId"

Step "Device update is protected"
Expect-HttpError -Method PATCH -Path "/api/v1/devices/$DeviceId" -StatusCode 403 -Body @{ tags = @("denied") }
Assert-Ok (Invoke-Json -Method PATCH -Path "/api/v1/devices/$DeviceId" -Headers @{ "x-rbac-permissions" = "device:manage" } -Body @{ tags = @("protected-smoke", "updated") }) "Device update"

Step "Connection test is protected"
$testBody = @{
  host = "192.0.2.10"
  port = 8728
  username = "admin"
  password = ""
  useTls = $false
  loginMode = "auto"
  timeoutMs = 1000
}
Expect-HttpError -Method POST -Path "/api/v1/devices/test" -StatusCode 403 -Body $testBody
$connectionResult = Expect-NotForbidden -Method POST -Path "/api/v1/devices/test" -Headers @{ "x-rbac-permissions" = "device:connect" } -Body $testBody
if ($null -ne $connectionResult) { Assert-Ok $connectionResult "Connection test" }

Step "Realtime scheduler is protected"
Expect-HttpError -Method POST -Path "/api/v1/realtime/scheduler/start" -StatusCode 403 -Body @{ intervalMs = 30000; ttlMs = 60000 }
Assert-Ok (Invoke-Json -Method POST -Path "/api/v1/realtime/scheduler/start" -Headers @{ "x-rbac-permissions" = "device:sync" } -Body @{ intervalMs = 30000; ttlMs = 60000 }) "Scheduler start"
Expect-HttpError -Method POST -Path "/api/v1/realtime/scheduler/stop" -StatusCode 403
Assert-Ok (Invoke-Json -Method POST -Path "/api/v1/realtime/scheduler/stop" -Headers @{ "x-rbac-permissions" = "device:sync" }) "Scheduler stop"

Step "Realtime refresh is protected"
Expect-HttpError -Method POST -Path "/api/v1/realtime/devices/$DeviceId/refresh" -StatusCode 403
$refreshResult = Expect-NotForbidden -Method POST -Path "/api/v1/realtime/devices/$DeviceId/refresh" -Headers @{ "x-rbac-permissions" = "device:sync" }
if ($null -ne $refreshResult) { Assert-Ok $refreshResult "Realtime refresh" }
Expect-HttpError -Method POST -Path "/api/v1/devices/$DeviceId/realtime/refresh" -StatusCode 403
$aliasRefreshResult = Expect-NotForbidden -Method POST -Path "/api/v1/devices/$DeviceId/realtime/refresh" -Headers @{ "x-rbac-permissions" = "device:manage" }
if ($null -ne $aliasRefreshResult) { Assert-Ok $aliasRefreshResult "Device realtime refresh alias" }

Step "Device action APIs are protected"
Expect-HttpError -Method POST -Path "/api/v1/devices/$DeviceId/actions/ping" -StatusCode 403 -Body @{ address = "8.8.8.8"; count = 2 }
$pingResult = Expect-NotForbidden -Method POST -Path "/api/v1/devices/$DeviceId/actions/ping" -Headers @{ "x-rbac-permissions" = "device:test" } -Body @{ address = "8.8.8.8"; count = 2 }
if ($null -ne $pingResult) { Assert-Ok $pingResult "Ping action" }

Expect-HttpError -Method POST -Path "/api/v1/devices/$DeviceId/actions/backup" -StatusCode 403 -Body @{ name = "denied-backup" }
$backupResult = Expect-NotForbidden -Method POST -Path "/api/v1/devices/$DeviceId/actions/backup" -Headers @{ "x-rbac-permissions" = "device:sync" } -Body @{ name = "protected-backup" }
if ($null -ne $backupResult) { Assert-Ok $backupResult "Backup action" }

Expect-HttpError -Method POST -Path "/api/v1/devices/$DeviceId/actions/supout" -StatusCode 403 -Body @{ name = "denied-supout" }
$supoutResult = Expect-NotForbidden -Method POST -Path "/api/v1/devices/$DeviceId/actions/supout" -Headers @{ "x-rbac-permissions" = "device:manage" } -Body @{ name = "protected-supout" }
if ($null -ne $supoutResult) { Assert-Ok $supoutResult "Supout action" }

Expect-HttpError -Method POST -Path "/api/v1/devices/$DeviceId/actions/reboot" -StatusCode 403 -Body @{ confirm = $true }
Write-Host "Skipping allowed reboot execution to avoid disruptive device action." -ForegroundColor Yellow

Step "Cleanup smoke device"
Assert-Ok (Invoke-Json -Method DELETE -Path "/api/v1/devices/$DeviceId" -Headers @{ "x-rbac-permissions" = "device:manage" }) "Device cleanup"

Write-Host ""
Write-Host "Device guard smoke test completed." -ForegroundColor Green
