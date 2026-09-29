# ============================================================
# TeamForge AI
# PostgreSQL Runtime Security & Schema Verification
# ============================================================
#
# Purpose:
#   Validate the runtime security and database integrity of the
#   hardened TeamForge PostgreSQL Docker image.
#
# This script is also the automated compensating control for the
# narrowly scoped Trivy DS-0002 exception.
#
# Verification performed:
#
#   1. Hardened PostgreSQL image exists and starts.
#   2. PostgreSQL becomes ready.
#   3. TeamForge initialization completes.
#   4. users, projects and tasks tables exist.
#   5. Required UUID columns exist.
#   6. Dedicated postgres account is non-root.
#   7. Final PostgreSQL postmaster is identified through
#      $PGDATA/postmaster.pid.
#   8. Postmaster UID matches the postgres account UID.
#   9. Postmaster does not run as root.
#  10. PostgreSQL remains ready in steady state.
#  11. Hardened gosu privilege transition works.
#  12. Expected gosu executable is used.
#  13. TeamForge schema remains available in steady state.
#  14. Temporary verification resources are always removed.
#
# Exit codes:
#
#   0 = verification passed
#   1 = verification failed
#
# Jenkins usage:
#
#   Set POSTGRES_VERIFY_IMAGE to verify an immutable release
#   image instead of the local development image.
#
# Example:
#
#   $env:POSTGRES_VERIFY_IMAGE =
#       "teamforge-postgres:git-db772e5"
#
# ============================================================


# ------------------------------------------------------------
# PowerShell execution behaviour
# ------------------------------------------------------------

$ErrorActionPreference = "Stop"

# Explicit script state; native commands can overwrite $LASTEXITCODE.
$verificationFailed = $false


# ------------------------------------------------------------
# Verification configuration
# ------------------------------------------------------------

$containerName =
    "teamforge-postgres-security-test"

$databaseName =
    "teamforge_security_test"

$databaseUser =
    "teamforge_user"

# Disposable verification credential only.
#
# This credential exists only inside the temporary container.
# It must never be reused for staging or production.
$databasePassword =
    "TemporarySecurityTest123"


# Jenkins can override the image being verified.
$imageName =
    if ($env:POSTGRES_VERIFY_IMAGE) {

        $env:POSTGRES_VERIFY_IMAGE
    }
    else {

        "teamforge-postgres:local"
    }


# Maximum attempts for schema initialization.
$maximumSchemaAttempts = 30

# Maximum attempts for final runtime verification.
$maximumRuntimeAttempts = 20

# Delay between retry attempts.
$retryDelaySeconds = 2


# ============================================================
# Helper functions
# ============================================================

function Write-Section {

    param (

        [Parameter(Mandatory = $true)]
        [string]$Title
    )

    Write-Host ""
    Write-Host "============================================"
    Write-Host " $Title"
    Write-Host "============================================"
    Write-Host ""
}


function Stop-Verification {

    param (

        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    throw $Message
}


# ============================================================
# Start verification
# ============================================================

Write-Section `
    "TeamForge PostgreSQL Runtime Verification"

Write-Host "Image:         $imageName"
Write-Host "Container:     $containerName"
Write-Host "Database:      $databaseName"
Write-Host "Database user: $databaseUser"
Write-Host ""


# ------------------------------------------------------------
# Confirm the image exists before starting verification.
# ------------------------------------------------------------

Write-Host "Checking verification image..."

docker image inspect `
    $imageName `
    *> $null


if ($LASTEXITCODE -ne 0) {

    Stop-Verification `
        "PostgreSQL verification image '$imageName' does not exist."
}


Write-Host `
    "PASS: verification image exists."


# ------------------------------------------------------------
# Remove a container left behind by an interrupted execution.
# ------------------------------------------------------------

Write-Host ""
Write-Host `
    "Removing any previous verification container..."

docker rm `
    --force `
    $containerName `
    2>$null |
    Out-Null


# ------------------------------------------------------------
# Start a completely fresh PostgreSQL container.
#
# No persistent volume is attached intentionally.
#
# The fresh writable layer guarantees that PostgreSQL
# initialization and /docker-entrypoint-initdb.d processing
# execute during every verification run.
# ------------------------------------------------------------

Write-Host `
    "Starting PostgreSQL verification container..."

docker run `
    --detach `
    --name $containerName `
    -e "POSTGRES_DB=$databaseName" `
    -e "POSTGRES_USER=$databaseUser" `
    -e "POSTGRES_PASSWORD=$databasePassword" `
    $imageName |
    Out-Null


if ($LASTEXITCODE -ne 0) {

    Stop-Verification `
        "Unable to start PostgreSQL verification container."
}


try {

    # ========================================================
    # 1. Wait for complete TeamForge schema initialization
    # ========================================================

    Write-Section `
        "Database Initialization"

    Write-Host `
        "Waiting for PostgreSQL and TeamForge schema..."


    $schemaReady = $false


    for (
        $attempt = 1;
        $attempt -le $maximumSchemaAttempts;
        $attempt++
    ) {

        Write-Host `
            "Initialization check $attempt/$maximumSchemaAttempts..."


        # ----------------------------------------------------
        # First verify PostgreSQL currently accepts
        # connections.
        # ----------------------------------------------------

        docker exec `
            $containerName `
            pg_isready `
            -U $databaseUser `
            -d $databaseName `
            2>$null |
            Out-Null


        if ($LASTEXITCODE -eq 0) {

            # ------------------------------------------------
            # pg_isready alone is not enough.
            #
            # During first initialization the official
            # PostgreSQL entrypoint temporarily starts the
            # database before executing initialization scripts.
            #
            # TeamForge is considered schema-ready only when
            # all three required application tables exist.
            # ------------------------------------------------

            $tableCount =
                docker exec `
                    $containerName `
                    psql `
                    -U $databaseUser `
                    -d $databaseName `
                    -tA `
                    -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND tablename IN ('users','projects','tasks');" `
                    2>$null


            if ($LASTEXITCODE -eq 0) {

                $normalisedTableCount =
                    "$tableCount".Trim()


                if (
                    $normalisedTableCount -eq "3"
                ) {

                    $schemaReady = $true

                    break
                }
            }
        }


        Start-Sleep `
            -Seconds $retryDelaySeconds
    }


    if (-not $schemaReady) {

        Stop-Verification `
            "PostgreSQL did not complete TeamForge schema initialization within the permitted time."
    }


    Write-Host ""
    Write-Host `
        "PASS: PostgreSQL became ready."

    Write-Host `
        "PASS: TeamForge schema initialized."


    # ========================================================
    # 2. Verify exact TeamForge tables
    # ========================================================

    Write-Section `
        "Schema Verification"


    $tables =
        docker exec `
            $containerName `
            psql `
            -U $databaseUser `
            -d $databaseName `
            -tA `
            -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"


    if ($LASTEXITCODE -ne 0) {

        Stop-Verification `
            "Unable to retrieve TeamForge table metadata."
    }


    $requiredTables = @(
        "projects",
        "tasks",
        "users"
    )


    foreach (
        $table in $requiredTables
    ) {

        if (
            $tables -notcontains $table
        ) {

            Stop-Verification `
                "Required table '$table' was not initialized."
        }


        Write-Host `
            "PASS: table '$table' exists."
    }


    # ========================================================
    # 3. Verify UUID schema
    # ========================================================

    Write-Host ""
    Write-Host `
        "Verifying UUID schema..."


    $uuidColumns =
        docker exec `
            $containerName `
            psql `
            -U $databaseUser `
            -d $databaseName `
            -tA `
            -c "SELECT table_name || '.' || column_name FROM information_schema.columns WHERE table_schema='public' AND data_type='uuid' ORDER BY table_name, column_name;"


    if ($LASTEXITCODE -ne 0) {

        Stop-Verification `
            "Unable to retrieve UUID column metadata."
    }


    $requiredUuidColumns = @(
        "projects.id",
        "projects.owner_id",
        "tasks.assigned_to",
        "tasks.created_by",
        "tasks.id",
        "tasks.project_id",
        "users.id"
    )


    foreach (
        $column in $requiredUuidColumns
    ) {

        if (
            $uuidColumns -notcontains $column
        ) {

            Stop-Verification `
                "Expected UUID column '$column' was not found."
        }


        Write-Host `
            "PASS: UUID column '$column' exists."
    }


    Write-Host ""
    Write-Host `
        "PASS: TeamForge UUID schema verified."


    # ========================================================
    # 4. Verify dedicated postgres account
    # ========================================================

    Write-Section `
        "Runtime Identity Verification"


    $postgresUid =
        docker exec `
            $containerName `
            id `
            -u `
            postgres


    if ($LASTEXITCODE -ne 0) {

        Stop-Verification `
            "Unable to determine the postgres account UID."
    }


    $postgresUid =
        "$postgresUid".Trim()


    if (-not $postgresUid) {

        Stop-Verification `
            "The postgres account UID was empty."
    }


    if (
        $postgresUid -notmatch '^\d+$'
    ) {

        Stop-Verification `
            "The postgres account returned an invalid UID '$postgresUid'."
    }


    if (
        $postgresUid -eq "0"
    ) {

        Stop-Verification `
            "The postgres account unexpectedly maps to root UID 0."
    }


    Write-Host `
        "PostgreSQL account UID: $postgresUid"

    Write-Host `
        "PASS: postgres account is non-root."


    # ========================================================
    # 5. Wait for final steady-state PostgreSQL server
    # ========================================================
    #
    # During initial database creation the official PostgreSQL
    # entrypoint performs this lifecycle:
    #
    #   temporary PostgreSQL server
    #            ↓
    #   database creation
    #            ↓
    #   /docker-entrypoint-initdb.d scripts
    #            ↓
    #   temporary server shutdown
    #            ↓
    #   final PostgreSQL server
    #
    # Therefore:
    #
    #   - PID 1 should not be assumed to already be postgres;
    #   - short-lived client backend PIDs should not be used;
    #
    # PostgreSQL provides a stable long-lived server PID in:
    #
    #   $PGDATA/postmaster.pid
    #
    # The first line contains the postmaster PID.
    # ========================================================

    Write-Host ""
    Write-Host `
        "Waiting for final PostgreSQL runtime..."


    $runtimeReady = $false

    $postmasterPid = $null

    $postmasterUid = $null

    $postmasterCommand = $null


    for (
        $attempt = 1;
        $attempt -le $maximumRuntimeAttempts;
        $attempt++
    ) {

        Write-Host `
            "Runtime verification check $attempt/$maximumRuntimeAttempts..."


        # ----------------------------------------------------
        # Confirm PostgreSQL currently accepts connections.
        # ----------------------------------------------------

        docker exec `
            $containerName `
            pg_isready `
            -U $databaseUser `
            -d $databaseName `
            2>$null |
            Out-Null


        if ($LASTEXITCODE -eq 0) {

            # ------------------------------------------------
            # Read the current postmaster PID.
            # ------------------------------------------------

            $candidatePid =
                docker exec `
                    $containerName `
                    sh `
                    -c 'if [ -f "$PGDATA/postmaster.pid" ]; then head -n 1 "$PGDATA/postmaster.pid"; fi' `
                    2>$null


            if ($LASTEXITCODE -eq 0) {

                $candidatePid =
                    "$candidatePid".Trim()


                if (
                    $candidatePid -match '^\d+$'
                ) {

                    # ----------------------------------------
                    # Read process metadata in ONE container
                    # shell execution.
                    #
                    # This minimizes race conditions during the
                    # temporary-to-final server transition.
                    # ----------------------------------------

                    $processMetadata =
                        docker exec `
                            $containerName `
                            sh `
                            -c 'pid="$1"; status="/proc/$pid/status"; cmdline="/proc/$pid/cmdline"; [ -r "$status" ] || exit 1; [ -r "$cmdline" ] || exit 1; uid=$(awk ''/^Uid:/ {print $2}'' "$status"); cmd=$(tr ''\000'' '' '' < "$cmdline" 2>/dev/null); [ -n "$uid" ] || exit 1; printf ''%s|%s|%s\n'' "$pid" "$uid" "$cmd"' `
                            _ `
                            $candidatePid `
                            2>$null


                    if (
                        $LASTEXITCODE -eq 0 -and
                        $processMetadata
                    ) {

                        $processMetadata =
                            "$processMetadata".Trim()


                        $parts =
                            $processMetadata -split '\|', 3


                        if (
                            $parts.Count -eq 3
                        ) {

                            $candidateProcessPid =
                                "$($parts[0])".Trim()

                            $candidateProcessUid =
                                "$($parts[1])".Trim()

                            $candidateProcessCommand =
                                "$($parts[2])".Trim()


                            Write-Host `
                                "Candidate postmaster PID: $candidateProcessPid"

                            Write-Host `
                                "Candidate postmaster UID: $candidateProcessUid"

                            Write-Host `
                                "Candidate command: $candidateProcessCommand"


                            # --------------------------------
                            # Confirm the process is PostgreSQL.
                            # --------------------------------

                            if (
                                $candidateProcessCommand -match
                                'postgres'
                            ) {

                                # ----------------------------
                                # PostgreSQL must not run as
                                # root.
                                # ----------------------------

                                if (
                                    $candidateProcessUid -eq
                                    "0"
                                ) {

                                    Stop-Verification `
                                        "PostgreSQL postmaster is running as root."
                                }


                                # ----------------------------
                                # Runtime UID must match the
                                # dedicated postgres account.
                                # ----------------------------

                                if (
                                    $candidateProcessUid -ne
                                    $postgresUid
                                ) {

                                    Stop-Verification `
                                        "PostgreSQL postmaster UID '$candidateProcessUid' does not match postgres account UID '$postgresUid'."
                                }


                                $postmasterPid =
                                    $candidateProcessPid

                                $postmasterUid =
                                    $candidateProcessUid

                                $postmasterCommand =
                                    $candidateProcessCommand

                                $runtimeReady =
                                    $true

                                break
                            }
                        }
                    }
                }
            }
        }


        Start-Sleep `
            -Seconds $retryDelaySeconds
    }


    if (-not $runtimeReady) {

        Stop-Verification `
            "Unable to verify the final PostgreSQL postmaster runtime identity."
    }


    Write-Host ""
    Write-Host `
        "PostgreSQL postmaster PID: $postmasterPid"

    Write-Host `
        "PostgreSQL postmaster UID: $postmasterUid"

    Write-Host `
        "PostgreSQL command: $postmasterCommand"

    Write-Host ""
    Write-Host `
        "PASS: PostgreSQL postmaster runs as postgres UID $postgresUid."

    Write-Host `
        "PASS: PostgreSQL postmaster is non-root."


    # ========================================================
    # 6. Verify PostgreSQL remains operational
    # ========================================================

    Write-Host ""
    Write-Host `
        "Verifying steady-state PostgreSQL readiness..."


    docker exec `
        $containerName `
        pg_isready `
        -U $databaseUser `
        -d $databaseName `
        2>$null |
        Out-Null


    if ($LASTEXITCODE -ne 0) {

        Stop-Verification `
            "PostgreSQL is no longer ready after runtime identity verification."
    }


    Write-Host `
        "PASS: PostgreSQL remains ready in steady state."


    # ========================================================
    # 7. Verify hardened gosu remains functional
    # ========================================================

    Write-Section `
        "Hardened gosu Verification"


    # --------------------------------------------------------
    # The official PostgreSQL entrypoint uses gosu for
    # privilege transition.
    #
    # TeamForge replaces the vulnerable upstream gosu binary
    # with gosu rebuilt using a patched Go toolchain.
    #
    # This verifies that the replacement still performs the
    # required privilege transition.
    # --------------------------------------------------------

    docker exec `
        $containerName `
        gosu `
        postgres `
        true


    if (
        $LASTEXITCODE -ne 0
    ) {

        Stop-Verification `
            "Hardened gosu privilege transition verification failed."
    }


    Write-Host `
        "PASS: hardened gosu privilege transition works."


    # ========================================================
    # 8. Verify expected gosu executable path
    # ========================================================

    $gosuPath =
        docker exec `
            $containerName `
            sh `
            -c 'command -v gosu'


    if ($LASTEXITCODE -ne 0) {

        Stop-Verification `
            "gosu executable could not be located."
    }


    $gosuPath =
        "$gosuPath".Trim()


    if (
        $gosuPath -ne
        "/usr/local/bin/gosu"
    ) {

        Stop-Verification `
            "Unexpected gosu executable path: '$gosuPath'."
    }


    Write-Host `
        "PASS: hardened gosu path verified: $gosuPath"


    # ========================================================
    # 9. Final steady-state schema integrity check
    # ========================================================

    Write-Section `
        "Final Database Integrity Check"


    $finalTableCount =
        docker exec `
            $containerName `
            psql `
            -U $databaseUser `
            -d $databaseName `
            -tA `
            -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND tablename IN ('users','projects','tasks');"


    if ($LASTEXITCODE -ne 0) {

        Stop-Verification `
            "Final TeamForge schema verification query failed."
    }


    $finalTableCount =
        "$finalTableCount".Trim()


    if (
        $finalTableCount -ne "3"
    ) {

        Stop-Verification `
            "Final TeamForge schema integrity check expected 3 tables but found '$finalTableCount'."
    }


    Write-Host `
        "PASS: all three TeamForge tables remain available."


    # ========================================================
    # 10. Final UUID integrity verification
    # ========================================================
    #
    # Re-check the critical UUID relationships after PostgreSQL
    # has reached its steady-state runtime.
    #
    # This confirms that initialization did not merely create
    # the tables, but produced the expected TeamForge schema.
    # ========================================================

    $finalUuidCount =
        docker exec `
            $containerName `
            psql `
            -U $databaseUser `
            -d $databaseName `
            -tA `
            -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND data_type='uuid' AND ((table_name='users' AND column_name='id') OR (table_name='projects' AND column_name IN ('id','owner_id')) OR (table_name='tasks' AND column_name IN ('id','project_id','assigned_to','created_by')));"


    if ($LASTEXITCODE -ne 0) {

        Stop-Verification `
            "Final UUID schema verification query failed."
    }


    $finalUuidCount =
        "$finalUuidCount".Trim()


    if (
        $finalUuidCount -ne "7"
    ) {

        Stop-Verification `
            "Final UUID schema integrity check expected 7 UUID columns but found '$finalUuidCount'."
    }


    Write-Host `
        "PASS: UUID schema remains intact."


    # ========================================================
    # 11. Verify foreign-key relationships
    # ========================================================
    #
    # TeamForge relies on relational ownership and task/project
    # integrity. Verify the expected foreign keys still exist.
    # ========================================================

    Write-Host ""
    Write-Host `
        "Verifying relational constraints..."


    $foreignKeyCount =
        docker exec `
            $containerName `
            psql `
            -U $databaseUser `
            -d $databaseName `
            -tA `
            -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema='public' AND constraint_type='FOREIGN KEY' AND constraint_name IN ('fk_project_owner','fk_task_project','fk_task_assignee','fk_task_creator');"


    if ($LASTEXITCODE -ne 0) {

        Stop-Verification `
            "Foreign-key verification query failed."
    }


    $foreignKeyCount =
        "$foreignKeyCount".Trim()


    if (
        $foreignKeyCount -ne "4"
    ) {

        Stop-Verification `
            "Expected 4 TeamForge foreign-key constraints but found '$foreignKeyCount'."
    }


    Write-Host `
        "PASS: TeamForge foreign-key relationships verified."


    # ========================================================
    # 12. Verify important indexes
    # ========================================================
    #
    # These indexes support the primary Project/Task ownership,
    # filtering and workflow query paths.
    # ========================================================

    Write-Host ""
    Write-Host `
        "Verifying TeamForge indexes..."


    $indexCount =
        docker exec `
            $containerName `
            psql `
            -U $databaseUser `
            -d $databaseName `
            -tA `
            -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public' AND indexname IN ('idx_projects_owner_id','idx_projects_status','idx_tasks_project_id','idx_tasks_assigned_to','idx_tasks_created_by','idx_tasks_status','idx_tasks_priority');"


    if ($LASTEXITCODE -ne 0) {

        Stop-Verification `
            "TeamForge index verification query failed."
    }


    $indexCount =
        "$indexCount".Trim()


    if (
        $indexCount -ne "7"
    ) {

        Stop-Verification `
            "Expected 7 TeamForge application indexes but found '$indexCount'."
    }


    Write-Host `
        "PASS: all 7 TeamForge application indexes verified."


    # ========================================================
    # 13. Verify database write/read capability
    # ========================================================
    #
    # Perform a small transactional database test.
    #
    # The transaction is deliberately rolled back so the
    # verification container remains free from test records.
    # ========================================================

    Write-Section `
        "Database Read/Write Verification"


    $transactionResult =
        docker exec `
            $containerName `
            psql `
            -U $databaseUser `
            -d $databaseName `
            -tA `
            -v ON_ERROR_STOP=1 `
            -c "BEGIN; INSERT INTO users (name,email,password_hash,role) VALUES ('Runtime Verification','runtime-verification@teamforge.invalid','verification-only','member'); SELECT COUNT(*) FROM users WHERE email='runtime-verification@teamforge.invalid'; ROLLBACK;"


    if ($LASTEXITCODE -ne 0) {

        Stop-Verification `
            "PostgreSQL transactional read/write verification failed."
    }


    # The command may return transaction status lines together
    # with the SELECT result. Check that a count of 1 appears.
    $transactionOutput =
        (
            $transactionResult |
            ForEach-Object {
                "$_".Trim()
            }
        )


    if (
        $transactionOutput -notcontains "1"
    ) {

        Stop-Verification `
            "Transactional verification did not confirm the temporary user record."
    }


    Write-Host `
        "PASS: PostgreSQL transactional write/read succeeded."

    Write-Host `
        "PASS: verification transaction rolled back."


    # ========================================================
    # 14. Verify rollback removed the temporary record
    # ========================================================

    $rollbackCount =
        docker exec `
            $containerName `
            psql `
            -U $databaseUser `
            -d $databaseName `
            -tA `
            -c "SELECT COUNT(*) FROM users WHERE email='runtime-verification@teamforge.invalid';"


    if ($LASTEXITCODE -ne 0) {

        Stop-Verification `
            "Unable to verify transaction rollback."
    }


    $rollbackCount =
        "$rollbackCount".Trim()


    if (
        $rollbackCount -ne "0"
    ) {

        Stop-Verification `
            "Verification transaction rollback failed; temporary record remains."
    }


    Write-Host `
        "PASS: rollback integrity verified."


    # ========================================================
    # 15. Final readiness gate
    # ========================================================

    Write-Section `
        "Final Runtime Readiness Gate"


    docker exec `
        $containerName `
        pg_isready `
        -U $databaseUser `
        -d $databaseName `
        2>$null |
        Out-Null


    if ($LASTEXITCODE -ne 0) {

        Stop-Verification `
            "PostgreSQL failed the final readiness gate."
    }


    Write-Host `
        "PASS: PostgreSQL final readiness gate."


    # ========================================================
    # Verification passed
    # ========================================================

    Write-Section `
        "POSTGRESQL RUNTIME SECURITY VERIFICATION PASSED"


    Write-Host `
        "Verified image: $imageName"

    Write-Host ""

    Write-Host `
        "Verification summary:"

    Write-Host `
        "  PostgreSQL startup                PASS"

    Write-Host `
        "  PostgreSQL readiness              PASS"

    Write-Host `
        "  TeamForge schema                  PASS"

    Write-Host `
        "  users/projects/tasks              PASS"

    Write-Host `
        "  UUID schema                       PASS"

    Write-Host `
        "  Foreign-key relationships         PASS"

    Write-Host `
        "  Application indexes               PASS"

    Write-Host `
        "  postgres account non-root         PASS"

    Write-Host `
        "  PostgreSQL postmaster             PASS"

    Write-Host `
        "  postmaster UID = postgres UID     PASS"

    Write-Host `
        "  PostgreSQL runtime non-root       PASS"

    Write-Host `
        "  Hardened gosu transition          PASS"

    Write-Host `
        "  Hardened gosu path                PASS"

    Write-Host `
        "  Transactional read/write          PASS"

    Write-Host `
        "  Transaction rollback              PASS"

    Write-Host `
        "  Final database readiness          PASS"

    Write-Host ""

    Write-Host `
        "RESULT: PASS"

    Write-Host ""

}
catch {

    # ========================================================
    # Failure diagnostics
    # ========================================================

    Write-Section `
        "VERIFICATION FAILED"


    Write-Host `
        $_.Exception.Message

    Write-Host ""


    # --------------------------------------------------------
    # Display container state if the container still exists.
    # --------------------------------------------------------

    Write-Host `
        "Container state:"


    docker ps `
        --all `
        --filter "name=$containerName"


    Write-Host ""


    # --------------------------------------------------------
    # Display PostgreSQL logs.
    #
    # These logs are particularly important when initialization
    # fails because they expose:
    #
    #   - initdb failures;
    #   - SQL initialization failures;
    #   - gosu/startup failures;
    #   - PostgreSQL shutdown/startup transitions.
    # --------------------------------------------------------

    Write-Host `
        "Container logs:"

    Write-Host ""


    docker logs `
        $containerName `
        2>&1


    Write-Host ""

    # Explicitly set failure state.
    $verificationFailed = $true
}
finally {

    # ========================================================
    # Cleanup
    # ========================================================
    #
    # The verification container is intentionally disposable.
    #
    # Cleanup occurs on both success and failure so repeated
    # local/Jenkins executions remain deterministic.
    # ========================================================

    Write-Host `
        "Cleaning verification container..."


    docker rm `
        --force `
        $containerName `
        2>$null |
        Out-Null


    Write-Host `
        "Cleanup complete."

    Write-Host ""
}


# ============================================================
# Explicit script exit
# ============================================================
#
# PowerShell native command exit codes can otherwise be changed
# by the cleanup commands executed in the finally block.
#
# Determine success from explicit verification state. Cleanup
# Docker commands must not be able to hide an earlier failure.
# ============================================================

if ($verificationFailed) {

    exit 1
}


exit 0
