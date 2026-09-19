#!/usr/bin/env node
/**
 * Version Control Script — Hospital HMS
 *
 * Manages the project version in the X.Y.Z.W (0.0.0.0) format.
 * X.Y.Z follow semantic versioning; W is a build/iteration counter.
 *
 * Usage:
 *   node scripts/version.mjs patch   -> 0.1.0.1 -> 0.1.0.2
 *   node scripts/version.mjs build   -> 0.1.0.0 -> 0.1.0.1   (default)
 *   node scripts/version.mjs minor   -> 0.1.0.0 -> 0.2.0.0
 *   node scripts/version.mjs major   -> 0.1.0.0 -> 1.0.0.0
 *   node scripts/version.mjs get     -> prints current version
 *   node scripts/version.mjs tag     -> prints suggested git tag (v0.0.0.0)
 *   node scripts/version.mjs sync    -> writes X.Y.Z back into package.json
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const VERSION_FILE = join(ROOT, "VERSION");
const PKG_FILE = join(ROOT, "package.json");

const action = process.argv[2] || "build";

function readVersion() {
  if (!existsSync(VERSION_FILE)) {
    writeFileSync(VERSION_FILE, "0.0.0.0\n");
    return "0.0.0.0";
  }
  const raw = readFileSync(VERSION_FILE, "utf8").trim();
  const m = raw.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) throw new Error(`VERSION file has invalid format: "${raw}" (expected X.Y.Z.W)`);
  return raw;
}

function writeVersion(v) {
  writeFileSync(VERSION_FILE, `${v}\n`);
  console.log(`VERSION updated to ${v}`);
}

function bump(current, segment) {
  const [major, minor, patch, build] = current.split(".").map(Number);
  switch (segment) {
    case "major": return `${major + 1}.0.0.0`;
    case "minor": return `${major}.${minor + 1}.0.0`;
    case "patch": return `${major}.${minor}.${patch + 1}.0`;
    case "build": return `${major}.${minor}.${patch}.${build + 1}`;
    default: throw new Error(`Unknown segment "${segment}". Use major | minor | patch | build.`);
  }
}

function syncPackageJson(majorMinorPatch) {
  const pkg = JSON.parse(readFileSync(PKG_FILE, "utf8"));
  if (pkg.version !== majorMinorPatch) {
    pkg.version = majorMinorPatch;
    writeFileSync(PKG_FILE, `${JSON.stringify(pkg, null, 2)}\n`);
    console.log(`package.json version synced to ${majorMinorPatch}`);
  }
}

const current = readVersion();

if (action === "get") {
  console.log(current);
  process.exit(0);
}

if (action === "tag") {
  console.log(`v${current}`);
  process.exit(0);
}

if (action === "sync") {
  syncPackageJson(current.split(".").slice(0, 3).join("."));
  process.exit(0);
}

const next = bump(current, action);
writeVersion(next);
syncPackageJson(next.split(".").slice(0, 3).join("."));

console.log(`\nSuggested git commit message:`);
console.log(`  chore(release): v${next}`);
console.log(`\nTag it with:`);
console.log(`  git tag -a v${next} -m "Release v${next}"`);
console.log(`  git push origin v${next}`);