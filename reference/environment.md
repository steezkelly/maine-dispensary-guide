# User Environment — Maine Dispensary Guide

## Operating System
- **Platform:** Windows 10/11 (win32)
- **Shell:** PowerShell 5.1 (Desktop Edition)
- **Build:** 10.0.26100.7920

## Installed Tools

| Tool | Version | Path |
|------|---------|------|
| Node.js | v24.14.0 | `C:\Program Files\nodejs\` |
| npm | 11.9.0 | `C:\Program Files\nodejs\` |
| Git | 2.51.0.windows.1 | `C:\Program Files\Git\` |
| Python | 3.12.x | `C:\Users\Steve\AppData\Local\Programs\Python\Python312\` |

---

## PowerShell Workarounds (Comprehensive)

### 1. Command Chaining
**Issue:** `&&` doesn't work in PowerShell
```powershell
# WRONG (will error):
cd dir && npm install && npm run build

# CORRECT:
cd dir; npm install; npm run build
```

### 2. Heredocs / Multi-line Scripts
**Issue:** Unix `<<EOF` heredoc syntax not supported
```powershell
# WRONG:
./script.sh <<'EOF'
content
EOF

# CORRECT: Write script to file first, then execute
@'
const content = "text";
module.exports = content;
'@ | Out-File -FilePath script.ps1 -Encoding UTF8
& ./script.ps1
```

### 3. Node.js ESM Modules
**Issue:** Node ESM (`import/export`) requires `.mjs` or `"type": "module"` in package.json
```powershell
# WRONG: Using import in .js file without package.json setting

# CORRECT: Use CommonJS (.cjs extension)
@'
const fs = require('fs');
module.exports = { read: () => fs.readFileSync('file.txt', 'utf8') };
'@ | Out-File -FilePath script.cjs -Encoding UTF8
node script.cjs
```

### 4. Python File Encoding
**Issue:** Default encoding may not be UTF-8
```powershell
# WRONG:
with open('file.txt', 'w') as f:
    f.write("text")

# CORRECT:
with open('file.txt', 'w', encoding='utf-8') as f:
    f.write("text")
```

### 5. Git Paths in Scripts
**Issue:** Git bash-style paths may appear in output
```powershell
# When running git commands, output may contain bash-style paths
# Use full Windows paths when parsing

# For absolute paths in scripts:
$fullPath = (Get-Item ".\path\to\file").FullName
```

### 6. Long File Paths
**Issue:** Windows 260 character path limit
```powershell
# Enable long paths (run once as admin):
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force

# Or use npm with prefix to avoid deep nesting:
npm config set prefix 'C:\Users\Steve\AppData\Local\Programs\node'
```

### 7. Redirecting Output
**Issue:** `>` and `2>` behave differently
```powershell
# WRONG (may not work as expected):
command > output.txt 2>&1

# CORRECT:
$output = command 2>&1 | Out-String
$output | Out-File -FilePath output.txt -Encoding UTF8
```

### 8. Process Substitution
**Issue:** `(cmd)` process substitution not supported
```powershell
# WRONG:
grep pattern $(find . -name "*.js")

# CORRECT:
Get-ChildItem . -Recurse -Filter "*.js" | Select-String -Pattern pattern
```

### 9. Executing Scripts
**Issue:** Execution policy may block scripts
```powershell
# To run a .ps1 script:
powershell -ExecutionPolicy Bypass -File "script.ps1"

# Or within PowerShell:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
& ".\script.ps1"
```

### 10. Environment Variables
**Issue:** `export VAR=value` doesn't work
```powershell
# WRONG:
export PATH="/new/path:$PATH"

# CORRECT (session-scoped):
$env:PATH = "/new/path:$($env:PATH)"
$env:VAR_NAME = "value"

# For permanent, use System Properties UI or:
[Environment]::SetEnvironmentVariable("VAR_NAME", "value", "User")
```

---

## Unix → PowerShell Quick Reference

| Task | Unix | PowerShell |
|------|------|------------|
| List files | `ls -la` | `Get-ChildItem -Force` |
| Find files | `find . -name "*.js"` | `Get-ChildItem -Recurse -Filter "*.js"` |
| Search in file | `grep -r "pattern" .` | `Get-ChildItem -Recurse | Select-String -Pattern "pattern"` |
| Read file | `cat file.txt` | `Get-Content file.txt` |
| Write file | `echo "text" > file.txt` | `"text" | Out-File -FilePath file.txt -Encoding UTF8` |
| Check process | `ps aux \| grep node` | `Get-Process node` |
| Kill process | `kill -9 PID` | `Stop-Process -Id PID -Force` |
| Check port | `lsof -i :3000` | `Get-NetTCPConnection -LocalPort 3000` |
| Curl | `curl -s url` | `Invoke-WebRequest -Uri url -UseBasicParsing` |
| Wget | `wget url -O file` | `Invoke-WebRequest -Uri url -OutFile file` |
| Check disk | `df -h` | `Get-PSDrive C` |
| Check memory | `free -h` | `Get-Process \| Measure-Object WorkingSet -Sum` |
| Date | `date` | `Get-Date` |
| Sleep | `sleep 5` | `Start-Sleep -Seconds 5` |
| Ifconfig/IP | `ifconfig` / `ip addr` | `Get-NetIPAddress` |
| User info | `whoami` | `$env:USERNAME` |

---

## Common Command Patterns

### Build & Deploy
```powershell
# Build project
npm run build

# Deploy to Vercel
npx vercel deploy --prod

# Check Vercel deployments
npx vercel ls

# Check latest deployment logs
npx vercel logs deployment-name
```

### Git Workflow
```powershell
# Check status
git status

# Add and commit
git add .
git commit -m "message"

# Push
git push

# Pull with rebase
git pull --rebase

# Check recent commits
git log --oneline -5
```

### Node Scripts
```powershell
# Run Node script (use .cjs for CommonJS)
node scripts/script-name.cjs

# Run with arguments
node scripts/script.cjs --arg value

# Set env var for session
$env:BRAVE_SEARCH_API_KEY = "your-key"
node scripts/brave-search.cjs "query"
```

### File Operations
```powershell
# Create directory
New-Item -ItemType Directory -Path path/to/dir

# Create file
New-Item -ItemType File -Path path/to/file.txt

# Copy directory
Copy-Item -Recurse -Path src -Destination dest

# Remove directory
Remove-Item -Recurse -Force path/to/dir
```

### String Operations
```powershell
# Find and replace (PowerShell 7+)
(Get-Content file.txt) -replace 'old','new' | Set-Content file.txt

# For PowerShell 5.1, use .NET:
(Get-Content file.txt -Raw).Replace('old','new') | Set-Content file.txt -Encoding UTF8

# Search in files
Select-String -Path ".\**\*.astro" -Pattern "pattern"
```

---

## Known Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| `&&` not recognized | PowerShell syntax | Use `;` to chain |
| Heredoc fails | Not supported | Write to file first |
| `node -e` fails | Escaping issues | Use .cjs file |
| Git output has `\n` | Bash line endings | Use `-Raw` or trim |
| Path not found | Deep nesting | Enable long paths |
| Script blocked | Execution policy | ` -ExecutionPolicy Bypass` |

---

## References

| Topic | Documentation |
|-------|--------------|
| PowerShell Docs | https://docs.microsoft.com/en-us/powershell/ |
| PowerShell 5.1 differences | https://docs.microsoft.com/en-us/powershell/scripting/windows/powershell-5.1/overview |
| Windows Git | https://git-scm.com/book/en/v2/Getting-Started-Installing-Git |
| Node.js on Windows | https://github.com/nodejs/node/blob/main/BUILDING.md#windows |
| Enable Long Paths | https://docs.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation |

---

*Last Updated: 2026-04-04*
