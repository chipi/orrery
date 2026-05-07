/**
 * Build scripts/wave23/maps/{zh-CN,ja,ko,hi,ar,ru}.json from combined chunk files:
 *   scripts/wave23/packed-lines/combined/chunk-NN.txt  (NN = 01 .. N, zero-padded)
 *
 * Each file:
 *   ===zh-CN===
 *   (expectLines translations, one per line)
 *   ===ja===
 *   ...
 *   ===ru===
 *
 * Run: node scripts/wave23/build-maps-from-combined-chunks.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const LOCALES = ['zh-CN', 'ja', 'ko', 'hi', 'ar', 'ru'];
const CHUNK = 25;
const catalog = JSON.parse(fs.readFileSync(path.resolve('scripts/wave23/catalog.json'), 'utf8'));
const n = catalog.length;
const numFull = Math.floor(n / CHUNK);
const rem = n % CHUNK;
const numChunks = rem === 0 ? numFull : numFull + 1;

const combinedDir = path.resolve('scripts/wave23/packed-lines/combined');
const files = fs
  .readdirSync(combinedDir)
  .filter((f) => /^chunk-\d+\.txt$/.test(f))
  .sort((a, b) => Number(a.match(/\d+/)?.[0] ?? 0) - Number(b.match(/\d+/)?.[0] ?? 0));

if (files.length !== numChunks) {
  console.error(
    `Expected ${numChunks} chunk-NN.txt files in ${combinedDir}, found ${files.length}`,
  );
  process.exit(1);
}

/** @type {Record<string, string[]>} */
const buffers = Object.fromEntries(LOCALES.map((l) => [l, []]));

for (let ci = 0; ci < numChunks; ci++) {
  const expectLines = ci < numFull ? CHUNK : rem;
  const raw = fs.readFileSync(path.join(combinedDir, files[ci]), 'utf8').replace(/\r\n/g, '\n');
  const lines = raw.split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();

  let idx = 0;
  for (const loc of LOCALES) {
    const hdr = `===${loc}===`;
    if (lines[idx] !== hdr) {
      console.error(
        `${files[ci]}: expected "${hdr}" at line ${idx + 1}, got ${JSON.stringify(lines[idx])}`,
      );
      process.exit(1);
    }
    idx++;
    for (let j = 0; j < expectLines; j++) {
      if (idx >= lines.length) {
        console.error(`${files[ci]} ${loc}: missing line ${j + 1}/${expectLines}`);
        process.exit(1);
      }
      buffers[loc].push(lines[idx++]);
    }
  }
  if (idx !== lines.length) {
    console.error(`${files[ci]}: extra lines after ${LOCALES[LOCALES.length - 1]} section`);
    process.exit(1);
  }
}

for (const loc of LOCALES) {
  if (buffers[loc].length !== n) {
    console.error(`${loc}: expected ${n} lines, got ${buffers[loc].length}`);
    process.exit(1);
  }
}

const outDir = path.resolve('scripts/wave23/maps');
fs.mkdirSync(outDir, { recursive: true });
for (const loc of LOCALES) {
  /** @type {Record<string, string>} */
  const map = {};
  for (let i = 0; i < n; i++) map[catalog[i]] = buffers[loc][i];
  fs.writeFileSync(path.join(outDir, `${loc}.json`), JSON.stringify(map, null, 2) + '\n', 'utf8');
  console.error(`Wrote scripts/wave23/maps/${loc}.json (${n} entries)`);
}
