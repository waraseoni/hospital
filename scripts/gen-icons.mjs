import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "icons");

function design({ rx }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${rx}" fill="url(#bg)"/>
  <path d="M256 96 L293.62 204.22 L408.17 206.56 L316.87 275.78 L350.05 385.44 L256 320 L161.95 385.44 L195.13 275.78 L103.83 206.56 L218.38 204.22 Z" fill="#ffffff"/>
  <path d="M242 212 H270 V242 H300 V270 H270 V300 H242 V270 H212 V242 H242 Z" fill="#dc2626"/>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop stop-color="#14b8a6"/>
      <stop offset="1" stop-color="#0f766e"/>
    </linearGradient>
  </defs>
</svg>`;
}

async function png(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

function ico(entries) {
  const ICONDIR = Buffer.alloc(6);
  ICONDIR.writeUInt16LE(0, 0);
  ICONDIR.writeUInt16LE(1, 2);
  ICONDIR.writeUInt16LE(entries.length, 4);

  const images = [];
  const dirEntries = [];
  let offset = 6 + 16 * entries.length;

  for (const { size, data } of entries) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(size >= 256 ? 0 : size, 0);
    dir.writeUInt8(0, 1);
    dir.writeUInt16LE(0, 2);
    dir.writeUInt16LE(1, 4);
    dir.writeUInt16LE(32, 6);
    dir.writeUInt32LE(data.length, 8);
    dir.writeUInt32LE(offset, 12);
    dirEntries.push(dir);
    images.push(data);
    offset += data.length;
  }

  return Buffer.concat([ICONDIR, ...dirEntries, ...images]);
}

mkdirSync(OUT, { recursive: true });

const rounded = design({ rx: 96 });
const fullBleed = design({ rx: 0 });

const icon192 = await png(rounded, 192);
const icon512 = await png(rounded, 512);
const maskable512 = await png(fullBleed, 512);
const apple180 = await png(fullBleed, 180);
const svg = Buffer.from(rounded);

writeFileSync(join(OUT, "icon-192.png"), icon192);
writeFileSync(join(OUT, "icon-512.png"), icon512);
writeFileSync(join(OUT, "icon-maskable-512.png"), maskable512);
writeFileSync(join(OUT, "apple-touch-icon.png"), apple180);
writeFileSync(join(OUT, "icon.svg"), svg);

const ico32 = await sharp(svg).resize(32, 32).png().toBuffer();
const ico48 = await sharp(svg).resize(48, 48).png().toBuffer();
writeFileSync(join(ROOT, "src", "app", "favicon.ico"), ico([{ size: 32, data: ico32 }, { size: 48, data: ico48 }]));

console.log("Icons generated:", OUT);
