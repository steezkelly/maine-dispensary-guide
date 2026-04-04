# Setup Scheduled Task for Self-Improving Maintenance
# Run this once to set up automatic weekly maintenance

$taskName = "OpenCode_SelfImproving_Maintenance"
$scriptPath = "C:\Users\Steve\OpenCode Projects\project-1\scripts\self-improving-maintenance.ps1"
$description = "OpenCode Self-Improving weekly maintenance check"

Write-Host "Setting up scheduled maintenance task..." -ForegroundColor Cyan
Write-Host ""

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Task '$taskName' already exists." -ForegroundColor Yellow
    $response = Read-Host "Remove and recreate? (y/N)"
    if ($response -ne "y") {
        Write-Host "Keeping existing task."
        exit 0
    }
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Existing task removed." -ForegroundColor Green
}

# Create action - run PowerShell with the maintenance script
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument ("-ExecutionPolicy Bypass -WindowStyle Hidden -File `"{0}`"" -f $scriptPath)

# Create trigger - weekly on Sunday at 2 AM
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 2am

# Create principal - run as current user
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U -RunLevel Limited

# Create settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Register the task
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description $description

Write-Host "Task created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Schedule: Weekly on Sunday at 2:00 AM"
Write-Host "Action: Runs self-improving-maintenance.ps1"
Write-Host ""
Write-Host "To check status:"
Write-Host "  Get-ScheduledTask -TaskName '$taskName' | Get-ScheduledTaskInfo"
Write-Host ""
Write-Host "To remove:"
$removeCmd = "Unregister-ScheduledTask -TaskName '$taskName' -Confirm:`$false"
Write-Host "  $removeCmd"
