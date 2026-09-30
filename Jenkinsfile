pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timeout(time: 90, unit: 'MINUTES')
    }

    environment {
        NODE_ENV = 'test'
        STAGING_URL = 'http://localhost:3001'
        PRODUCTION_URL = 'http://localhost:3000'
        GOSU_VERSION = '1.19'
    }

    stages {
        stage('1. Build') {
            steps {
                bat 'npm ci'
                script {
                    env.GIT_SHORT_SHA = bat(script: '@git rev-parse --short HEAD', returnStdout: true).trim()
                    env.IMAGE_TAG = "git-${env.GIT_SHORT_SHA}"
                    currentBuild.displayName = "#${env.BUILD_NUMBER} ${env.IMAGE_TAG}"
                }
                bat '''
                    @echo off
                    docker build --pull --file Dockerfile --tag teamforge-ai:%IMAGE_TAG% .
                    if errorlevel 1 exit /b 1
                    docker build --pull --build-arg GOSU_VERSION=%GOSU_VERSION% --file database\\Dockerfile --tag teamforge-postgres:%IMAGE_TAG% database
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('2. Test') {
            steps { bat 'npm run test:ci' }
            post {
                always {
                    junit testResults: 'test-results/**/*.xml', allowEmptyResults: true
                    archiveArtifacts artifacts: 'coverage/**/*', allowEmptyArchive: true, fingerprint: true
                }
            }
        }

        stage('3. Code Quality') {

            steps {

                echo '=== TEAMFORGE AI - CODE QUALITY ==='

                bat 'npm run lint'

                script {

                    def scannerHome =
                        tool 'SonarScanner'

                    withSonarQubeEnv('SonarQube') {

                        bat """
                            "${scannerHome}\\bin\\sonar-scanner.bat"
                        """
                    }
                }

                timeout(
                    time: 10,
                    unit: 'MINUTES'
                ) {

                    waitForQualityGate(
                        abortPipeline: true
                    )
                }
            }
        }

        stage('4. Security') {
            steps {
                bat 'npm run security'
                bat 'trivy fs --scanners vuln --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 .'
                bat 'trivy fs --scanners misconfig --severity HIGH,CRITICAL --ignorefile .trivyignore --exit-code 1 .'
                bat 'trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 teamforge-ai:%IMAGE_TAG%'
                bat 'trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 teamforge-postgres:%IMAGE_TAG%'
                powershell '''
                    $ErrorActionPreference = "Stop"
                    $env:POSTGRES_VERIFY_IMAGE = "teamforge-postgres:$env:IMAGE_TAG"
                    & powershell -NoProfile -ExecutionPolicy Bypass -File ".\\scripts\\verify-postgres-runtime.ps1"
                    if ($LASTEXITCODE -ne 0) { throw "PostgreSQL runtime security gate failed." }
                    Remove-Item Env:POSTGRES_VERIFY_IMAGE -ErrorAction SilentlyContinue
                '''
            }
        }

        stage('5. Deploy - Staging') {
            steps {
                withCredentials([
                    string(credentialsId: 'teamforge-staging-db-password', variable: 'TEAMFORGE_DB_PASSWORD'),
                    string(credentialsId: 'teamforge-staging-jwt-secret', variable: 'TEAMFORGE_JWT_SECRET')
                ]) {
                    powershell '''
                        $ErrorActionPreference = "Stop"
                        $env:DEPLOY_ENVIRONMENT = "staging"
                        & powershell -NoProfile -ExecutionPolicy Bypass -File ".\\scripts\\create-ci-env.ps1"
                        if ($LASTEXITCODE -ne 0) { throw "Unable to generate staging environment." }
                        docker compose --project-name teamforge-staging --file ".\\compose.yaml" --file ".\\compose.staging.yaml" --env-file ".\\.env.staging" config --quiet
                        if ($LASTEXITCODE -ne 0) { throw "Staging Compose validation failed." }
                        docker compose --project-name teamforge-staging --file ".\\compose.yaml" --file ".\\compose.staging.yaml" --env-file ".\\.env.staging" up --detach --no-build
                        if ($LASTEXITCODE -ne 0) { throw "Staging deployment failed." }
                    '''
                }
                powershell '''
                    $env:VERIFY_URL = "http://localhost:3001/health"
                    & powershell -NoProfile -ExecutionPolicy Bypass -File ".\\scripts\\verify-deployment.ps1"
                    if ($LASTEXITCODE -ne 0) { throw "Staging health gate failed." }
                '''
                powershell '''
                    $api = (docker inspect teamforge-staging-api-1 --format "{{.Config.Image}}").Trim()
                    $db = (docker inspect teamforge-staging-postgres-1 --format "{{.Config.Image}}").Trim()
                    if ($api -ne "teamforge-ai:$env:IMAGE_TAG") { throw "Staging API provenance failed." }
                    if ($db -ne "teamforge-postgres:$env:IMAGE_TAG") { throw "Staging DB provenance failed." }
                '''
                bat 'npm run smoke:staging'
            }
        }

        stage('6. Release - Production') {
            steps {
                script {
                    env.PREVIOUS_RELEASE = powershell(
                        returnStdout: true,
                        script: '''
                            $image = cmd /c "docker inspect teamforge-production-api-1 --format=""{{.Config.Image}}"" 2>NUL"
                            if ($LASTEXITCODE -eq 0) {
                                $image = "$image".Trim()
                                if ($image -match "^teamforge-ai:(.+)$") { Write-Output $Matches[1] }
                            }
                        '''
                    ).trim()

                    try {
                        withCredentials([
                            string(credentialsId: 'teamforge-production-db-password', variable: 'TEAMFORGE_DB_PASSWORD'),
                            string(credentialsId: 'teamforge-production-jwt-secret', variable: 'TEAMFORGE_JWT_SECRET')
                        ]) {
                            powershell '''
                                $ErrorActionPreference = "Stop"
                                $env:DEPLOY_ENVIRONMENT = "production"
                                & powershell -NoProfile -ExecutionPolicy Bypass -File ".\\scripts\\create-ci-env.ps1"
                                if ($LASTEXITCODE -ne 0) { throw "Unable to generate production environment." }
                                docker compose --project-name teamforge-production --file ".\\compose.yaml" --file ".\\compose.production.yaml" --env-file ".\\.env.production" config --quiet
                                if ($LASTEXITCODE -ne 0) { throw "Production Compose validation failed." }
                                docker compose --project-name teamforge-production --file ".\\compose.yaml" --file ".\\compose.production.yaml" --env-file ".\\.env.production" up --detach --no-build
                                if ($LASTEXITCODE -ne 0) { throw "Production deployment failed." }
                            '''
                        }
                        powershell '''
                            $env:VERIFY_URL = "http://localhost:3000/health"
                            & powershell -NoProfile -ExecutionPolicy Bypass -File ".\\scripts\\verify-deployment.ps1"
                            if ($LASTEXITCODE -ne 0) { throw "Production health gate failed." }
                        '''
                        powershell '''
                            $api = (docker inspect teamforge-production-api-1 --format "{{.Config.Image}}").Trim()
                            $db = (docker inspect teamforge-production-postgres-1 --format "{{.Config.Image}}").Trim()
                            if ($api -ne "teamforge-ai:$env:IMAGE_TAG") { throw "Production API provenance failed." }
                            if ($db -ne "teamforge-postgres:$env:IMAGE_TAG") { throw "Production DB provenance failed." }
                        '''
                        bat 'npm run smoke:production'
                    } catch (releaseError) {
                        if (env.PREVIOUS_RELEASE && env.PREVIOUS_RELEASE != env.IMAGE_TAG) {
                            withCredentials([
                                string(credentialsId: 'teamforge-production-db-password', variable: 'TEAMFORGE_DB_PASSWORD'),
                                string(credentialsId: 'teamforge-production-jwt-secret', variable: 'TEAMFORGE_JWT_SECRET')
                            ]) {
                                powershell '''
                                    $env:ROLLBACK_TAG = $env:PREVIOUS_RELEASE
                                    & powershell -NoProfile -ExecutionPolicy Bypass -File ".\\scripts\\rollback-production.ps1"
                                    if ($LASTEXITCODE -ne 0) { throw "Automatic production rollback failed." }
                                '''
                            }
                        }
                        throw releaseError
                    }
                }
            }
        }

        stage('7. Monitoring & Evidence') {
            steps {
                powershell '''
                    $staging = Invoke-RestMethod -Uri "http://localhost:3001/health"
                    $production = Invoke-RestMethod -Uri "http://localhost:3000/health"
                    if ($staging.status -ne "UP" -or $staging.database -ne "UP") { throw "Staging monitoring failed." }
                    if ($production.status -ne "UP" -or $production.database -ne "UP") { throw "Production monitoring failed." }

                    $containers = @("teamforge-staging-api-1","teamforge-staging-postgres-1","teamforge-production-api-1","teamforge-production-postgres-1")
                    foreach ($c in $containers) {
                        $state = (docker inspect $c --format "{{.State.Status}}").Trim()
                        $health = (docker inspect $c --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}").Trim()
                        if ($state -ne "running") { throw "$c is not running." }
                        if ($health -ne "healthy" -and $health -ne "none") { throw "$c health is $health." }
                    }
                '''
                powershell '''
                    New-Item -ItemType Directory -Force ".\\release" | Out-Null
                    $apiId = (docker image inspect "teamforge-ai:$env:IMAGE_TAG" --format "{{.Id}}").Trim()
                    $dbId = (docker image inspect "teamforge-postgres:$env:IMAGE_TAG" --format "{{.Id}}").Trim()
                    $prodApi = (docker inspect teamforge-production-api-1 --format "{{.Config.Image}}").Trim()
                    $prodDb = (docker inspect teamforge-production-postgres-1 --format "{{.Config.Image}}").Trim()

                    $manifest = [ordered]@{
                        application = "TeamForge AI"
                        jenkinsBuild = $env:BUILD_NUMBER
                        jenkinsJob = $env:JOB_NAME
                        gitCommit = $env:GIT_SHORT_SHA
                        releaseTag = $env:IMAGE_TAG
                        apiImage = "teamforge-ai:$env:IMAGE_TAG"
                        apiImageId = $apiId
                        databaseImage = "teamforge-postgres:$env:IMAGE_TAG"
                        databaseImageId = $dbId
                        productionApiImage = $prodApi
                        productionDatabaseImage = $prodDb
                        stagingHealth = "PASS"
                        stagingSmoke = "PASS"
                        productionHealth = "PASS"
                        productionSmoke = "PASS"
                        codeQuality = "PASS"
                        securityGate = "PASS"
                        postgresRuntimeVerification = "PASS"
                        previousProductionRelease = $env:PREVIOUS_RELEASE
                        releasedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
                    }

                    $path = ".\\release\\$($env:IMAGE_TAG).json"
                    $manifest | ConvertTo-Json -Depth 10 | Set-Content -Path $path -Encoding utf8
                '''
                archiveArtifacts artifacts: 'release/*.json', fingerprint: true, allowEmptyArchive: false
            }
        }
    }

    post {
        always {
            powershell '''
                Remove-Item ".\\.env.staging" -Force -ErrorAction SilentlyContinue
                Remove-Item ".\\.env.production" -Force -ErrorAction SilentlyContinue
                Remove-Item Env:POSTGRES_VERIFY_IMAGE -ErrorAction SilentlyContinue
                Remove-Item Env:ROLLBACK_TAG -ErrorAction SilentlyContinue
            '''
        }
        success {
            echo 'TEAMFORGE AI CI/CD PIPELINE PASSED'
        }
        failure {
            echo 'TEAMFORGE AI CI/CD PIPELINE FAILED - review the failed mandatory gate.'
        }
    }
}
