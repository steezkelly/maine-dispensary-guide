$ErrorActionPreference = "SilentlyContinue"
try {
    $r = [Net.HttpWebRequest]::Create("https://mainedispensaryguide.com/all-guides")
    $r.UserAgent = "Mozilla/5.0"
    $r.Timeout = 15000
    $resp = $r.GetResponse()
    $sr = [System.IO.StreamReader]::new($resp.GetResponseStream())
    $content = $sr.ReadToEnd()
    $sr.Close()
    $resp.Close()
    
    if ($content -match "Maine Cannabis Resource Library") {
        Write-Host "NEW CONTENT DEPLOYED - Maine Cannabis Resource Library found"
    } elseif ($content -match "National Expansion") {
        Write-Host "OLD CONTENT - National Expansion hub still showing"
    } else {
        Write-Host "CONTENT UNKNOWN - check manually"
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
