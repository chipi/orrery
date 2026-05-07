/**
 * Build scripts/wave23/maps/<locale>.json from newline-separated translations in
 * scripts/wave23/packed-lines/<locale>/*.txt (sorted). One translation per line;
 * blank lines are ignored. Total non-blank lines must equal catalog length.
 *
 * Run: node scripts/wave23/build-map-from-lines-dir.mjs <locale>
 */
import fs from 'node:fs';
import path from 'node:path';

const locale = process.argv[2];
if (!locale) {
  console.error('Usage: node scripts/wave23/build-map-from-lines-dir.mjs <locale>');
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(path.resolve('scripts/wave23/catalog.json'), 'utf8'));
const dir = path.resolve('scripts/wave23/packed-lines', locale);
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.txt'))
  .sort();

const lines = [];
for (const f of files) {
  const chunk = fs.readFileSync(path.join(dir, f), 'utf8');
  const ls = chunk.replace(/\r\n/g, '\n').split('\n');
  if (ls.length && ls[ls.length - 1] === '') ls.pop();
  lines.push(...ls);
}

if (lines.length !== catalog.length) {
  console.error(`Locale ${locale}: expected ${catalog.length} lines, got ${lines.length}`);
  process.exit(1);
}

/** @type {Record<string, string>} */
const map = {};
for (let i = 0; i < catalog.length; i++) map[catalog[i]] = lines[i];

const outDir = path.resolve('scripts/wave23/maps');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, `${locale}.json`), JSON.stringify(map, null, 2) + '\n', 'utf8');
console.error(`Wrote ${catalog.length} entries → scripts/wave23/maps/${locale}.json`);
