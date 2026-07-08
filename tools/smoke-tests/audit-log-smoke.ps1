param(
  [string]$BaseUrl = "http://localhost:3000",
  [switch]$SkipNotificationIntegration
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

Write-Host "Audit Log Engine Smoke Test" -ForegroundColor Green
Write-Host "BaseUrl: $BaseUrl"

Write-Step "Seed demo audit events"
$seed = Invoke-JsonApi -Method "POST" -Path "/api/v1/audit/seed-demo" -Body @{}
Assert-ApiSuccess $seed "Seed demo"
$seed | ConvertTo-Json -Depth 30

Write-Step "Create manual audit event"
$manual = Invoke-JsonApi `
  -Method "POST" `
  -Path "/api/v1/audit" `
  -Body @{
    action = "manual.audit.smoke_test"
    summary = "Manual audit event from audit-log-smoke.ps1"
    severity = "info"
    status = "success"
    actor = @{
      type = "api"
      id = "audit-smoke-test"
      name = "Audit Smoke Test"
    }
    entity = @{
      type = "system"
      id = "audit"
      name = "Audit Log Engine"
    }
    metadata = @{
      smokeTest = $true
      generatedBy = "PowerShell"
    }
  }

Assert-ApiSuccess $manual "Create manual audit event"
$manual | ConvertTo-Json -Depth 30
$manualId = $manual.data.id

Write-Step "Get audit event by ID: $manualId"
$getById = Invoke-JsonApi -Path "/api/v1/audit/$manualId"
Assert-ApiSuccess $getById "Get audit event by ID"
$getById | ConvertTo-Json -Depth 30

Write-Step "Audit summary"
$summary = Invoke-JsonApi -Path "/api/v1/audit/summary"
Assert-ApiSuccess $summary "Audit summary"
$summary | ConvertTo-Json -Depth 30

Write-Step "List recent audit events"
$recent = Invoke-JsonApi -Path "/api/v1/audit?limit=20"
Assert-ApiSuccess $recent "List recent audit events"
$recent | ConvertTo-Json -Depth 30

Write-Step "Filter audit failures"
$failures = Invoke-JsonApi -Path "/api/v1/audit?status=failure&limit=20"
Assert-ApiSuccess $failures "Filter audit failures"
$failures | ConvertTo-Json -Depth 30

Write-Step "Filter critical audit events"
$critical = Invoke-JsonApi -Path "/api/v1/audit?severity=critical&limit=20"
Assert-ApiSuccess $critical "Filter critical audit events"
$critical | ConvertTo-Json -Depth 30

Write-Step "Filter notification channel audit events"
$notificationChannels = Invoke-JsonApi -Path "/api/v1/audit?entityType=notification_channel&limit=20"
Assert-ApiSuccess $notificationChannels "Filter notification channel audit events"
$notificationChannels | ConvertTo-Json -Depth 30

if (-not $SkipNotificationIntegration) {
  Write-Step "Trigger notification defaults to verify audit integration"
  $notificationSeed = Invoke-JsonApi -Method "POST" -Path "/api/v1/notifications/seed-defaults" -Body @{}
  Assert-ApiSuccess $notificationSeed "Notification seed defaults"
  $notificationSeed | ConvertTo-Json -Depth 30

  Write-Step "List notification audit events after integration trigger"
  $notificationAudit = Invoke-JsonApi -Path "/api/v1/audit?action=notification.defaults.seeded&limit=20"
  Assert-ApiSuccess $notificationAudit "Notification audit integration"
  $notificationAudit | ConvertTo-Json -Depth 30
}

Write-Step "Final audit summary"
$finalSummary = Invoke-JsonApi -Path "/api/v1/audit/summary"
Assert-ApiSuccess $finalSummary "Final audit summary"
$finalSummary | ConvertTo-Json -Depth 30

Write-Host ""
Write-Host "Audit smoke test completed." -ForegroundColor Green
