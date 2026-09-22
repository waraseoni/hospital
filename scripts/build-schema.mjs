#!/usr/bin/env node
/**
 * Full Schema Builder — Hospital HMS
 *
 * Concatenates every SQL file in supabase/migrations/ (sorted by filename)
 * into a single idempotent full-schema file at supabase/schema.sql.
 *
 * Run after every new migration:
 *   npm run schema
 *
 * Usage:
 *   node scripts/build-schema.mjs
 *   node scripts/build-schema.mjs --check   # exit 1 if schema.sql is stale
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");
const OUT_FILE = join(ROOT, "supabase", "schema.sql");

const checkOnly = process.argv.includes("--check");

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.toLowerCase().endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b, "en"));

if (files.length === 0) {
  console.error("No migration SQL files found in supabase/migrations/");
  process.exit(1);
}

// Pre-scan every migration for CREATE TYPE ... AS ENUM definitions across the
// whole set. A type defined more than once (e.g. payment_method gains 'other'
// in a later migration) must be created with the LAST definition's labels and
// followed by ALTER ... ADD VALUE lines at the end of the file so databases
// provisioned before the label existed pick it up too.
const typeDefs = [];
const typeRe = /CREATE TYPE\s+(\w+)\s+AS\s+ENUM\s*\(([\s\S]*?)\)\s*;/gi;
for (const name of files) {
  const raw = readFileSync(join(MIGRATIONS_DIR, name), "utf8").replace(/\r\n/g, "\n");
  let tm;
  while ((tm = typeRe.exec(raw)) !== null) {
    typeDefs.push({ name: tm[1], values: tm[2] });
  }
}

const enumLastValues = new Map();
for (const d of typeDefs) {
  enumLastValues.set(d.name.toLowerCase(), d.values); // last wins
}
const multiDefined = new Set();
{
  const seen = new Set();
  for (const d of typeDefs) {
    const k = d.name.toLowerCase();
    if (seen.has(k)) multiDefined.add(k);
    seen.add(k);
  }
}

/**
 * Rewrite a single migration body so it can re-run on an already-provisioned DB.
 * Does NOT edit source files — only the generated supabase/schema.sql output.
 */
function makeIdempotent(sql) {
  let out = sql;

  // --- CREATE TYPE ... AS ENUM (...)
  // Wrap in DO block; if type already exists, skip. Use the LAST definition's
  // values so a fresh create includes every label (e.g. payment_method.other).
  out = out.replace(
    /CREATE TYPE\s+(\w+)\s+AS\s+ENUM\s*\(([\s\S]*?)\)\s*;/gi,
    (_m, name, values) => {
      const full = (enumLastValues.get(name.toLowerCase()) || values).trim();
      return [
        `DO $$`,
        `BEGIN`,
        `  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name.toLowerCase()}') THEN`,
        `    CREATE TYPE ${name} AS ENUM (${full});`,
        `  END IF;`,
        `EXCEPTION WHEN duplicate_object THEN NULL;`,
        `END $$;`,
      ].join("\n");
    }
  );

  // --- CREATE TABLE -> IF NOT EXISTS
  out = out.replace(/CREATE TABLE(?! IF NOT EXISTS)\s+/gi, "CREATE TABLE IF NOT EXISTS ");

  // --- CREATE [UNIQUE] INDEX -> IF NOT EXISTS
  out = out.replace(
    /CREATE(\s+UNIQUE)?\s+INDEX(?! IF NOT EXISTS)\s+/gi,
    "CREATE$1 INDEX IF NOT EXISTS "
  );

  // --- CREATE TRIGGER: prepend DROP TRIGGER IF EXISTS <name> ON <table>;
  out = out.replace(
    /CREATE TRIGGER\s+(\w+)((?:(?!;)[\s\S])*?);/g,
    (m, name, rest) => {
      const onMatch = rest.match(/\bON\s+([A-Za-z_][\w."]*)/i);
      if (!onMatch) return m;
      return `DROP TRIGGER IF EXISTS ${name} ON ${onMatch[1]};\nCREATE TRIGGER ${name}${rest};`;
    }
  );

  // --- CREATE POLICY: prepend DROP POLICY IF EXISTS <name> ON <table>;
  out = out.replace(
    /CREATE POLICY\s+("(?:[^"]+)"|\w+)\s+ON\s+([A-Za-z_][\w.]*)/gi,
    (_m, policy, table) =>
      `DROP POLICY IF EXISTS ${policy} ON ${table};\nCREATE POLICY ${policy} ON ${table}`
  );

  // --- ALTER TABLE ... ADD COLUMN -> IF NOT EXISTS
  out = out.replace(/\bADD COLUMN(?! IF NOT EXISTS)\s+/gi, "ADD COLUMN IF NOT EXISTS ");

  // --- seed: storage.buckets
  out = out.replace(
    /(INSERT INTO storage\.buckets\b[\s\S]*?);/i,
    (_m, stmt) => `${stmt} ON CONFLICT (id) DO NOTHING;`
  );

  // --- seed: settings default row (single-row table)
  out = out.replace(
    /INSERT INTO settings \(hospital_name\) VALUES \('Hospital Management System'\);/i,
    `INSERT INTO settings (hospital_name)\nSELECT 'Hospital Management System'\nWHERE NOT EXISTS (SELECT 1 FROM settings);`
  );

  return out;
}

const sections = files.map((name) => {
  const raw = readFileSync(join(MIGRATIONS_DIR, name), "utf8").replace(/\r\n/g, "\n");
  const body = makeIdempotent(raw.replace(/\s+$/, ""));
  return [
    `-- ---------------------------------------------------------------------------`,
    `-- migration: ${name}`,
    `-- ---------------------------------------------------------------------------`,
    body,
    "",
  ].join("\n");
});

const body = sections.join("\n");

// --- Ensure evolved enum labels exist (multi-defined types, e.g. payment_method)
// Emitted once, AFTER all sections, so older databases that were provisioned
// before the label existed still get every label. IF NOT EXISTS makes this a
// no-op on databases that already have them.
const enumAlters = [];
for (const d of typeDefs) {
  const k = d.name.toLowerCase();
  if (!multiDefined.has(k)) continue;
  const labels = [...(enumLastValues.get(k) || "").matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1]);
  for (const label of labels) {
    enumAlters.push(`ALTER TYPE ${d.name} ADD VALUE IF NOT EXISTS '${label}';`);
  }
}
const evolvedBlock =
  enumAlters.length > 0
    ? `-- Ensure evolved enum labels exist\n${[...new Set(enumAlters)].join("\n")}\n\n`
    : "";

const contentHash = createHash("sha256")
  .update(files.join("\n") + "\n" + body)
  .digest("hex")
  .slice(0, 16);

const header = [
  "-- =============================================================================",
  "-- Hospital HMS — Full Idempotent Schema",
  "-- =============================================================================",
  "-- AUTO-GENERATED by scripts/build-schema.mjs — DO NOT EDIT BY HAND.",
  `-- Source: supabase/migrations/ (${files.length} files, sorted by name)`,
  `-- Content-Hash: ${contentHash}`,
  "--",
  "-- Re-run after every new migration:",
  "--   npm run schema",
  "--",
  "-- Apply to a fresh database:",
  "--   psql \"$DATABASE_URL\" -f supabase/schema.sql",
  "--   (or via Supabase SQL editor)",
  "--",
  "-- Migrations are ordered and written to be re-runnable (IF NOT EXISTS /",
  "-- DROP ... IF EXISTS guards) so this file can be applied more than once.",
  "-- =============================================================================",
  "",
].join("\n");

const output = `${header}\n${body}\n${evolvedBlock}`;

if (checkOnly) {
  if (!existsSync(OUT_FILE) || readFileSync(OUT_FILE, "utf8") !== output) {
    console.error("supabase/schema.sql is stale. Run: npm run schema");
    process.exit(1);
  }
  console.log("supabase/schema.sql is up to date.");
  process.exit(0);
}

writeFileSync(OUT_FILE, output, "utf8");
console.log(`Wrote supabase/schema.sql (${files.length} migrations, hash ${contentHash}, ${output.length} bytes)`);
