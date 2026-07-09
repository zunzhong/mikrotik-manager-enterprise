param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$UserId = "",
  [switch]$SkipAuditVerify
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($UserId)) {
  $UserId = "rbac-persist-smoke-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
}

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

  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri
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

function AssertContains {
  param(
    [object[]]$Items,
    [string]$Expected,
    [string]$Name
  )

  if (-not ($Items -contains $Expected)) {
    throw "$Name does not contain expected value: $Expected"
  }
}

function AssertAllowed {
  param(
    [object]$Response,
    [string]$Name,
    [bool]$Expected
  )

  AssertOk $Response $Name

  if ($Response.data.allowed -ne $Expected) {
    throw "$Name expected allowed=$Expected but got $($Response.data.allowed)"
  }
}

Write-Host "RBAC Persistence Smoke Test" -ForegroundColor Green
Write-Host "BaseUrl: $BaseUrl"
Write-Host "UserId: $UserId"

Step "Seed defaults by listing roles"
$roles = ApiJson "GET" "/api/v1/rbac/roles"
AssertOk $roles "List roles"
$roleIds = @($roles.data | ForEach-Object { $_.id })

foreach ($expectedRole in @("owner", "admin", "operator", "auditor", "viewer")) {
  AssertContains $roleIds $expectedRole "Default roles"
}

Step "Verify role permissions are loaded from DB"
$adminRole = ApiJson "GET" "/api/v1/rbac/roles/admin"
AssertOk $adminRole "Get admin role"
$adminPermissions = @($adminRole.data.permissions)

AssertContains $adminPermissions "dashboard:read" "Admin role permissions"
AssertContains $adminPermissions "audit:export" "Admin role permissions"

Step "Assign admin role to smoke user"
$assignAdmin = ApiJson "POST" "/api/v1/rbac/users/$UserId/roles" @{
  roleId = "admin"
  assignedBy = "rbac-persistence-smoke"
}
AssertOk $assignAdmin "Assign admin role"
$assignAdmin | ConvertTo-Json -Depth 30

Step "Assign admin role again to verify upsert/no duplicate"
$assignAdminAgain = ApiJson "POST" "/api/v1/rbac/users/$UserId/roles" @{
  roleId = "admin"
  assignedBy = "rbac-persistence-smoke"
}
AssertOk $assignAdminAgain "Assign admin role again"
$assignAdminAgain | ConvertTo-Json -Depth 30

Step "Assign auditor role"
$assignAuditor = ApiJson "POST" "/api/v1/rbac/users/$UserId/roles" @{
  roleId = "auditor"
  assignedBy = "rbac-persistence-smoke"
}
AssertOk $assignAuditor "Assign auditor role"
$assignAuditor | ConvertTo-Json -Depth 30

Step "List persisted user role assignments"
$userRoles = ApiJson "GET" "/api/v1/rbac/users/$UserId/roles"
AssertOk $userRoles "List user roles"
$userRoles | ConvertTo-Json -Depth 30

$userRoleIds = @($userRoles.data | ForEach-Object { $_.roleId })
AssertContains $userRoleIds "admin" "Persisted user roles"
AssertContains $userRoleIds "auditor" "Persisted user roles"

$adminCount = @($userRoleIds | Where-Object { $_ -eq "admin" }).Count
if ($adminCount -ne 1) {
  throw "Expected exactly one admin assignment after duplicate assign, got $adminCount"
}

Step "Resolve persisted effective permissions"
$userPermissions = ApiJson "GET" "/api/v1/rbac/users/$UserId/permissions"
AssertOk $userPermissions "Get user permissions"
$userPermissions | ConvertTo-Json -Depth 30

$permissions = @($userPermissions.data.permissions)
AssertContains $permissions "dashboard:read" "Effective permissions"
AssertContains $permissions "audit:export" "Effective permissions"

Step "Check persisted permission allow"
$checkAuditExport = ApiJson "POST" "/api/v1/rbac/check" @{
  principal = @{
    userId = $UserId
  }
  permission = "audit:export"
}
AssertAllowed $checkAuditExport "Check audit export" $true
$checkAuditExport | ConvertTo-Json -Depth 30

Step "Check denied permission for explicit viewer role"
$checkViewerDenied = ApiJson "POST" "/api/v1/rbac/check" @{
  principal = @{
    roleIds = @("viewer")
  }
  permission = "audit:export"
}
AssertAllowed $checkViewerDenied "Viewer audit export denied" $false
$checkViewerDenied | ConvertTo-Json -Depth 30

Step "Remove auditor role"
$removeAuditor = ApiJson "DELETE" "/api/v1/rbac/users/$UserId/roles/auditor"
AssertOk $removeAuditor "Remove auditor role"
$removeAuditor | ConvertTo-Json -Depth 30

Step "Verify auditor assignment removed and admin assignment remains"
$userRolesAfterRemove = ApiJson "GET" "/api/v1/rbac/users/$UserId/roles"
AssertOk $userRolesAfterRemove "List user roles after remove"
$userRolesAfterRemove | ConvertTo-Json -Depth 30

$userRoleIdsAfterRemove = @($userRolesAfterRemove.data | ForEach-Object { $_.roleId })

if ($userRoleIdsAfterRemove -contains "auditor") {
  throw "Auditor role should be removed"
}

AssertContains $userRoleIdsAfterRemove "admin" "User roles after remove"

if (-not $SkipAuditVerify) {
  Step "Verify RBAC persistence audit events"
  $auditAssigned = ApiJson "GET" "/api/v1/audit?action=rbac.user_role.assigned&limit=50"
  AssertOk $auditAssigned "Assigned audit events"

  $auditChecked = ApiJson "GET" "/api/v1/audit?action=rbac.permission.checked&limit=50"
  AssertOk $auditChecked "Permission checked audit events"

  $auditRemoved = ApiJson "GET" "/api/v1/audit?action=rbac.user_role.removed&limit=50"
  AssertOk $auditRemoved "Removed audit events"

  $assignedJson = $auditAssigned | ConvertTo-Json -Depth 30
  $checkedJson = $auditChecked | ConvertTo-Json -Depth 30
  $removedJson = $auditRemoved | ConvertTo-Json -Depth 30

  if ($assignedJson -notmatch [regex]::Escape($UserId)) {
    throw "Assigned audit events do not include smoke user $UserId"
  }

  if ($checkedJson -notmatch [regex]::Escape($UserId)) {
    throw "Permission checked audit events do not include smoke user $UserId"
  }

  if ($removedJson -notmatch [regex]::Escape($UserId)) {
    throw "Removed audit events do not include smoke user $UserId"
  }
}

Write-Host ""
Write-Host "RBAC persistence smoke test completed." -ForegroundColor Green
Write-Host "Smoke user: $UserId"
