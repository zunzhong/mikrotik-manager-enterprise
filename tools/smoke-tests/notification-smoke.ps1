param(
  [string]$BaseUrl = "http://localhost:3000",
  [switch]$SkipManagementTest,
  [switch]$ForceFailedWebhook
)

$ErrorActionPreference = "Stop"

function Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Api {
  param(
    [string]$Method = "GET",
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

function First-RetryableId($Items) {
  foreach ($item in $Items) {
    if ($item.status -eq "failed" -or $item.status -eq "skipped") {
      return $item.id
    }
  }

  return ""
}

function Management-Test {
  Step "Create management-test channel"
  $channel = Api POST "/api/v1/notifications/channels" @{
    name = "Smoke Test Management Channel"
    type = "webhook"
    enabled = $true
    config = @{
      url = "http://127.0.0.1:1/management-smoke"
      method = "POST"
      timeoutMs = 1000
      headers = @{
        "x-source" = "mikrotik-manager-enterprise"
      }
    }
  }
  $channel | ConvertTo-Json -Depth 30
  $channelId = $channel.data.id

  Step "Create management-test rule"
  $rule = Api POST "/api/v1/notifications/rules" @{
    name = "Smoke Test Management Rule"
    enabled = $true
    eventTypes = @("ALERT_OPENED")
    severities = @("critical")
    channelIds = @($channelId)
  }
  $rule | ConvertTo-Json -Depth 30
  $ruleId = $rule.data.id

  Step "Patch channel disabled/enabled"
  Api PATCH "/api/v1/notifications/channels/$channelId" @{ enabled = $false } | ConvertTo-Json -Depth 30
  Api PATCH "/api/v1/notifications/channels/$channelId" @{
    enabled = $true
    name = "Smoke Test Management Channel Updated"
  } | ConvertTo-Json -Depth 30

  Step "Patch rule disabled/enabled"
  Api PATCH "/api/v1/notifications/rules/$ruleId" @{ enabled = $false } | ConvertTo-Json -Depth 30
  Api PATCH "/api/v1/notifications/rules/$ruleId" @{
    enabled = $true
    name = "Smoke Test Management Rule Updated"
  } | ConvertTo-Json -Depth 30

  Step "Delete management-test rule/channel"
  Api DELETE "/api/v1/notifications/rules/$ruleId" @{} | ConvertTo-Json -Depth 30
  Api DELETE "/api/v1/notifications/channels/$channelId" @{} | ConvertTo-Json -Depth 30
}

Write-Host "Notification Engine Smoke Test" -ForegroundColor Green
Write-Host "BaseUrl: $BaseUrl"

Step "Seed defaults"
Api POST "/api/v1/notifications/seed-defaults" @{} | ConvertTo-Json -Depth 30

if (-not $SkipManagementTest) {
  Management-Test
}

if ($ForceFailedWebhook) {
  Step "Create intentionally failing webhook channel/rule"
  $badChannel = Api POST "/api/v1/notifications/channels" @{
    name = "Smoke Test Failing Webhook"
    type = "webhook"
    enabled = $true
    config = @{
      url = "http://127.0.0.1:1/unreachable"
      method = "POST"
      timeoutMs = 1000
    }
  }
  $badChannel | ConvertTo-Json -Depth 30
  $badId = $badChannel.data.id

  Api POST "/api/v1/notifications/rules" @{
    name = "Smoke Test Failing Webhook Rule"
    enabled = $true
    eventTypes = @("ALERT_OPENED")
    severities = @("critical")
    channelIds = @($badId)
  } | ConvertTo-Json -Depth 30
}

Step "List channels/rules"
Api GET "/api/v1/notifications/channels" | ConvertTo-Json -Depth 30
Api GET "/api/v1/notifications/rules" | ConvertTo-Json -Depth 30

Step "Queue test payload"
Api POST "/api/v1/notifications/test" @{
  eventType = "ALERT_OPENED"
  severity = "critical"
  title = "Notification smoke test"
  message = "Smoke test from tools/smoke-tests/notification-smoke.ps1"
  source = "notification-smoke-test"
  metadata = @{
    smokeTest = $true
    generatedBy = "PowerShell"
  }
} | ConvertTo-Json -Depth 30

Step "Process pending"
Api POST "/api/v1/notifications/process-pending" @{ limit = 50 } | ConvertTo-Json -Depth 30

Step "Retry failed/skipped"
Api POST "/api/v1/notifications/retry-failed" @{ limit = 50 } | ConvertTo-Json -Depth 30

Step "Recent deliveries"
$deliveries = Api GET "/api/v1/notifications/deliveries?limit=20"
$deliveries | ConvertTo-Json -Depth 30

$retryId = First-RetryableId $deliveries.data
if ($retryId.Trim().Length -gt 0) {
  Step "Retry one delivery: $retryId"
  Api POST "/api/v1/notifications/deliveries/$retryId/retry" @{} | ConvertTo-Json -Depth 30
}
else {
  Step "No failed/skipped delivery found for single retry"
}

Step "Summary"
Api GET "/api/v1/notifications/summary" | ConvertTo-Json -Depth 30

Write-Host ""
Write-Host "Notification smoke test completed." -ForegroundColor Green
