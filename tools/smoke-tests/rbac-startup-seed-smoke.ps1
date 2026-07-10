param(
  [string]$BaseUrl = "http://localhost:3000",
  [switch]$SkipAuditVerify
)

$ErrorActionPreference = "Stop"

function Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function ApiJson {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null
  )

  $uri = "$BaseUrl$Path"
  $upperMethod = $Method.ToUpperInvariant()

  if ($null -eq $Body -and $upperMethod -eq "GET") {
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

function AssertDefaultRoleSet {
  param(
    [object]$RolesResponse,
    [string]$Name
  )

  AssertOk $RolesResponse $Name
  $roleIds = @($RolesResponse.data | ForEach-Object { $_.id })

  foreach ($expectedRole in @("owner", "admin", "operator", "auditor", "viewer")) {
    if (-not ($roleIds -contains $expectedRole)) {
      throw "$Name is missing default role: $expectedRole"
    }

    $count = @($roleIds | Where-Object { $_ -eq $expectedRole }).Count
    if ($count -ne 1) {
      throw "$Name expected exactly one '$expectedRole' role, got $count"
    }
  }
}

function AssertPermission {
  param(
    [object[]]$Permissions,
    [string]$Permission,
    [string]$Name
  )

  if (-not ($Permissions -contains $Permission)) {
    throw "$Name is missing permission: $Permission"
  }
}

Write-Host "RBAC Startup Seed Smoke Test" -ForegroundColor Green
Write-Host "BaseUrl: $BaseUrl"

Step "Verify defaults exist after application startup"
$rolesBefore = ApiJson "GET" "/api/v1/rbac/roles"
AssertDefaultRoleSet $rolesBefore "Startup roles"
$rolesBefore | ConvertTo-Json -Depth 30

Step "Run manual seed endpoint"
$seedFirst = ApiJson "POST" "/api/v1/rbac/seed-defaults" @{}
AssertOk $seedFirst "First manual seed"
$seedFirst | ConvertTo-Json -Depth 30

if ($seedFirst.data.seeded -ne $true) {
  throw "First manual seed did not return seeded=true"
}

Step "Run manual seed endpoint again to verify idempotency"
$seedSecond = ApiJson "POST" "/api/v1/rbac/seed-defaults" @{}
AssertOk $seedSecond "Second manual seed"
$seedSecond | ConvertTo-Json -Depth 30

if ($seedSecond.data.seeded -ne $true) {
  throw "Second manual seed did not return seeded=true"
}

Step "Verify default roles are not duplicated after repeated seed"
$rolesAfter = ApiJson "GET" "/api/v1/rbac/roles"
AssertDefaultRoleSet $rolesAfter "Roles after repeated seed"
$rolesAfter | ConvertTo-Json -Depth 30

Step "Verify owner wildcard permission"
$ownerRole = ApiJson "GET" "/api/v1/rbac/roles/owner"
AssertOk $ownerRole "Owner role"
$ownerRole | ConvertTo-Json -Depth 30

if (-not (@($ownerRole.data.permissions) -contains "*")) {
  throw "Owner role does not include wildcard permission"
}

Step "Verify admin persistent permissions"
$adminRole = ApiJson "GET" "/api/v1/rbac/roles/admin"
AssertOk $adminRole "Admin role"
$adminRole | ConvertTo-Json -Depth 30

$adminPermissions = @($adminRole.data.permissions)

foreach ($permission in @("dashboard:read", "audit:read", "audit:export", "rbac:read")) {
  AssertPermission $adminPermissions $permission "Admin role"
}

if (-not (($adminPermissions -contains "role.write") -or ($adminPermissions -contains "rbac:assign"))) {
  throw "Admin role is missing role assignment permission. Expected role.write or rbac:assign"
}

if (-not $SkipAuditVerify) {
  Step "Verify manual seed audit events"
  $audit = ApiJson "GET" "/api/v1/audit?action=rbac.defaults.seeded&limit=20"
  AssertOk $audit "RBAC defaults seeded audit events"
  $audit | ConvertTo-Json -Depth 30

  $auditJson = $audit | ConvertTo-Json -Depth 30
  if ($auditJson -notmatch "rbac.defaults.seeded") {
    throw "Audit list does not contain rbac.defaults.seeded"
  }
}

Write-Host ""
Write-Host "RBAC startup seed smoke test completed." -ForegroundColor Green
