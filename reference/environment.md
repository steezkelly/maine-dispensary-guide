# User Environment — Maine Dispensary Guide

## Operating System
- **Platform:** Windows 10/11 (win32)
- **Shell:** PowerShell 5.1 (Desktop Edition)
- **Build:** 10.0.26100.7920

## Key Distinctions from Unix/Linux

| Unix/Linux | Windows PowerShell |
|------------|-------------------|
| `&&` for chaining | Use `;` to chain commands |
| `which` command | `Get-Command` or `where.exe` |
| `cat file` | `Get-Content file` |
| `ls -la` | `Get-ChildItem -Force` |
| `pwd` | `Get-Location` or `gl` |
| `cd dir` | `Set-Location dir` or `cd dir` |
| `touch file` | `New-Item -ItemType File file` |
| `mkdir -p dir/sub` | `New-Item -ItemType Directory -Path dir/sub` |
| `echo "text" > file` | `"text" \| Out-File -FilePath file` |
| `grep pattern` | `Select-String -Pattern pattern` |
| `find . -name "*.js"` | `Get-ChildItem -Recurse -Filter "*.js"` |
| `curl url` | `Invoke-WebRequest -Uri url` |
| `wget url` | `Invoke-WebRequest -Uri url` |
| `export VAR=value` | `$env:VAR = "value"` |
| `source script.sh` | `& ./script.ps1` or `. ./script.ps1` |
| `chmod +x script` | Not needed (Windows) |
| `rm -rf dir` | `Remove-Item -Recurse -Force dir` |
| `cp -r src dest` | `Copy-Item -Recurse src dest` |
| `mv src dest` | `Move-Item src dest` |
| `head -n 10 file` | `Get-Content file -TotalCount 10` |
| `tail -n 10 file` | `Get-Content file -Tail 10` |
| `wc -l file` | `(Get-Content file).Length` |

## Installed Tools

| Tool | Version | Path |
|------|---------|------|
| Node.js | v24.14.0 | `C:\Program Files\nodejs\` |
| npm | 11.9.0 | `C:\Program Files\nodejs\` |
| Git | 2.51.0.windows.1 | `C:\Program Files\Git\` |
| Python | 3.12.x | `C:\Users\Steve\AppData\Local\Programs\Python\Python312\` |

## Path Notes
- Use forward slashes `/` in most contexts (Node, Git, URL)
- Backslashes `\` needed for native PowerShell paths
- Environment variables: `$env:VAR_NAME`

## Common Patterns

### Chaining Commands (PowerShell 5.1)
```powershell
cd dir; npm install; npm run build
```

### Git Commands
```powershell
git status
git add .
git commit -m "message"
git push
git pull --rebase
```

### Node/npm
```powershell
node script.cjs
npm install
npm run build
npx package-name
```

### Checking Installation
```powershell
node --version
npm --version
git --version
python --version
```

### Environment Variables
```powershell
$env:VAR_NAME = "value"
Get-ChildItem Env:
```

## Known Environment Issues

1. **Git bash vs PowerShell:** Some Git commands emit bash-style output
2. **Node ESM:** Use `.cjs` extension for CommonJS scripts in Node
3. **Python encoding:** Always use `encoding='utf-8'` when writing files
4. **Long paths:** Windows has 260 char path limit by default

## References

| Topic | Documentation |
|-------|--------------|
| PowerShell Docs | https://docs.microsoft.com/en-us/powershell/ |
| PowerShell 5.1 differences | https://docs.microsoft.com/en-us/powershell/scripting/windows/powershell-5.1/overview |
| Windows Git | https://git-scm.com/book/en/v2/Getting-Started-Installing-Git#installing-on-windows |

---

*Last Updated: 2026-04-04*
