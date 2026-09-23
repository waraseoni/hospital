import type { NextConfig } from "next";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const VERSION_FILE = join(ROOT, "VERSION");
const PKG_FILE = join(ROOT, "package.json");

function readVersion(): string {
  if (!existsSync(VERSION_FILE)) {
    writeFileSync(VERSION_FILE, "0.0.0.0\n");
    return "0.0.0.0";
  }
  return readFileSync(VERSION_FILE, "utf8").trim();
}

function syncPackageJson(v: string) {
  const mmp = v.split(".").slice(0, 3).join(".");
  try {
    const pkg = JSON.parse(readFileSync(PKG_FILE, "utf8"));
    if (pkg.version !== mmp) {
      pkg.version = mmp;
      writeFileSync(PKG_FILE, `${JSON.stringify(pkg, null, 2)}\n`);
    }
  } catch { /* ignore */ }
}

const current = readVersion();
syncPackageJson(current.split(".").slice(0, 3).join("."));

console.log(`[version] ${current}`);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: current,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
