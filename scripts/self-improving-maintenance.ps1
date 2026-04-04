# Self-Improving Maintenance Script
# Run manually or schedule with: scripts/setup-maintenance-schedule.ps1

$ErrorActionPreference = "Continue"
$memoryPath = "C:\Users\Steve\.agents\skills\self-improving"
$projectPath = "C:\Users\Steve\OpenCode Projects\project-1"

Write-Host "🔄 Self-Improving Maintenance" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

function Get-FileAge($path) {
    if (Test-Path $path) {
        return (Get-Date) - (Get-Item $path).LastWriteTime
    }
    return $null
}

# 1. Check heartbeat-state.md
$heartbeatPath = Join-Path $memoryPath "heartbeat-state.md"
$heartbeatAge = Get-FileAge $heartbeatPath
if ($heartbeatAge) {
    Write-Host "heartbeat-state.md: Last modified $($heartbeatAge.Days) days ago"
    if ($heartbeatAge.Days -gt 7) {
        Write-Host "  ⚠️  Heartbeat is stale (>7 days). Run a session to update." -ForegroundColor Yellow
    }
}

# 2. Check corrections.md line count
$correctionsPath = Join-Path $memoryPath "corrections.md"
if (Test-Path $correctionsPath) {
    $correctionLines = (Get-Content $correctionsPath).Count
    Write-Host "corrections.md: $correctionLines lines"
    if ($correctionLines -gt 100) {
        Write-Host "  💡 Consider compacting (>$($correctionLines) lines)" -ForegroundColor Green
    }
}

# 3. Check memory.md line count  
$memoryPathFile = Join-Path $memoryPath "memory.md"
if (Test-Path $memoryPathFile) {
    $memoryLines = (Get-Content $memoryPathFile).Count
    Write-Host "memory.md: $memoryLines lines"
    if ($memoryLines -gt 100) {
        Write-Host "  💡 Kernel should stay ≤100 lines. Consider archiving old entries." -ForegroundColor Green
    }
}

# 4. Check reflections.md
$reflectionsPath = Join-Path $memoryPath "reflections.md"
if (Test-Path $reflectionsPath) {
    $reflectionsLines = (Get-Content $reflectionsPath).Count
    Write-Host "reflections.md: $reflectionsLines lines"
}

# 5. Check project hub for stale entries
$hubPath = Join-Path $projectPath "BOT_COLLABORATION_HUB.md"
if (Test-Path $hubPath) {
    $hubAge = Get-FileAge $hubPath
    if ($hubAge) {
        Write-Host "BOT_COLLABORATION_HUB.md: Last modified $($hubAge.Days) days ago"
        if ($hubAge.Days -gt 3) {
            Write-Host "  ⚠️  Hub may need sprint closure entry." -ForegroundColor Yellow
        }
    }
}

# 6. Summary
Write-Host ""
Write-Host "=============================" -ForegroundColor Cyan
Write-Host "Maintenance Check Complete" -ForegroundColor Cyan
Write-Host ""
Write-Host "To run full self-improving cycle:"
Write-Host "  1. Start OpenCode session"
Write-Host "  2. Ask: 'What have you learned?' to review corrections"
Write-Host "  3. Ask: 'Show my patterns' to review memory"
Write-Host ""
Write-Host "To schedule automatic maintenance:"
Write-Host "  Run: powershell -ExecutionPolicy Bypass -File scripts/setup-maintenance-schedule.ps1"
