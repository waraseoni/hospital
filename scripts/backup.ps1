# Backup script — Hospital HMS (Windows PowerShell)
# Full PostgreSQL dump via pg_dump, compressed with .NET GZipStream, 14-day retention.
#
# Requirements:
#   - pg_dump in PATH (or set $PgDumpBin below)
#   - $env:SUPABASE_DB_URL (pooler connection string)
#
# Usage:
#   $env:SUPABASE_DB_URL = "postgresql://..."
#   .\scripts\backup.ps1

$ErrorActionPreference = "Stop"

# Adjust if pg_dump is not in PATH
$PgDumpBin = ""
if (-not $PgDumpBin) { $PgDumpBin = "pg_dump" }

$DbUrl = $env:SUPABASE_DB_URL
if (-not $DbUrl) {
    throw "SUPABASE_DB_URL env var missing. Set the pooler connection string first."
}

$BackupDir = Join-Path $PSScriptRoot "..\backups"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$Stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$OutFile = Join-Path $BackupDir "hms-$Stamp.sql.gz"
$RawFile = Join-Path $BackupDir "hms-$Stamp.sql"

Write-Host "Running pg_dump -> $RawFile"
& $PgDumpBin $DbUrl --no-owner --no-privileges --no-comments -f $RawFile

if (-not $?) {
    Remove-Item -Force $RawFile -ErrorAction SilentlyContinue
    throw "pg_dump failed"
}

Write-Host "Compressing -> $OutFile"
$inStream = [System.IO.File]::OpenRead($RawFile)
$outStream = [System.IO.File]::Create($OutFile)
$gzip = [System.IO.Compression.GZipStream]::new($outStream, [System.IO.Compression.CompressionMode]::Compress)
$inStream.CopyTo($gzip)
$gzip.Dispose()
$outStream.Dispose()
$inStream.Dispose()
Remove-Item -Force $RawFile

# Retention: delete files older than 14 days
$Cutoff = (Get-Date).AddDays(-14)
Get-ChildItem -Path $BackupDir -Filter "hms-*.sql.gz" |
    Where-Object { $_.LastWriteTime -lt $Cutoff } |
    Remove-Item -Force

Write-Host "Backup complete: $OutFile"
Write-Host ("Retention: {0} backup file(s) kept" -f (Get-ChildItem $BackupDir -Filter 'hms-*.sql.gz').Count)