$headers = @{
    "Authorization" = "Key 0074bb6b-18bc-43fa-8df5-3fe3db094237:6c10c5e128ab0aa68815fed1cf224b52"
    "Content-Type" = "application/json"
}

$body = @{
    prompt = "A misty Maine lighthouse at dawn, rocky Atlantic coastline, golden hour light, photorealistic"
    image_size = @{ width = 1200; height = 400 }
    num_images = 1
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://fal.run/fal-ai/flux/schnell" -Method Post -Headers $headers -Body $body -TimeoutSec 60
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
}
