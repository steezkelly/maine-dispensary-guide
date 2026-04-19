# ============================================================================
# PurelyMail DNS Configuration Script for mainedispensaryguide.com
# Uses Porkbun API to create all required DNS records
# ============================================================================

param(
    [string]$Domain = "mainedispensaryguide.com",
    [string]$ApiKey = "pk1_6cb8d0233603952762eeb6b6938f435a7a74f1bde5e09650209270bad45af5b7",
    [string]$SecretKey = "sk1_e7280c7485f364adad7212b4551e76df03cb2c826d35fef0e2475665e25a83b7",
    [string]$OwnershipProof = "your_ownership_proof_here"
)

# API Configuration
$ApiEndpoint = "https://porkbun.com/api/json/v3/dns/create"
$FullApiUrl = "$ApiEndpoint/$Domain"

# Color output helpers
function Write-Success($message) {
    Write-Host "✅ $message" -ForegroundColor Green
}

function Write-Failure($message) {
    Write-Host "❌ $message" -ForegroundColor Red
}

function Write-Info($message) {
    Write-Host "🔔 $message" -ForegroundColor Cyan
}

function Write-Header($message) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host "  $message" -ForegroundColor Magenta
    Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
}

# ============================================================================
# Create DNS Record via Porkbun API
# ============================================================================
function New-PorkbunDnsRecord {
    param(
        [string]$RecordType,
        [string]$Host,
        [string]$Value,
        [string]$Priority,      # For MX records
        [int]$TTL = 300
    )

    $body = @{
        apikey = $ApiKey
        secretapikey = $SecretKey
    }

    # Add record type
    $body.Add("type", $RecordType)

    # Add host (use blank for @)
    $body.Add("host", $Host)

    # Add value
    $body.Add("content", $Value)

    # Add TTL
    $body.Add("ttl", $TTL)

    # Add priority if MX
    if ($RecordType -eq "MX") {
        $body.Add("prio", $Priority)
    }

    try {
        $response = Invoke-RestMethod -Uri $FullApiUrl -Method Post -ContentType "application/json" -Body ($body | ConvertTo-Json)
        
        if ($response.status -eq "SUCCESS") {
            return @{
                Success = $true
                Message = "$RecordType record for '$Host' created successfully"
            }
        } else {
            return @{
                Success = $false
                Message = "$RecordType record for '$Host' failed: $($response.message)"
            }
        }
    } catch {
        return @{
            Success = $false
            Message = "$RecordType record for '$Host' failed: $($_.Exception.Message)"
        }
    }
}

# ============================================================================
# Main Execution
# ============================================================================

Write-Header "PurelyMail DNS Configuration"
Write-Info "Domain: $Domain"
Write-Info "Using Porkbun API"
Write-Host ""

# Track results
$results = @()
$allSuccessful = $true

# --------------------------------------------------------------------------
# 1. MX Record
# --------------------------------------------------------------------------
Write-Host "[1/6] Creating MX Record..." -ForegroundColor Yellow
$result = New-PorkbunDnsRecord -RecordType "MX" -Host "" -Value "mailserver.purelymail.com." -Priority 50
$results += $result
if ($result.Success) { Write-Success $result.Message } else { Write-Failure $result.Message; $allSuccessful = $false }

# --------------------------------------------------------------------------
# 2. SPF Record
# --------------------------------------------------------------------------
Write-Host "[2/6] Creating SPF Record..." -ForegroundColor Yellow
$result = New-PorkbunDnsRecord -RecordType "TXT" -Host "" -Value "v=spf1 include:_spf.purelymail.com ~all"
$results += $result
if ($result.Success) { Write-Success $result.Message } else { Write-Failure $result.Message; $allSuccessful = $false }

# --------------------------------------------------------------------------
# 3. DKIM Record 1
# --------------------------------------------------------------------------
Write-Host "[3/6] Creating DKIM Record 1 (purelymail1._domainkey)..." -ForegroundColor Yellow
$result = New-PorkbunDnsRecord -RecordType "CNAME" -Host "purelymail1._domainkey" -Value "key1._dkimroot.purelymail.com."
$results += $result
if ($result.Success) { Write-Success $result.Message } else { Write-Failure $result.Message; $allSuccessful = $false }

# --------------------------------------------------------------------------
# 4. DKIM Record 2
# --------------------------------------------------------------------------
Write-Host "[4/6] Creating DKIM Record 2 (purelymail2._domainkey)..." -ForegroundColor Yellow
$result = New-PorkbunDnsRecord -RecordType "CNAME" -Host "purelymail2._domainkey" -Value "key2._dkimroot.purelymail.com."
$results += $result
if ($result.Success) { Write-Success $result.Message } else { Write-Failure $result.Message; $allSuccessful = $false }

# --------------------------------------------------------------------------
# 5. DKIM Record 3
# --------------------------------------------------------------------------
Write-Host "[5/6] Creating DKIM Record 3 (purelymail3._domainkey)..." -ForegroundColor Yellow
$result = New-PorkbunDnsRecord -RecordType "CNAME" -Host "purelymail3._domainkey" -Value "key3._dkimroot.purelymail.com."
$results += $result
if ($result.Success) { Write-Success $result.Message } else { Write-Failure $result.Message; $allSuccessful = $false }

# --------------------------------------------------------------------------
# 6. DMARC Record
# --------------------------------------------------------------------------
Write-Host "[6/6] Creating DMARC Record (_dmarc)..." -ForegroundColor Yellow
$result = New-PorkbunDnsRecord -RecordType "CNAME" -Host "_dmarc" -Value "dmarcroot.purelymail.com."
$results += $result
if ($result.Success) { Write-Success $result.Message } else { Write-Failure $result.Message; $allSuccessful = $false }

# --------------------------------------------------------------------------
# 7. Domain Ownership Proof TXT Record
# --------------------------------------------------------------------------
Write-Host "[Bonus] Creating Domain Ownership Proof TXT Record..." -ForegroundColor Yellow
$result = New-PorkbunDnsRecord -RecordType "TXT" -Host "_purelymail" -Value $OwnershipProof
$results += $result
if ($result.Success) { Write-Success $result.Message } else { Write-Failure $result.Message; $allSuccessful = $false }

# ============================================================================
# Summary
# ============================================================================
Write-Header "Results Summary"

$successCount = ($results | Where-Object { $_.Success }).Count
$failCount = ($results | Where-Object { -not $_.Success }).Count

Write-Host "Total Records Attempted: $($results.Count)" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "Green" })
Write-Host ""

# ============================================================================
# Verification Step
# ============================================================================
Write-Header "DNS Verification"

Write-Host "Checking DNS records for $Domain..." -ForegroundColor Cyan
Write-Host ""

try {
    # Check MX records
    Write-Host "MX Records:" -ForegroundColor White
    $mxRecords = Resolve-DnsName -Name $Domain -Type MX -ErrorAction Stop
    foreach ($mx in $mxRecords) {
        Write-Host "  $($mx.NameExchange) (Priority: $($mx.Preference))" -ForegroundColor Gray
    }

    # Check TXT records (SPF)
    Write-Host ""
    Write-Host "TXT Records (SPF):" -ForegroundColor White
    $txtRecords = Resolve-DnsName -Name $Domain -Type TXT -ErrorAction Stop
    foreach ($txt in $txtRecords) {
        if ($txt.Strings -like "*spf1*") {
            Write-Host "  $($txt.Strings)" -ForegroundColor Gray
        }
    }

    # Check DKIM CNAME records
    Write-Host ""
    Write-Host "DKIM CNAME Records:" -ForegroundColor White
    $dkimHosts = @("purelymail1._domainkey", "purelymail2._domainkey", "purelymail3._domainkey")
    foreach ($host in $dkimHosts) {
        try {
            $dkimRecord = Resolve-DnsName -Name "$host.$Domain" -Type CNAME -ErrorAction Stop
            Write-Host "  $host -> $($dkimRecord.NameExchange)" -ForegroundColor Gray
        } catch {
            Write-Host "  $host -> Not found (may take time to propagate)" -ForegroundColor Yellow
        }
    }

    # Check DMARC
    Write-Host ""
    Write-Host "DMARC Record:" -ForegroundColor White
    try {
        $dmarcRecord = Resolve-DnsName -Name "_dmarc.$Domain" -Type CNAME -ErrorAction Stop
        Write-Host "  _dmarc -> $($dmarcRecord.NameExchange)" -ForegroundColor Gray
    } catch {
        Write-Host "  _dmarc -> Not found (may take time to propagate)" -ForegroundColor Yellow
    }

    Write-Success "DNS verification complete. Check output above for any 'Not found' entries."

} catch {
    Write-Failure "DNS verification failed: $($_.Exception.Message)"
    Write-Info "Note: DNS changes may take up to 24-48 hours to propagate globally."
}

# ============================================================================
# Next Steps
# ============================================================================
Write-Header "Next Steps"
Write-Host @"
1. Verify all DNS records appear correctly in Porkbun dashboard
2. Wait for DNS propagation (up to 24-48 hours)
3. Return to PurelyMail and click "Verify DNS Records" button
4. Replace '$OwnershipProof' with actual ownership proof value from PurelyMail if not done

"@ -ForegroundColor White

if ($allSuccessful) {
    Write-Success "All DNS records created successfully!"
} else {
    Write-Failure "Some records failed. Please check Porkbun dashboard and retry failed records."
}
