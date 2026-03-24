# Automatic Link Architect: Maine Dispensary Guide
# Scans only .astro files in src/pages/guides/ (EXCLUDING index.astro) to avoid breaking data structures.

$projectRoot = "C:\Users\Steve\OpenCode Projects\project-1"
$pagesPath = "$projectRoot\src\pages\guides"

$glossaryMap = @{
    "Metrc" = "/glossary/#metrc"
    "280E" = "/glossary/#280e-(internal-revenue-code)"
    "IIC" = "/glossary/#iic-(individual-identification-card)"
    "AIC" = "/glossary/#aic-(authorized-individual-card)"
    "Seed-to-Sale" = "/glossary/#seed-to-sale"
    "Municipal Opt-In" = "/glossary/#municipal-opt-in"
    "Conditional License" = "/glossary/#conditional-license"
    "Licensed Premises" = "/glossary/#licensed-premises"
    "Limited Access Area" = "/glossary/#limited-access-area"
    "Universal Symbol" = "/glossary/#universal-symbol"
    "Adult Use Cannabis" = "/glossary/#adult-use-cannabis"
    "Caregiver" = "/glossary/#caregiver"
    "THC" = "/glossary/#thc-(tetrahydrocannabinol)"
}

Write-Host "🔗 Starting Global Glossary Injection (Body Only)..." -ForegroundColor Cyan

# Filter out index.astro to prevent breaking Astro array objects
$files = Get-ChildItem -Path $pagesPath -Filter "*.astro" | Where-Object { $_.Name -ne "index.astro" }

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    
    # SPLIT: We only want to process the part AFTER the <head> section
    $splitTag = "</head>"
    $parts = $content -split $splitTag, 2
    
    if ($parts.Count -lt 2) { continue } # Skip if no head tag found

    $head = $parts[0] + $splitTag
    $body = $parts[1]
    $modified = $false

    foreach ($term in $glossaryMap.Keys) {
        $link = $glossaryMap[$term]
        
        # Regex explanation:
        # (?<![/\">]) - Don't match if preceded by " or > (already in a tag)
        # \b($term)\b - Match the full word only
        # (?![^<]*>) - Don't match if we are inside an HTML tag
        $pattern = "(?<![/\">])\b($term)\b(?![^<]*>)"
        
        $linkMarker = "href=""$link"""
        if ($body -notmatch [regex]::Escape($linkMarker)) {
            if ($body -match $pattern) {
                # Only link the FIRST occurrence in the body
                $body = [regex]::Replace($body, $pattern, "<a href=""$link"">`$1</a>", 1)
                $modified = $true
            }
        }
    }

    if ($modified) {
        $newContent = $head + $body
        [System.IO.File]::WriteAllText($file.FullName, $newContent)
        Write-Host "✅ Synced: $($file.Name)" -ForegroundColor Green
    }
}

Write-Host "🚀 Link Architect Sync Complete." -ForegroundColor Cyan
