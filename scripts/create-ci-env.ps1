# ============================================================
# TeamForge AI - Jenkins Environment Generator
# ============================================================

$ErrorActionPreference = "Stop"

if (-not $env:DEPLOY_ENVIRONMENT) {
    throw "DEPLOY_ENVIRONMENT is required."
}

if (-not $env:TEAMFORGE_DB_PASSWORD) {
    throw "TEAMFORGE_DB_PASSWORD is required."
}

if (-not $env:TEAMFORGE_JWT_SECRET) {
    throw "TEAMFORGE_JWT_SECRET is required."
}

if (-not $env:IMAGE_TAG) {
    throw "IMAGE_TAG is required."
}


switch ($env:DEPLOY_ENVIRONMENT) {

    "staging" {

        $outputFile = ".env.staging"

        $content = @"
COMPOSE_PROJECT_NAME=teamforge-staging
IMAGE_TAG=$($env:IMAGE_TAG)

NODE_ENV=production
DEPLOYMENT_ENVIRONMENT=staging

PORT=3000
API_HOST_PORT=3001

DB_HOST=postgres
DB_PORT=5432
DB_NAME=teamforge_staging
DB_USER=teamforge_user
DB_PASSWORD=$($env:TEAMFORGE_DB_PASSWORD)

DB_VOLUME_NAME=teamforge-postgres-staging

JWT_SECRET=$($env:TEAMFORGE_JWT_SECRET)
JWT_EXPIRES_IN=1h

CLIENT_ORIGIN=http://localhost:3001
"@
    }


    "production" {

        $outputFile = ".env.production"

        $content = @"
COMPOSE_PROJECT_NAME=teamforge-production
IMAGE_TAG=$($env:IMAGE_TAG)

NODE_ENV=production
DEPLOYMENT_ENVIRONMENT=production

PORT=3000
API_HOST_PORT=3000

DB_HOST=postgres
DB_PORT=5432
DB_NAME=teamforge
DB_USER=teamforge_user
DB_PASSWORD=$($env:TEAMFORGE_DB_PASSWORD)

DB_VOLUME_NAME=teamforge-postgres-production

JWT_SECRET=$($env:TEAMFORGE_JWT_SECRET)
JWT_EXPIRES_IN=1h

CLIENT_ORIGIN=http://localhost:3000
"@
    }


    default {

        throw `
            "Unsupported DEPLOY_ENVIRONMENT '$($env:DEPLOY_ENVIRONMENT)'."
    }
}


$content |
    Set-Content `
        -Path $outputFile `
        -Encoding utf8


Write-Host `
    "PASS: generated $outputFile"
