# ============================================================
# TeamForge AI - Production Rollback
# ============================================================

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($env:ROLLBACK_TAG)) {
    throw "ROLLBACK_TAG is required."
}

$rollbackTag =
    $env:ROLLBACK_TAG

Write-Host ""
Write-Host "============================================"
Write-Host " TeamForge AI Production Rollback"
Write-Host "============================================"
Write-Host ""
Write-Host "Rollback target: $rollbackTag"

# ------------------------------------------------------------
# Verify rollback artifacts.
# ------------------------------------------------------------

docker image inspect `
    "teamforge-ai:$rollbackTag" `
    *> $null

if ($LASTEXITCODE -ne 0) {
    throw `
        "Rollback API image teamforge-ai:$rollbackTag does not exist."
}

docker image inspect `
    "teamforge-postgres:$rollbackTag" `
    *> $null

if ($LASTEXITCODE -ne 0) {
    throw `
        "Rollback PostgreSQL image teamforge-postgres:$rollbackTag does not exist."
}

Write-Host "PASS: rollback artifacts exist."

# ------------------------------------------------------------
# Promote previous immutable version.
# ------------------------------------------------------------

$env:IMAGE_TAG =
    $rollbackTag

docker compose `
    --project-name teamforge-production `
    --file ".\compose.yaml" `
    --file ".\compose.production.yaml" `
    --env-file ".\.env.production" `
    up `
    --detach `
    --no-build

if ($LASTEXITCODE -ne 0) {
    throw "Rollback deployment failed."
}

# ------------------------------------------------------------
# Health gate.
# ------------------------------------------------------------

$healthy = $false

for (
    $attempt = 1;
    $attempt -le 20;
    $attempt++
) {

    Write-Host `
        "Rollback health check $attempt/20..."

    try {

        $health =
            Invoke-RestMethod `
                -Method Get `
                -Uri "http://localhost:3000/health" `
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
        # Containers may still be starting.
    }

    Start-Sleep -Seconds 3
}

if (-not $healthy) {
    throw "Rollback health verification failed."
}

# ------------------------------------------------------------
# Provenance.
# ------------------------------------------------------------

$apiImage =
    (
        docker inspect `
            teamforge-production-api-1 `
            --format "{{.Config.Image}}"
    ).Trim()

$dbImage =
    (
        docker inspect `
            teamforge-production-postgres-1 `
            --format "{{.Config.Image}}"
    ).Trim()

if (
    $apiImage -ne
    "teamforge-ai:$rollbackTag"
) {
    throw "Rollback API provenance verification failed."
}

if (
    $dbImage -ne
    "teamforge-postgres:$rollbackTag"
) {
    throw "Rollback database provenance verification failed."
}

Write-Host ""
Write-Host "============================================"
Write-Host " PRODUCTION ROLLBACK PASSED"
Write-Host "============================================"
Write-Host ""
Write-Host "Production restored to: $rollbackTag"

exit 0