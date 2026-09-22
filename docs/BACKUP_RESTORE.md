# Backup & Restore — Hospital HMS

Database **Supabase (PostgreSQL)** hai. Is process se schema + data dono safe rehte hain. Sab **FREE + FOSS** tools hain (`pg_dump`, `psql`, Supabase CLI).

## 1. Environment Secrets

`.env.local` (ya deployment env) mein:

| Variable | Kahan | Kya |
|---|---|---|
| `SUPABASE_DB_URL` | `.env.local` | `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres` (Supabase Dashboard → Project Settings → Database → Connection string → **Transaction / Session pooler**) |
| `SUPABASE_ACCESS_TOKEN` | `.env.local` | Supabase CLI ke liye — personal access token (Dashboard → Account → Access Tokens) |

## 2. Automated Backup (scripts/backup.ps1)

Full DB dump (schema + data) local folder mein timestamped `.sql.gz`:

```powershell
$env:SUPABASE_DB_URL = "postgresql://..."
.\scripts\backup.ps1
```

Hoti kya hai:
- `pg_dump` se full dump → `backups/hms-YYYY-MM-DD_HHMMSS.sql.gz`
- 14 din purani files auto-delete (retention)

> Windows par `pg_dump` PostgreSQL bin folder se aata hai — `PATH` mein add karo ya script mein `$PgDumpBin` set karo.

## 3. Manually — Supabase CLI

```bash
# Schema + data dump (project neeta)
npx supabase db dump --db-url "$SUPABASE_DB_URL" -f backups/manual_backup.sql
gzip backups/manual_backup.sql

# Storage buckets ke binary deps ke liye alag snapshot (optional)
#   SQL backup mein storage objects NAHI aate — buckets separately note karo
```

## 4. Restore

**Important:** restore se pehle `supabase/schema.sql` (idempotent full schema) up-to-date hona chahiye.

```powershell
# 1. Full schema banao (nayi DB par)
psql "$SUPABASE_DB_URL" -f supabase\schema.sql

# 2. Data restore
gunzip -k backups\latest.sql.gz
psql "$SUPABASE_DB_URL" -f backups\latest.sql
```

Ya ek saath:

```powershell
.\scripts\restore.ps1 -File backups\hms-2026-01-01_120000.sql.gz
```

## 5. Storage Buckets

Bina SQL ke bhi buckets ka data jalata hai. `INSERT INTO storage.buckets` schema.sql mein hai — restore ke baad manual upload karo ya bucket arrays alag save karo. Yahan har bucket ka purpose note rakho:

| Bucket | Access | Content |
|---|---|---|
| `prescriptions`, `lab-reports`, `invoices` | private (auth) | patient PDFs |
| `scans` | private (med staff) | uploaded scans/DICOM |
| `avatars`, `signatures` | public | avatars + doctor e-signatures |
| `certificates` | private | medical certificates |