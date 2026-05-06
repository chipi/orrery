/**
 * Build scripts/wave23/maps/<locale>.json from tab-separated translation lines.
 * Files: scripts/wave23/tsv/<locale>.*.tsv (sorted), each line: ENGLISH\tTRANSLATION
 * ENGLISH must exactly match catalog order (scripts/wave23/catalog.json).
 *
 * Run: node scripts/wave23/build-map-from-tsv.mjs <locale>
 */
import fs from 'node:fs'
import path from 'node:path'

const locale = process.argv[2]
if (!locale) {
  console.error('Usage: node scripts/wave23/build-map-from-tsv.mjs <locale>')
  process.exit(1)
}

const catalog = JSON.parse(fs.readFileSync(path.resolve('scripts/wave23/catalog.json'), 'utf8'))
const tsvDir = path.resolve('scripts/wave23/tsv')
const files = fs
  .readdirSync(tsvDir)
  .filter((f) => f.startsWith(`${locale}.`) && f.endsWith('.tsv'))
  .sort()

if (files.length === 0) {
  console.error(`No TSV chunks for ${locale} in ${tsvDir}`)
  process.exit(1)
}

const lines = []
for (const f of files) {
  const chunk = fs.readFileSync(path.join(tsvDir, f), 'utf8').trimEnd()
  if (chunk) lines.push(...chunk.split('\n'))
}

if (lines.length !== catalog.length) {
  console.error(`Locale ${locale}: expected ${catalog.length} lines, got ${lines.length}`)
  process.exit(1)
}

/** @type {Record<string, string>} */
const map = {}
for (let i = 0; i < catalog.length; i++) {
  const line = lines[i]
  const tab = line.indexOf('\t')
  if (tab < 0) {
    console.error(`Line ${i + 1}: missing tab`)
    process.exit(1)
  }
  const en = line.slice(0, tab)
  const tr = line.slice(tab + 1)
  if (en !== catalog[i]) {
    console.error(`Line ${i + 1}: catalog mismatch`)
    console.error('Expected:', catalog[i].slice(0, 120))
    console.error('Got:     ', en.slice(0, 120))
    process.exit(1)
  }
  map[catalog[i]] = tr
}

const outDir = path.resolve('scripts/wave23/maps')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, `${locale}.json`), JSON.stringify(map, null, 2) + '\n', 'utf8')
console.error(`Wrote ${Object.keys(map).length} entries → scripts/wave23/maps/${locale}.json`)
