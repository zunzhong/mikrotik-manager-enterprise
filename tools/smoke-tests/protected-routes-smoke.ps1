param(
  [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

$SmokeUserId = "protected-smoke-$([DateTime]::UtcNow.Ticks)"

function Step {
  param([string]$Message)

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
    throw "Expected HTTP $ExpectedStatusCode but request succeeded: $json"
  } catch {
    $exception = $_.Exception

    if (-not ($exception.Response)) {
      throw
    }

    $statusCode = [int]$exception.Response.StatusCode

    if ($statusCode -ne $ExpectedStatusCode) {
      throw "Expected HTTP $ExpectedStatusCode but got HTTP $statusCode"
    }

    Write-Host "Expected HTTP $ExpectedStatusCode received."
  }
}

function AssertOk {
  param(
    [object]$Response,
    [string]$Name
  )

  if ($null -eq $Response) {
    throw "$Name returned null response"
  }

  if (($Response.PSObject.Properties.Name -contains "success") -and $Response.success -ne $true) {
    $json = $Response | ConvertTo-Json -Depth 30
    throw "$Name returned success=false: $json"
  }
}

function AssertValue {
  param(
    [object]$Actual,
    [object]$Expected,
    [string]$Name
  )

  if ($Actual -ne $Expected) {
    throw "$Name expected '$Expected' but got '$Actual'"
  }
}

Write-Host "Protected Route Smoke Test" -ForegroundColor Green
Write-Host "BaseUrl: $BaseUrl"
Write-Host "SmokeUserId: $SmokeUserId"

Step "Seed RBAC defaults"
$seed = Invoke-Json -Method "POST" -Path "/api/v1/rbac/seed-defaults" -Body @{}
AssertOk $seed "Seed RBAC defaults"

Step "Audit export denied without RBAC principal"
Invoke-JsonExpectHttpError `
  -Method "GET" `
  -Path "/api/v1/audit/export?format=json" `
  -ExpectedStatusCode 403

Step "Audit export allowed with audit:export permission"
$auditExport = Invoke-Json `
  -Method "GET" `
  -Path "/api/v1/audit/export?format=json" `
  -Headers @{ "x-rbac-permissions" = "audit:export" }

AssertOk $auditExport "Audit export"
if ($null -eq $auditExport.data.count) {
  throw "Audit export expected data.count"
}
$auditExport | ConvertTo-Json -Depth 10

Step "Audit retention denied without RBAC principal"
Invoke-JsonExpectHttpError `
  -Method "POST" `
  -Path "/api/v1/audit/retention/prune" `
  -ExpectedStatusCode 403 `
  -Body @{ days = 30; dryRun = $true }

Step "Audit retention denied with audit:export only"
Invoke-JsonExpectHttpError `
  -Method "POST" `
  -Path "/api/v1/audit/retention/prune" `
  -ExpectedStatusCode 403 `
  -Headers @{ "x-rbac-permissions" = "audit:export" } `
  -Body @{ days = 30; dryRun = $true }

Step "Audit retention allowed with audit:prune permission"
$auditRetention = Invoke-Json `
  -Method "POST" `
  -Path "/api/v1/audit/retention/prune" `
  -Headers @{ "x-rbac-permissions" = "audit:prune" } `
  -Body @{ days = 30; dryRun = $true }

AssertOk $auditRetention "Audit retention prune dry-run"
AssertValue $auditRetention.data.dryRun $true "Audit retention dryRun"
$auditRetention | ConvertTo-Json -Depth 10

Step "RBAC assignment denied without RBAC principal"
Invoke-JsonExpectHttpError `
  -Method "POST" `
  -Path "/api/v1/rbac/users/$SmokeUserId/roles" `
  -ExpectedStatusCode 403 `
  -Body @{ roleId = "viewer"; assignedBy = "protected-route-smoke" }

Step "RBAC assignment allowed with rbac:assign"
$assignViewer = Invoke-Json `
  -Method "POST" `
  -Path "/api/v1/rbac/users/$SmokeUserId/roles" `
  -Headers @{ "x-rbac-permissions" = "rbac:assign" } `
  -Body @{ roleId = "viewer"; assignedBy = "protected-route-smoke" }

AssertOk $assignViewer "RBAC assign viewer"
AssertValue $assignViewer.data.userId $SmokeUserId "Assigned user ID"
AssertValue $assignViewer.data.roleId "viewer" "Assigned role ID"
$assignViewer | ConvertTo-Json -Depth 10

Step "RBAC assignment allowed with legacy role.write"
$assignAuditor = Invoke-Json `
  -Method "POST" `
  -Path "/api/v1/rbac/users/$SmokeUserId/roles" `
  -Headers @{ "x-rbac-permissions" = "role.write" } `
  -Body @{ roleId = "auditor"; assignedBy = "protected-route-smoke" }

AssertOk $assignAuditor "RBAC assign auditor"
AssertValue $assignAuditor.data.userId $SmokeUserId "Assigned legacy user ID"
AssertValue $assignAuditor.data.roleId "auditor" "Assigned legacy role ID"
$assignAuditor | ConvertTo-Json -Depth 10

Step "RBAC removal denied without RBAC principal"
Invoke-JsonExpectHttpError `
  -Method "DELETE" `
  -Path "/api/v1/rbac/users/$SmokeUserId/roles/viewer" `
  -ExpectedStatusCode 403

Step "RBAC removal allowed with rbac:assign"
$removeViewer = Invoke-Json `
  -Method "DELETE" `
  -Path "/api/v1/rbac/users/$SmokeUserId/roles/viewer" `
  -Headers @{ "x-rbac-permissions" = "rbac:assign" }

AssertOk $removeViewer "RBAC remove viewer"
AssertValue $removeViewer.data.removed $true "Viewer removed"
$removeViewer | ConvertTo-Json -Depth 10

Step "RBAC removal allowed with legacy role.write"
$removeAuditor = Invoke-Json `
  -Method "DELETE" `
  -Path "/api/v1/rbac/users/$SmokeUserId/roles/auditor" `
  -Headers @{ "x-rbac-permissions" = "role.write" }

AssertOk $removeAuditor "RBAC remove auditor"
AssertValue $removeAuditor.data.removed $true "Auditor removed"
$removeAuditor | ConvertTo-Json -Depth 10

Step "Unprotected read routes still work"
$roles = Invoke-Json -Method "GET" -Path "/api/v1/rbac/roles"
AssertOk $roles "RBAC roles read"

$auditList = Invoke-Json -Method "GET" -Path "/api/v1/audit?limit=5"
AssertOk $auditList "Audit list read"

Write-Host ""
Write-Host "Protected route smoke test completed." -ForegroundColor Green
