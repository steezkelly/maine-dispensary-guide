# OpenCode Nuclear Cleanup Script
# Kills orphaned WebView2/msedge processes from crashed electron apps
# These are NOT Playwright browsers - Playwright uses Chrome
# Freeing ~10 GB of memory from 129 orphaned processes (4/8 crash)
# OpenCode will need to be restarted after this

param(
    [switch]$DryRun
)

Write-Host "=== OpenCode Nuclear Cleanup ===" -ForegroundColor Red
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] Would kill the following processes:" -ForegroundColor Yellow
}

# Get all msedge and msedgewebview2 processes
$msedgeProcesses = Get-Process -Name "msedge","msedgewebview2" -ErrorAction SilentlyContinue

# Get opencode-cli and node processes from BEFORE today
$currentDate = Get-Date.Date
$orphanedOpencode = Get-Process -Name "opencode-cli","node" -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -and $_.StartTime -lt $currentDate }

Write-Host "Found $($msedgeProcesses.Count) msedge/msedgewebview2 processes" -ForegroundColor Cyan
Write-Host "Found $($orphanedOpencode.Count) orphaned opencode-cli/node processes" -ForegroundColor Cyan
Write-Host ""

$totalMem = 0
$msedgeProcesses | ForEach-Object { $totalMem += $_.WorkingSet64 }
Write-Host "Total memory to free: $([math]::Round($totalMem/1GB, 2)) GB" -ForegroundColor Red

if (-not $DryRun) {
    Write-Host ""
    Write-Host "Killing ALL msedge processes in 5 seconds... (Ctrl+C to cancel)" -ForegroundColor Red
    Start-Sleep -Seconds 5
    
    # Kill all msedge
    $msedgeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    
    # Kill orphaned opencode-cli/node from previous days
    $orphanedOpencode | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Host ""
    Write-Host "Cleanup complete!" -ForegroundColor Green
    Write-Host "Please restart OpenCode." -ForegroundColor Yellow
} else {
    $msedgeProcesses | Select-Object Name, Id, @{N='MemMB';E={[math]::Round($_.WorkingSet64/1MB,0)}}, StartTime | Format-Table
}
