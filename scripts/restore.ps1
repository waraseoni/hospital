# Restore script — Hospital HMS (Windows PowerShell)
# Restores a .sql.gz backup into the target Supabase database.
# Applies supabase/schema.sql first (idempotent full schema), then the data dump.
#
# Requirements:
#   - psql in PATH (or set $PsqlBin below)
#   - $env:SUPABASE_DB_URL (target pooler connection string)
#
# Usage:
#   $env:SUPABASE_DB_URL = "postgresql://..."
#   .\scripts\restore.ps1 -File backups\hms-2026-01-01_120000.sql.gz

param(
    [Parameter(Mandatory=$true)][string]$File
)

$ErrorActionPreference = "Stop"

$PsqlBin = ""
if (-not $PsqlBin) { $PsqlBin = "psql" }

$DbUrl = $env:SUPABASE_DB_URL
if (-not $DbUrl) {
    throw "SUPABASE_DB_URL env var missing. Set the target connection string first."
}

if (-not (Test-Path $File)) {
    throw "Backup file not found: $File"
}

Write-Host "WARNING: This will modify the target database. Continue? (y/N)"
$confirm = Read-Host
if ($confirm -notmatch "^y") {
    Write-Host "Aborted."
    exit 1
}

# 1. Full idempotent schema
$SchemaFile = Join-Path $PSScriptRoot "..\supabase\schema.sql"
if (Test-Path $SchemaFile) {
    Write-Host "Applying schema: $SchemaFile"
    & $PsqlBin $DbUrl -f $SchemaFile
    if (-not $?) { throw "Schema apply failed" }
} else {
    Write-Host "supabase/schema.sql not found - skipping schema apply"
}

# 2. Decompress + restore data
$TempRaw = Join-Path $env:TEMP "hms-restore-last.sql"
$inStream = [System.IO.File]::OpenRead((Resolve-Path $File))
$outStream = [System.IO.File]::Create($TempRaw)
$gzip = [System.IO.Compression.GZipStream]::new($inStream, [System.IO.Compression.CompressionMode]::Decompress)
$gzip.CopyTo($outStream)
$gzip.Dispose()
$outStream.Dispose()
$inStream.Dispose()

Write-Host "Restoring data from $File"
& $PsqlBin $DbUrl -v ON_ERROR_STOP=1 -f $TempRaw
$ok = $?

Remove-Item -Force $TempRaw

if (-not $ok) { throw "Data restore failed" }
Write-Host "Restore complete."
Write-Host "Note: Storage buckets ke objects (PDFs/images) abhi nahi aaye - manually re-upload karo."