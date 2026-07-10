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

function AssertEquals {
  param(
    [object]$Actual,
    [object]$Expected,
    [string]$Name
  )

  if ($Actual -ne $Expected) {
    throw "$Name expected '$Expected' but got '$Actual'"
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

Write-Host "Auth Session Smoke Test" -ForegroundColor Green
Write-Host "BaseUrl: $BaseUrl"

Step "Current session returns anonymous without headers"
$anonymous = Invoke-Json -Method "GET" -Path "/api/v1/auth/session/current"
AssertOk $anonymous "Anonymous current session"
AssertEquals $anonymous.data.authenticated $false "Anonymous authenticated flag"
$anonymous | ConvertTo-Json -Depth 30

Step "Current session resolves user from headers"
$current = Invoke-Json `
  -Method "GET" `
  -Path "/api/v1/auth/session/current" `
  -Headers @{
    "x-user-id" = "auth-smoke-user"
    "x-user-email" = "auth-smoke@example.local"
    "x-user-name" = "Auth Smoke User"
    "x-rbac-roles" = "admin,auditor"
    "x-rbac-permissions" = "audit:export,device:read"
    "x-rbac-super-admin" = "false"
  }

AssertOk $current "Header current session"
AssertEquals $current.data.authenticated $true "Header authenticated flag"
AssertEquals $current.data.user.id "auth-smoke-user" "Current user ID"
AssertEquals $current.data.user.email "auth-smoke@example.local" "Current user email"
AssertEquals $current.data.user.name "Auth Smoke User" "Current user name"
AssertEquals $current.data.user.isSuperAdmin $false "Current user super admin"
AssertContains @($current.data.user.roleIds) "admin" "Current user roles"
AssertContains @($current.data.user.roleIds) "auditor" "Current user roles"
AssertContains @($current.data.user.permissions) "audit:export" "Current user permissions"
AssertContains @($current.data.user.permissions) "device:read" "Current user permissions"
$current | ConvertTo-Json -Depth 30

Step "RBAC principal returns anonymous null without headers"
$anonymousPrincipal = Invoke-Json -Method "GET" -Path "/api/v1/auth/session/rbac-principal"
AssertOk $anonymousPrincipal "Anonymous RBAC principal"
AssertEquals $anonymousPrincipal.data.authenticated $false "Anonymous principal authenticated flag"

if ($null -ne $anonymousPrincipal.data.principal) {
  throw "Anonymous RBAC principal expected principal=null"
}

$anonymousPrincipal | ConvertTo-Json -Depth 30

Step "RBAC principal resolves roles and permissions from headers"
$principal = Invoke-Json `
  -Method "GET" `
  -Path "/api/v1/auth/session/rbac-principal" `
  -Headers @{
    "x-user-id" = "auth-smoke-user"
    "x-rbac-roles" = "admin"
    "x-rbac-permissions" = "audit:export"
  }

AssertOk $principal "Header RBAC principal"
AssertEquals $principal.data.authenticated $true "RBAC principal authenticated flag"
AssertEquals $principal.data.principal.userId "auth-smoke-user" "RBAC principal user ID"
AssertContains @($principal.data.principal.roleIds) "admin" "RBAC principal roles"
AssertContains @($principal.data.principal.permissions) "audit:export" "RBAC principal permissions"
$principal | ConvertTo-Json -Depth 30

Step "RBAC principal supports super admin header"
$superAdmin = Invoke-Json `
  -Method "GET" `
  -Path "/api/v1/auth/session/rbac-principal" `
  -Headers @{
    "x-user-id" = "auth-super-admin"
    "x-rbac-super-admin" = "true"
  }

AssertOk $superAdmin "Super admin RBAC principal"
AssertEquals $superAdmin.data.authenticated $true "Super admin authenticated flag"
AssertEquals $superAdmin.data.principal.userId "auth-super-admin" "Super admin user ID"
AssertEquals $superAdmin.data.principal.isSuperAdmin $true "Super admin flag"
$superAdmin | ConvertTo-Json -Depth 30

Write-Host ""
Write-Host "Auth session smoke test completed." -ForegroundColor Green
