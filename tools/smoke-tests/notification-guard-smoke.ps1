param(
  [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

$RunId = [DateTime]::UtcNow.Ticks
$ChannelName = "Protected Smoke Webhook $RunId"
$RuleName = "Protected Smoke Rule $RunId"

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

function AssertHasValue {
  param(
    [object]$Value,
    [string]$Name
  )

  if ($null -eq $Value -or "$Value".Length -eq 0) {
    throw "$Name is missing"
  }
}

Write-Host "Notification Guard Smoke Test" -ForegroundColor Green
Write-Host "BaseUrl: $BaseUrl"

Step "Read routes remain open"
$summary = Invoke-Json -Method "GET" -Path "/api/v1/notifications/summary"
AssertOk $summary "Notification summary"

$channels = Invoke-Json -Method "GET" -Path "/api/v1/notifications/channels"
AssertOk $channels "Notification channels read"

$rules = Invoke-Json -Method "GET" -Path "/api/v1/notifications/rules"
AssertOk $rules "Notification rules read"

$deliveries = Invoke-Json -Method "GET" -Path "/api/v1/notifications/deliveries?limit=10"
AssertOk $deliveries "Notification deliveries read"

Step "Channel create denied without RBAC principal"
Invoke-JsonExpectHttpError `
  -Method "POST" `
  -Path "/api/v1/notifications/channels" `
  -ExpectedStatusCode 403 `
  -Body @{
    name = "Denied Smoke Webhook $RunId"
    type = "webhook"
    enabled = $true
    config = @{ url = "https://example.local/denied" }
  }

Step "Channel create allowed with notification:manage"
$channel = Invoke-Json `
  -Method "POST" `
  -Path "/api/v1/notifications/channels" `
  -Headers @{ "x-rbac-permissions" = "notification:manage" } `
  -Body @{
    name = $ChannelName
    type = "webhook"
    enabled = $true
    config = @{ url = "https://example.local/protected-smoke" }
  }

AssertOk $channel "Notification channel create"
AssertHasValue $channel.data.id "Created channel ID"
$channelId = $channel.data.id
$channel | ConvertTo-Json -Depth 10

Step "Channel update denied without RBAC principal"
Invoke-JsonExpectHttpError `
  -Method "PATCH" `
  -Path "/api/v1/notifications/channels/$channelId" `
  -ExpectedStatusCode 403 `
  -Body @{ enabled = $false }

Step "Channel update allowed with notification:manage"
$channelUpdate = Invoke-Json `
  -Method "PATCH" `
  -Path "/api/v1/notifications/channels/$channelId" `
  -Headers @{ "x-rbac-permissions" = "notification:manage" } `
  -Body @{ enabled = $false }

AssertOk $channelUpdate "Notification channel update"
$channelUpdate | ConvertTo-Json -Depth 10

Step "Rule create denied without RBAC principal"
Invoke-JsonExpectHttpError `
  -Method "POST" `
  -Path "/api/v1/notifications/rules" `
  -ExpectedStatusCode 403 `
  -Body @{
    name = "Denied Smoke Rule $RunId"
    enabled = $true
    eventTypes = @("SYSTEM_EVENT")
    severities = @("info")
    channelIds = @($channelId)
  }

Step "Rule create allowed with notification:manage"
$rule = Invoke-Json `
  -Method "POST" `
  -Path "/api/v1/notifications/rules" `
  -Headers @{ "x-rbac-permissions" = "notification:manage" } `
  -Body @{
    name = $RuleName
    enabled = $true
    eventTypes = @("SYSTEM_EVENT")
    severities = @("info")
    channelIds = @($channelId)
  }

AssertOk $rule "Notification rule create"
AssertHasValue $rule.data.id "Created rule ID"
$ruleId = $rule.data.id
$rule | ConvertTo-Json -Depth 10

Step "Rule update denied without RBAC principal"
Invoke-JsonExpectHttpError `
  -Method "PATCH" `
  -Path "/api/v1/notifications/rules/$ruleId" `
  -ExpectedStatusCode 403 `
  -Body @{ enabled = $false }

Step "Rule update allowed with notification:manage"
$ruleUpdate = Invoke-Json `
  -Method "PATCH" `
  -Path "/api/v1/notifications/rules/$ruleId" `
  -Headers @{ "x-rbac-permissions" = "notification:manage" } `
  -Body @{ enabled = $true }

AssertOk $ruleUpdate "Notification rule update"
$ruleUpdate | ConvertTo-Json -Depth 10

Step "Retry failed denied without RBAC principal"
Invoke-JsonExpectHttpError `
  -Method "POST" `
  -Path "/api/v1/notifications/retry-failed" `
  -ExpectedStatusCode 403 `
  -Body @{ limit = 10 }

Step "Retry failed allowed with notification:retry"
$retryFailed = Invoke-Json `
  -Method "POST" `
  -Path "/api/v1/notifications/retry-failed" `
  -Headers @{ "x-rbac-permissions" = "notification:retry" } `
  -Body @{ limit = 10 }

AssertOk $retryFailed "Notification retry failed"
$retryFailed | ConvertTo-Json -Depth 10

Step "Retry failed allowed with notification:manage fallback"
$retryFailedManage = Invoke-Json `
  -Method "POST" `
  -Path "/api/v1/notifications/retry-failed" `
  -Headers @{ "x-rbac-permissions" = "notification:manage" } `
  -Body @{ limit = 10 }

AssertOk $retryFailedManage "Notification retry failed with manage"
$retryFailedManage | ConvertTo-Json -Depth 10

Step "Process pending denied without RBAC principal"
Invoke-JsonExpectHttpError `
  -Method "POST" `
  -Path "/api/v1/notifications/process-pending" `
  -ExpectedStatusCode 403 `
  -Body @{ limit = 10 }

Step "Process pending allowed with notification:send"
$processPending = Invoke-Json `
  -Method "POST" `
  -Path "/api/v1/notifications/process-pending" `
  -Headers @{ "x-rbac-permissions" = "notification:send" } `
  -Body @{ limit = 10 }

AssertOk $processPending "Notification process pending"
$processPending | ConvertTo-Json -Depth 10

Step "Process pending allowed with notification:manage fallback"
$processPendingManage = Invoke-Json `
  -Method "POST" `
  -Path "/api/v1/notifications/process-pending" `
  -Headers @{ "x-rbac-permissions" = "notification:manage" } `
  -Body @{ limit = 10 }

AssertOk $processPendingManage "Notification process pending with manage"
$processPendingManage | ConvertTo-Json -Depth 10

Step "Notification test denied without RBAC principal"
Invoke-JsonExpectHttpError `
  -Method "POST" `
  -Path "/api/v1/notifications/test" `
  -ExpectedStatusCode 403 `
  -Body @{
    eventType = "SYSTEM_EVENT"
    severity = "info"
    title = "Denied Notification Test"
    message = "This should be denied"
  }

Step "Notification test allowed with notification:test"
$testNotification = Invoke-Json `
  -Method "POST" `
  -Path "/api/v1/notifications/test" `
  -Headers @{ "x-rbac-permissions" = "notification:test" } `
  -Body @{
    eventType = "SYSTEM_EVENT"
    severity = "info"
    title = "Protected Notification Test"
    message = "Protected notification test from smoke script"
  }

AssertOk $testNotification "Notification test"
$testNotification | ConvertTo-Json -Depth 10

Step "Notification test allowed with notification:manage fallback"
$testNotificationManage = Invoke-Json `
  -Method "POST" `
  -Path "/api/v1/notifications/test" `
  -Headers @{ "x-rbac-permissions" = "notification:manage" } `
  -Body @{
    eventType = "SYSTEM_EVENT"
    severity = "info"
    title = "Protected Notification Test With Manage"
    message = "Protected notification test from smoke script using manage fallback"
  }

AssertOk $testNotificationManage "Notification test with manage"
$testNotificationManage | ConvertTo-Json -Depth 10

Step "Cleanup rule and channel with notification:manage"
$deleteRule = Invoke-Json `
  -Method "DELETE" `
  -Path "/api/v1/notifications/rules/$ruleId" `
  -Headers @{ "x-rbac-permissions" = "notification:manage" }

AssertOk $deleteRule "Notification rule cleanup"

$deleteChannel = Invoke-Json `
  -Method "DELETE" `
  -Path "/api/v1/notifications/channels/$channelId" `
  -Headers @{ "x-rbac-permissions" = "notification:manage" }

AssertOk $deleteChannel "Notification channel cleanup"

Write-Host ""
Write-Host "Notification guard smoke test completed." -ForegroundColor Green
