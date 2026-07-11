param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$AlertId = "guard-smoke-missing-alert",
  [string]$DeviceId = "guard-smoke-device"
)

$ErrorActionPreference = "Stop"

function Step {
  param([string]$Message)

  Write-Host ""
  Write-Host ("==> {0}" -f $Message) -ForegroundColor Cyan
}

function Invoke-Json {
  param(
    [string]$Method,
    [string]$Path,
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )

  $uri = "{0}{1}" -f $BaseUrl, $Path

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

function Get-HttpStatusCode {
  param([System.Management.Automation.ErrorRecord]$ErrorRecord)

  $response = $ErrorRecord.Exception.Response

  if ($null -eq $response) {
    throw $ErrorRecord.Exception
  }

  return [int]$response.StatusCode
}

function Invoke-JsonExpectHttpError {
  param(
    [string]$Method,
    [string]$Path,
    [int]$ExpectedStatusCode,
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )

  try {
    $response = Invoke-Json -Method $Method -Path $Path -Headers $Headers -Body $Body
    $json = $response | ConvertTo-Json -Depth 30
    throw ("Expected HTTP {0} but request succeeded: {1}" -f $ExpectedStatusCode, $json)
  } catch {
    $statusCode = Get-HttpStatusCode $_

    if ($statusCode -ne $ExpectedStatusCode) {
      throw ("Expected HTTP {0} but got HTTP {1}" -f $ExpectedStatusCode, $statusCode)
    }

    Write-Host ("Expected HTTP {0} received." -f $ExpectedStatusCode)
  }
}

function Invoke-JsonExpectNotForbidden {
  param(
    [string]$Name,
    [string]$Method,
    [string]$Path,
    [hashtable]$Headers = @{},
    [object]$Body = $null
  )

  try {
    $response = Invoke-Json -Method $Method -Path $Path -Headers $Headers -Body $Body
    Write-Host ("Request passed RBAC guard: {0}" -f $Name) -ForegroundColor Green
    return $response
  } catch {
    $statusCode = Get-HttpStatusCode $_

    if ($statusCode -eq 403) {
      throw ("Expected request to pass RBAC guard for {0}, but got HTTP 403." -f $Name)
    }

    Write-Host (
      "Request passed RBAC guard for {0} and failed later with non-403 HTTP {1}." -f $Name,
      $statusCode
    ) -ForegroundColor Yellow
    return $null
  }
}

function AssertOk {
  param(
    [object]$Response,
    [string]$Name
  )

  if ($null -eq $Response) {
    throw ("{0} returned null response" -f $Name)
  }

  if (($Response.PSObject.Properties.Name -contains "success") -and $Response.success -ne $true) {
    $json = $Response | ConvertTo-Json -Depth 30
    throw ("{0} returned success=false: {1}" -f $Name, $json)
  }
}

Write-Host "Alert Guard Smoke Test" -ForegroundColor Green
Write-Host ("BaseUrl: {0}" -f $BaseUrl)
Write-Host ("AlertId: {0}" -f $AlertId)
Write-Host ("DeviceId: {0}" -f $DeviceId)

Step "Read routes remain open"
$summary = Invoke-Json -Method "GET" -Path "/api/v1/alert-lifecycle/summary"
AssertOk $summary "Alert lifecycle summary"

$list = Invoke-Json -Method "GET" -Path "/api/v1/alert-lifecycle"
AssertOk $list "Alert lifecycle list"

$active = Invoke-Json -Method "GET" -Path "/api/v1/alert-lifecycle/active"
AssertOk $active "Alert lifecycle active list"

Step "Single alert acknowledge is protected"
Invoke-JsonExpectHttpError `
  -Method "POST" `
  -Path ("/api/v1/alert-lifecycle/{0}/acknowledge" -f $AlertId) `
  -ExpectedStatusCode 403 `
  -Body @{ reason = "Denied acknowledge from smoke test" }

Invoke-JsonExpectNotForbidden `
  -Name "acknowledge with alert:acknowledge" `
  -Method "POST" `
  -Path ("/api/v1/alert-lifecycle/{0}/acknowledge" -f $AlertId) `
  -Headers @{ "x-rbac-permissions" = "alert:acknowledge" } `
  -Body @{ reason = "Allowed acknowledge from smoke test" } | Out-Null

Invoke-JsonExpectNotForbidden `
  -Name "acknowledge with alert:update fallback" `
  -Method "POST" `
  -Path ("/api/v1/alert-lifecycle/{0}/acknowledge" -f $AlertId) `
  -Headers @{ "x-rbac-permissions" = "alert:update" } `
  -Body @{ reason = "Allowed acknowledge via update fallback" } | Out-Null

Step "Single alert resolve is protected"
Invoke-JsonExpectHttpError `
  -Method "POST" `
  -Path ("/api/v1/alert-lifecycle/{0}/resolve" -f $AlertId) `
  -ExpectedStatusCode 403 `
  -Body @{ reason = "Denied resolve from smoke test" }

Invoke-JsonExpectNotForbidden `
  -Name "resolve with alert:resolve" `
  -Method "POST" `
  -Path ("/api/v1/alert-lifecycle/{0}/resolve" -f $AlertId) `
  -Headers @{ "x-rbac-permissions" = "alert:resolve" } `
  -Body @{ reason = "Allowed resolve from smoke test" } | Out-Null

Invoke-JsonExpectNotForbidden `
  -Name "resolve with alert:manage fallback" `
  -Method "POST" `
  -Path ("/api/v1/alert-lifecycle/{0}/resolve" -f $AlertId) `
  -Headers @{ "x-rbac-permissions" = "alert:manage" } `
  -Body @{ reason = "Allowed resolve via manage fallback" } | Out-Null

Step "Bulk acknowledge is protected"
Invoke-JsonExpectHttpError `
  -Method "POST" `
  -Path "/api/v1/alert-lifecycle/bulk/acknowledge" `
  -ExpectedStatusCode 403 `
  -Body @{ alertIds = @($AlertId); reason = "Denied bulk acknowledge" }

Invoke-JsonExpectNotForbidden `
  -Name "bulk acknowledge with alert:bulk" `
  -Method "POST" `
  -Path "/api/v1/alert-lifecycle/bulk/acknowledge" `
  -Headers @{ "x-rbac-permissions" = "alert:bulk" } `
  -Body @{ alertIds = @($AlertId); reason = "Allowed bulk acknowledge" } | Out-Null

Invoke-JsonExpectNotForbidden `
  -Name "bulk acknowledge with alert:update fallback" `
  -Method "POST" `
  -Path "/api/v1/alert-lifecycle/bulk/acknowledge" `
  -Headers @{ "x-rbac-permissions" = "alert:update" } `
  -Body @{ alertIds = @($AlertId); reason = "Allowed bulk acknowledge via update fallback" } | Out-Null

Step "Bulk resolve is protected"
Invoke-JsonExpectHttpError `
  -Method "POST" `
  -Path "/api/v1/alert-lifecycle/bulk/resolve" `
  -ExpectedStatusCode 403 `
  -Body @{ alertIds = @($AlertId); reason = "Denied bulk resolve" }

Invoke-JsonExpectNotForbidden `
  -Name "bulk resolve with alert:bulk" `
  -Method "POST" `
  -Path "/api/v1/alert-lifecycle/bulk/resolve" `
  -Headers @{ "x-rbac-permissions" = "alert:bulk" } `
  -Body @{ alertIds = @($AlertId); reason = "Allowed bulk resolve" } | Out-Null

Invoke-JsonExpectNotForbidden `
  -Name "bulk resolve with alert:manage fallback" `
  -Method "POST" `
  -Path "/api/v1/alert-lifecycle/bulk/resolve" `
  -Headers @{ "x-rbac-permissions" = "alert:manage" } `
  -Body @{ alertIds = @($AlertId); reason = "Allowed bulk resolve via manage fallback" } | Out-Null

Step "Device resolve-active is protected"
Invoke-JsonExpectHttpError `
  -Method "POST" `
  -Path ("/api/v1/alert-lifecycle/device/{0}/resolve-active" -f $DeviceId) `
  -ExpectedStatusCode 403 `
  -Body @{ reason = "Denied device resolve active" }

Invoke-JsonExpectNotForbidden `
  -Name "device resolve-active with alert:resolve" `
  -Method "POST" `
  -Path ("/api/v1/alert-lifecycle/device/{0}/resolve-active" -f $DeviceId) `
  -Headers @{ "x-rbac-permissions" = "alert:resolve" } `
  -Body @{ reason = "Allowed device resolve active" } | Out-Null

Invoke-JsonExpectNotForbidden `
  -Name "device resolve-active with alert:bulk" `
  -Method "POST" `
  -Path ("/api/v1/alert-lifecycle/device/{0}/resolve-active" -f $DeviceId) `
  -Headers @{ "x-rbac-permissions" = "alert:bulk" } `
  -Body @{ reason = "Allowed device resolve active via bulk" } | Out-Null

Write-Host ""
Write-Host "Alert guard smoke test completed." -ForegroundColor Green
