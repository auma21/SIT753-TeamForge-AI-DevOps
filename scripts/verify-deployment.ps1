# ============================================================
# TeamForge AI - Deployment Health Gate
# ============================================================

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($env:VERIFY_URL)) {
    throw "VERIFY_URL is required."
}

$maximumAttempts = 20
$delaySeconds = 3
$healthy = $false

for (
    $attempt = 1;
    $attempt -le $maximumAttempts;
    $attempt++
) {

    Write-Host `
        "Health verification $attempt/$maximumAttempts..."

    try {

        $health =
            Invoke-RestMethod `
                -Method Get `
                -Uri $env:VERIFY_URL `
                -TimeoutSec 5

        if (
            $health.status -eq "UP" -and
            $health.database -eq "UP"
        ) {

            $healthy = $true
            break
        }
    }
    catch {

        Write-Host `
            "Deployment not ready yet."
    }

    Start-Sleep `
        -Seconds $delaySeconds
}

if (-not $healthy) {
    throw `
        "Deployment health gate failed for $($env:VERIFY_URL)."
}

Write-Host ""
Write-Host "PASS: deployment health gate"
Write-Host "Service:  $($health.service)"
Write-Host "Status:   $($health.status)"
Write-Host "Database: $($health.database)"

exit 0