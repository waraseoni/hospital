#!/usr/bin/env node
/**
 * Auto-tag script — creates a git tag from current VERSION
 *
 * Usage:
 *   node scripts/auto-tag.mjs          — tag current version
 *   node scripts/auto-tag.mjs --push   — tag and push to origin
 */

import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const ROOT = process.cwd();
const VERSION_FILE = join(ROOT, "VERSION");
const shouldPush = process.argv.includes("--push");

function readVersion() {
  if (!existsSync(VERSION_FILE)) return "0.0.0.0";
  return readFileSync(VERSION_FILE, "utf8").trim();
}

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", cwd: ROOT }).trim();
  } catch {
    return null;
  }
}

const version = readVersion();
const tag = `v${version}`;

// Check if tag already exists
const existingTag = run(`git tag -l "${tag}"`);
if (existingTag === tag) {
  console.log(`Tag ${tag} already exists. Bump version first.`);
  process.exit(1);
}

// Create annotated tag
run(`git tag -a ${tag} -m "Release ${tag}"`);
console.log(`Created tag: ${tag}`);

if (shouldPush) {
  run(`git push origin ${tag}`);
  console.log(`Pushed tag ${tag} to origin`);
} else {
  console.log(`\nTo push: git push origin ${tag}`);
}
