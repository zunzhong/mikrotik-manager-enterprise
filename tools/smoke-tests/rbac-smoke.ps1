param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$UserId = "rbac-smoke-user",
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

  if ($null -eq $Body -and $Method.ToUpperInvariant() -eq "GET") {
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
    throw "$Name returned success=false"
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

Write-Host "RBAC API Smoke Test" -ForegroundColor Green
Write-Host "BaseUrl: $BaseUrl"
Write-Host "UserId: $UserId"

Step "List RBAC permissions"
$permissions = ApiJson "GET" "/api/v1/rbac/permissions"
AssertOk $permissions "List permissions"
$permissions | ConvertTo-Json -Depth 30

if (-not ($permissions.data -contains "audit:export")) {
  throw "Permission catalog does not contain audit:export"
}

if (-not ($permissions.data -contains "rbac:manage")) {
  throw "Permission catalog does not contain rbac:manage"
}

Step "List RBAC roles"
$roles = ApiJson "GET" "/api/v1/rbac/roles"
AssertOk $roles "List roles"
$roles | ConvertTo-Json -Depth 30

$roleIds = @($roles.data | ForEach-Object { $_.id })
foreach ($expectedRole in @("owner", "admin", "operator", "auditor", "viewer")) {
  if (-not ($roleIds -contains $expectedRole)) {
    throw "Missing default RBAC role: $expectedRole"
  }
}

Step "Get owner role"
$owner = ApiJson "GET" "/api/v1/rbac/roles/owner"
AssertOk $owner "Get owner role"
$owner | ConvertTo-Json -Depth 30

if (-not ($owner.data.permissions -contains "*")) {
  throw "Owner role does not include wildcard permission"
}

Step "Assign admin role to user"
$assignAdmin = ApiJson "POST" "/api/v1/rbac/users/$UserId/roles" @{
  roleId = "admin"
  assignedBy = "rbac-smoke-test"
}
AssertOk $assignAdmin "Assign admin role"
$assignAdmin | ConvertTo-Json -Depth 30

Step "Assign auditor role to user"
$assignAuditor = ApiJson "POST" "/api/v1/rbac/users/$UserId/roles" @{
  roleId = "auditor"
  assignedBy = "rbac-smoke-test"
}
AssertOk $assignAuditor "Assign auditor role"
$assignAuditor | ConvertTo-Json -Depth 30

Step "List user roles"
$userRoles = ApiJson "GET" "/api/v1/rbac/users/$UserId/roles"
AssertOk $userRoles "List user roles"
$userRoles | ConvertTo-Json -Depth 30

$userRoleIds = @($userRoles.data | ForEach-Object { $_.roleId })
if (-not ($userRoleIds -contains "admin")) {
  throw "User does not have admin role"
}
if (-not ($userRoleIds -contains "auditor")) {
  throw "User does not have auditor role"
}

Step "Get user permissions"
$userPermissions = ApiJson "GET" "/api/v1/rbac/users/$UserId/permissions"
AssertOk $userPermissions "Get user permissions"
$userPermissions | ConvertTo-Json -Depth 30

if (-not ($userPermissions.data.permissions -contains "audit:export")) {
  throw "User permissions do not include audit:export"
}

Step "Check user audit export permission"
$checkAuditExport = ApiJson "POST" "/api/v1/rbac/check" @{
  principal = @{
    userId = $UserId
  }
  permission = "audit:export"
}
AssertAllowed $checkAuditExport "Check audit export" $true
$checkAuditExport | ConvertTo-Json -Depth 30

Step "Check viewer audit export denial"
$checkViewerAuditExport = ApiJson "POST" "/api/v1/rbac/check" @{
  principal = @{
    roleIds = @("viewer")
  }
  permission = "audit:export"
}
AssertAllowed $checkViewerAuditExport "Check viewer audit export" $false
$checkViewerAuditExport | ConvertTo-Json -Depth 30

Step "Check super admin RBAC manage permission"
$checkSuperAdmin = ApiJson "POST" "/api/v1/rbac/check" @{
  principal = @{
    isSuperAdmin = $true
  }
  permission = "rbac:manage"
}
AssertAllowed $checkSuperAdmin "Check super admin rbac manage" $true
$checkSuperAdmin | ConvertTo-Json -Depth 30

Step "Remove auditor role from user"
$removeAuditor = ApiJson "DELETE" "/api/v1/rbac/users/$UserId/roles/auditor"
AssertOk $removeAuditor "Remove auditor role"
$removeAuditor | ConvertTo-Json -Depth 30

Step "Verify auditor role removed"
$userRolesAfterRemove = ApiJson "GET" "/api/v1/rbac/users/$UserId/roles"
AssertOk $userRolesAfterRemove "List user roles after remove"
$userRolesAfterRemove | ConvertTo-Json -Depth 30

$userRoleIdsAfterRemove = @($userRolesAfterRemove.data | ForEach-Object { $_.roleId })
if ($userRoleIdsAfterRemove -contains "auditor") {
  throw "Auditor role should be removed"
}

if (-not $SkipAuditVerify) {
  Step "Verify RBAC audit events"
  $auditAssigned = ApiJson "GET" "/api/v1/audit?action=rbac.user_role.assigned&limit=20"
  AssertOk $auditAssigned "RBAC assigned audit events"
  $auditAssigned | ConvertTo-Json -Depth 30

  $auditChecked = ApiJson "GET" "/api/v1/audit?action=rbac.permission.checked&limit=20"
  AssertOk $auditChecked "RBAC permission checked audit events"
  $auditChecked | ConvertTo-Json -Depth 30

  $auditRemoved = ApiJson "GET" "/api/v1/audit?action=rbac.user_role.removed&limit=20"
  AssertOk $auditRemoved "RBAC removed audit events"
  $auditRemoved | ConvertTo-Json -Depth 30
}

Write-Host ""
Write-Host "RBAC smoke test completed." -ForegroundColor Green
