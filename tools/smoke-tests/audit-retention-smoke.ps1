param(
  [string]$BaseUrl = "http://localhost:3000",
  [int]$RetentionDays = 365
)

$ErrorActionPreference = "Stop"

function Step([string]$Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function ApiJson([string]$Method, [string]$Path, [object]$Body = $null) {
  $uri = "$BaseUrl$Path"
  if ($null -eq $Body -and $Method.ToUpperInvariant() -eq "GET") {
    return Invoke-RestMethod -Method $Method -Uri $uri
  }
  if ($null -eq $Body) { $Body = @{} }
  return Invoke-RestMethod -Method $Method -Uri $uri -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 30)
}

function AssertOk([object]$Response, [string]$Name) {
  if ($null -eq $Response) { throw "$Name returned null response" }
  if (($Response.PSObject.Properties.Name -contains "success") -and $Response.success -ne $true) {
    throw "$Name returned success=false"
  }
}

function AssertNotFound([string]$Path, [string]$Name) {
  try {
    Invoke-RestMethod -Method GET -Uri "$BaseUrl$Path" | Out-Null
    throw "$Name should be deleted but is still accessible"
  } catch {
    if ($_.Exception.Message -notmatch "404") { throw }
  }
}

Write-Host "Audit Retention Smoke Test" -ForegroundColor Green
Write-Host "BaseUrl: $BaseUrl"
Write-Host "RetentionDays: $RetentionDays"

$oldDate = (Get-Date).AddDays(-($RetentionDays + 30)).ToUniversalTime().ToString("o")
$recentDate = (Get-Date).ToUniversalTime().ToString("o")

Step "Create old audit event"
$old = ApiJson "POST" "/api/v1/audit" @{
  action = "manual.audit.retention_old"
  summary = "Old audit event for retention smoke test"
  severity = "info"
  status = "success"
  createdAt = $oldDate
  actor = @{ type = "api"; id = "retention-smoke"; name = "Retention Smoke Test" }
  entity = @{ type = "system"; id = "audit"; name = "Audit Log Engine" }
  metadata = @{ retentionSmoke = $true; old = $true }
}
AssertOk $old "Create old event"
$oldId = $old.data.id
$old | ConvertTo-Json -Depth 30

Step "Create recent audit event"
$recent = ApiJson "POST" "/api/v1/audit" @{
  action = "manual.audit.retention_recent"
  summary = "Recent audit event for retention smoke test"
  severity = "info"
  status = "success"
  createdAt = $recentDate
  actor = @{ type = "api"; id = "retention-smoke"; name = "Retention Smoke Test" }
  entity = @{ type = "system"; id = "audit"; name = "Audit Log Engine" }
  metadata = @{ retentionSmoke = $true; recent = $true }
}
AssertOk $recent "Create recent event"
$recentId = $recent.data.id
$recent | ConvertTo-Json -Depth 30

Step "Retention dry-run"
$dryRun = ApiJson "POST" "/api/v1/audit/retention/prune" @{ days = $RetentionDays; dryRun = $true }
AssertOk $dryRun "Retention dry-run"
$dryRun | ConvertTo-Json -Depth 30
if ($dryRun.data.dryRun -ne $true) { throw "Dry-run response did not set dryRun=true" }
if ($dryRun.data.matched -lt 1) { throw "Dry-run should match at least one old audit event" }

Step "Verify old event still exists after dry-run"
$getOld = ApiJson "GET" "/api/v1/audit/$oldId"
AssertOk $getOld "Get old event after dry-run"

Step "Retention prune"
$prune = ApiJson "POST" "/api/v1/audit/retention/prune" @{ days = $RetentionDays; dryRun = $false }
AssertOk $prune "Retention prune"
$prune | ConvertTo-Json -Depth 30
if ($prune.data.dryRun -ne $false) { throw "Prune response did not set dryRun=false" }
if ($prune.data.deleted -lt 1) { throw "Prune should delete at least one old audit event" }

Step "Verify old event is deleted"
AssertNotFound "/api/v1/audit/$oldId" "Old audit event"

Step "Verify recent event still exists"
$getRecent = ApiJson "GET" "/api/v1/audit/$recentId"
AssertOk $getRecent "Get recent event after prune"
$getRecent | ConvertTo-Json -Depth 30

Step "Verify retention audit event is recorded"
$retentionAudit = ApiJson "GET" "/api/v1/audit?action=audit.retention.pruned&limit=20"
AssertOk $retentionAudit "List retention audit event"
$retentionAudit | ConvertTo-Json -Depth 30

Step "Final audit summary"
$summary = ApiJson "GET" "/api/v1/audit/summary"
AssertOk $summary "Audit summary"
$summary | ConvertTo-Json -Depth 30

Write-Host ""
Write-Host "Audit retention smoke test completed." -ForegroundColor Green
