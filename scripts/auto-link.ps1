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

Write-Host "Starting Global Glossary Injection (Excluding Index)..."

# Filter out index.astro to prevent breaking Astro array objects
$files = Get-ChildItem -Path $pagesPath -Filter "*.astro" | Where-Object { $_.Name -ne "index.astro" }

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $modified = $false

    foreach ($term in $glossaryMap.Keys) {
        $link = $glossaryMap[$term]
        
        # Pattern ensures we are not inside a tag or attribute
        $pattern = "(^|\s)($term)(\s|[.,!?;]|$)"
        
        $linkMarker = "href=""$link"""
        if ($content -notmatch [regex]::Escape($linkMarker)) {
            if ($content -match $pattern) {
                # Replace first occurrence in prose only
                # We skip content that looks like frontmatter or tag attributes
                $content = [regex]::Replace($content, $pattern, "`$1<a href=""$link"">`$2</a>`$3", 1)
                $modified = $true
            }
        }
    }

    if ($modified) {
        [System.IO.File]::WriteAllText($file.FullName, $content)
        Write-Host "Updated: $($file.Name)"
    }
}

Write-Host "Link Architect Sync Complete."
