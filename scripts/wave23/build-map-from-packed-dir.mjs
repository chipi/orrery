/**
 * Build scripts/wave23/maps/<locale>.json from packed JSON arrays in
 * scripts/wave23/packed/<locale>/*.json (sorted filenames: 00.json, 01.json, …).
 * Each file is a JSON array of translated strings; concatenated length must match catalog.
 *
 * Run: node scripts/wave23/build-map-from-packed-dir.mjs <locale>
 */
import fs from 'node:fs';
import path from 'node:path';

const locale = process.argv[2];
if (!locale) {
  console.error('Usage: node scripts/wave23/build-map-from-packed-dir.mjs <locale>');
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(path.resolve('scripts/wave23/catalog.json'), 'utf8'));
const dir = path.resolve('scripts/wave23/packed', locale);
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort();

const flat = [];
for (const f of files) {
  const part = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (!Array.isArray(part)) {
    console.error(`${f}: expected JSON array`);
    process.exit(1);
  }
  flat.push(...part);
}

if (flat.length !== catalog.length) {
  console.error(`Locale ${locale}: expected ${catalog.length} strings, got ${flat.length}`);
  process.exit(1);
}

/** @type {Record<string, string>} */
const map = {};
for (let i = 0; i < catalog.length; i++) map[catalog[i]] = flat[i];

const outDir = path.resolve('scripts/wave23/maps');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `${locale}.json`), JSON.stringify(map, null, 2) + '\n', 'utf8');
console.error(`Wrote ${catalog.length} entries → scripts/wave23/maps/${locale}.json`);
