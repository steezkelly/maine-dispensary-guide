# OpenCode Process Diagnostic Script
# Run this whenever OpenCode seems stuck or memory is high

param(
    [switch]$AutoKill,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

function Get-OpenCodeStatus {
    $opencodeProcesses = @()
    
    # Find all OpenCode-related processes
    $allProcesses = Get-Process | Where-Object { 
        $_.Name -match "opencode|node|msedge" 
    }
    
    $opencodeProcesses = $allProcesses | Where-Object { 
        $_.Path -match "OpenCode|AppData|opencode" -or 
        $_.Name -match "^opencode" 
    }
    
    # If none found by path, fall back to name matching for node
    if ($opencodeProcesses.Count -eq 0) {
        $opencodeProcesses = $allProcesses | Where-Object { 
            $_.Name -match "opencode" 
        }
    }
    
    return $opencodeProcesses
}

function Show-ProcessTree {
    param($Processes)
    
    Write-Host "`n=== OpenCode Process Status ===" -ForegroundColor Cyan
    Write-Host "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Gray
    
    if ($Processes.Count -eq 0) {
        Write-Host "No OpenCode processes found." -ForegroundColor Green
        return
    }
    
    $totalMem = 0
    $suspicious = @()
    
    $Processes | ForEach-Object {
        $memMB = [math]::Round($_.WorkingSet64 / 1MB, 0)
        $totalMem += $_.WorkingSet64
        
        $status = "OK"
        $color = "Green"
        
        if ($memMB -gt 500) {
            $status = "HIGH MEMORY"
            $color = "Yellow"
        }
        if ($memMB -gt 1000) {
            $status = "CRITICAL"
            $color = "Red"
            $suspicious += $_
        }
        
        $threads = $_.Threads.Count
        $start = if ($_.StartTime) { $_.StartTime.ToString('HH:mm:ss') } else { 'N/A' }
        
        Write-Host "[$status] " -NoNewline -ForegroundColor $color
        Write-Host "$($_.Name) (PID: $($_.Id)) - Memory: $memMB MB - Threads: $threads - Started: $start" -ForegroundColor White
    }
    
    Write-Host "`n--- Summary ---" -ForegroundColor Cyan
    Write-Host "Total OpenCode Memory: $([math]::Round($totalMem/1MB, 0)) MB" -ForegroundColor $(if ($totalMem/1MB -gt 2000) { "Red" } elseif ($totalMem/1MB -gt 1000) { "Yellow" } else { "Green" })
    Write-Host "Process Count: $($Processes.Count)" -ForegroundColor White
    
    # Check for orphaned node processes (children of opencode-cli)
    $opencodeCli = Get-Process -Name "opencode-cli" -ErrorAction SilentlyContinue
    if ($opencodeCli) {
        $children = Get-Process | Where-Object { 
            $_.ParentId -eq $opencodeCli.Id 
        }
        if ($children) {
            Write-Host "`n--- Child Processes of opencode-cli ---" -ForegroundColor Cyan
            $children | ForEach-Object {
                $memMB = [math]::Round($_.WorkingSet64 / 1MB, 0)
                Write-Host "  Child: $($_.Name) (PID: $($_.Id)) - $memMB MB" -ForegroundColor Yellow
            }
        }
    }
    
    # Check for msedge processes started around same time as opencode
    $edgeTime = Get-Date "8:33:00 PM"
    $recentEdges = Get-Process -Name "msedge" -ErrorAction SilentlyContinue | Where-Object { 
        $_.StartTime -and ($_.StartTime -gt $edgeTime.AddMinutes(-5)) 
    }
    if ($recentEdges) {
        Write-Host "`n--- Recent msedge (Playwright MCP?) ---" -ForegroundColor Cyan
        $recentEdges | ForEach-Object {
            $memMB = [math]::Round($_.WorkingSet64 / 1MB, 0)
            Write-Host "  msedge (PID: $($_.Id)) - $memMB MB - Started: $($_.StartTime.ToString('HH:mm:ss'))" -ForegroundColor Yellow
        }
    }
    
    return $suspicious
}

function Remove-OrphanedProcesses {
    param($Confirm = $true)
    
    Write-Host "`n=== Cleanup Mode ===" -ForegroundColor Cyan
    
    # Kill orphaned node processes
    $orphanedNodes = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { 
        $_.StartTime -and (Get-Date $_.StartTime) -gt (Get-Date).AddHours(-3)
    }
    
    if ($orphanedNodes) {
        Write-Host "`nFound orphaned node processes:" -ForegroundColor Yellow
        $orphanedNodes | ForEach-Object {
            $memMB = [math]::Round($_.WorkingSet64 / 1MB, 0)
            Write-Host "  node (PID: $($_.Id)) - $memMB MB" -ForegroundColor White
        }
        
        if ($Confirm) {
            $response = Read-Host "Kill these? (y/N)"
            if ($response -eq 'y') {
                $orphanedNodes | Stop-Process -Force
                Write-Host "Orphaned nodes killed." -ForegroundColor Green
            }
        } else {
            $orphanedNodes | Stop-Process -Force
            Write-Host "Orphaned nodes killed." -ForegroundColor Green
        }
    }
    
    # Kill hung opencode-cli if memory is excessive
    $opencodeCli = Get-Process -Name "opencode-cli" -ErrorAction SilentlyContinue
    if ($opencodeCli) {
        $memMB = [math]::Round($opencodeCli.WorkingSet64 / 1MB, 0)
        if ($memMB -gt 1500) {
            Write-Host "`nopencode-cli is using $memMB MB - this is excessive." -ForegroundColor Red
            if ($Confirm) {
                $response = Read-Host "Kill hung opencode-cli? This will end the current session. (y/N)"
                if ($response -eq 'y') {
                    Stop-Process -Id $opencodeCli.Id -Force
                    Write-Host "opencode-cli killed. Restart OpenCode to begin fresh." -ForegroundColor Green
                }
            } elseif ($AutoKill) {
                Stop-Process -Id $opencodeCli.Id -Force
                Write-Host "opencode-cli killed." -ForegroundColor Green
            }
        }
    }
}

# Main execution
Write-Host "OpenCode Process Diagnostic" -ForegroundColor Magenta
Write-Host "============================" -ForegroundColor Magenta

$processes = Get-OpenCodeStatus
$suspicious = Show-ProcessTree -Processes $processes

# Offer cleanup if suspicious processes found
if ($Verbose -or $suspicious.Count -gt 0 -or $AutoKill) {
    Write-Host "`n--- Cleanup Options ---" -ForegroundColor Cyan
    Write-Host "Run with -AutoKill to automatically cleanup without prompting" -ForegroundColor Gray
    
    if ($AutoKill) {
        Remove-OrphanedProcesses -Confirm $false
    } else {
        $response = Read-Host "`nRun cleanup (kill orphaned processes)? (y/N)"
        if ($response -eq 'y') {
            Remove-OrphanedProcesses -Confirm $true
        }
    }
}

Write-Host "`nDiagnostic complete.`n" -ForegroundColor Gray
