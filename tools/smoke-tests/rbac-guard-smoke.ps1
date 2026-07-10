param(
  [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

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

    try {
      $stream = $exception.Response.GetResponseStream()
      $reader = New-Object System.IO.StreamReader($stream)
      $bodyText = $reader.ReadToEnd()
      Write-Host $bodyText
    } catch {
      Write-Host "Expected HTTP $ExpectedStatusCode received."
    }
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

function AssertAllowedProbe {
  param(
    [object]$Response,
    [string]$Name,
    [string]$Permission
  )

  AssertOk $Response $Name

  if ($Response.data.allowed -ne $true) {
    throw "$Name expected data.allowed=true"
  }

  if ($Response.data.permission -ne $Permission) {
    throw "$Name expected permission=$Permission but got $($Response.data.permission)"
  }
}

Write-Host "RBAC Guard Smoke Test" -ForegroundColor Green
Write-Host "BaseUrl: $BaseUrl"

Step "Seed RBAC defaults"
$seed = Invoke-Json -Method "POST" -Path "/api/v1/rbac/seed-defaults" -Body @{}
AssertOk $seed "Seed defaults"
$seed | ConvertTo-Json -Depth 30

Step "Denied: audit-export without RBAC headers"
Invoke-JsonExpectHttpError `
  -Method "GET" `
  -Path "/api/v1/rbac/guard/probe/audit-export" `
  -ExpectedStatusCode 403

Step "Allowed: audit-export by admin role"
$adminAuditExport = Invoke-Json `
  -Method "GET" `
  -Path "/api/v1/rbac/guard/probe/audit-export" `
  -Headers @{ "x-rbac-roles" = "admin" }

AssertAllowedProbe $adminAuditExport "Admin audit-export probe" "audit:export"
$adminAuditExport | ConvertTo-Json -Depth 30

Step "Allowed: audit-export by direct permission"
$directAuditExport = Invoke-Json `
  -Method "GET" `
  -Path "/api/v1/rbac/guard/probe/audit-export" `
  -Headers @{ "x-rbac-permissions" = "audit:export" }

AssertAllowedProbe $directAuditExport "Direct permission audit-export probe" "audit:export"
$directAuditExport | ConvertTo-Json -Depth 30

Step "Denied: rbac-manage by admin role"
Invoke-JsonExpectHttpError `
  -Method "GET" `
  -Path "/api/v1/rbac/guard/probe/rbac-manage" `
  -ExpectedStatusCode 403 `
  -Headers @{ "x-rbac-roles" = "admin" }

Step "Allowed: rbac-manage by owner role"
$ownerRbacManage = Invoke-Json `
  -Method "GET" `
  -Path "/api/v1/rbac/guard/probe/rbac-manage" `
  -Headers @{ "x-rbac-roles" = "owner" }

AssertAllowedProbe $ownerRbacManage "Owner rbac-manage probe" "rbac:manage"
$ownerRbacManage | ConvertTo-Json -Depth 30

Step "Allowed: rbac-manage by super admin header"
$superAdminRbacManage = Invoke-Json `
  -Method "GET" `
  -Path "/api/v1/rbac/guard/probe/rbac-manage" `
  -Headers @{ "x-rbac-super-admin" = "true" }

AssertAllowedProbe $superAdminRbacManage "Super admin rbac-manage probe" "rbac:manage"
$superAdminRbacManage | ConvertTo-Json -Depth 30

Write-Host ""
Write-Host "RBAC guard smoke test completed." -ForegroundColor Green
