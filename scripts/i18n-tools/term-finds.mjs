// A fix round's decisions written as text only — [{loc, term, find, replace}] — turned into
// term-apply.mjs edit files: each find is looked up among that locale's misses for the term
// (term-drift.mjs --misses output) and must occur in exactly one missed field. Saves copying
// file paths and field keys by hand while reading `term-misses.mjs show --brief`.
//   node scripts/i18n-tools/term-finds.mjs <misses.json> <finds.json> <outdir>
// Writes <outdir>/<loc>-edits.json per locale; exit 1 when a find matches no field or several.
import fs from 'node:fs';
import path from 'node:path';

const [missFile, findFile, outDir] = process.argv.slice(2);
if (!outDir) {
  console.error('usage: term-finds.mjs <misses.json> <finds.json> <outdir>');
  process.exit(2);
}
const misses = JSON.parse(fs.readFileSync(missFile, 'utf8'));
const finds = JSON.parse(fs.readFileSync(findFile, 'utf8'));
const byLoc = {};
let bad = 0;
for (const f of finds) {
  // `exact: true`: only fields whose whole text is the find (a short label that also occurs inside
  // longer fields).
  const hits = misses.filter(
    (m) =>
      m.loc === f.loc && m.term === f.term && (f.exact ? m.tr === f.find : m.tr.includes(f.find)),
  );
  // Several fields are fine when they hold the same text (a fleet tagline and its
  // best_known_for): the one decision covers them all.
  if (!hits.length || hits.some((h) => h.tr !== hits[0].tr)) {
    console.log(`${hits.length} fields: ${f.loc} ${f.term} "${f.find}"`);
    bad++;
    continue;
  }
  for (const h of hits) {
    const i = h.where.indexOf(' :: ');
    (byLoc[f.loc] ??= []).push({
      rel: h.where.slice(0, i),
      at: h.where.slice(i + 4),
      term: f.term,
      decision: 'change',
      find: f.find,
      replace: f.replace,
    });
  }
}
fs.mkdirSync(outDir, { recursive: true });
for (const [loc, edits] of Object.entries(byLoc))
  fs.writeFileSync(path.join(outDir, `${loc}-edits.json`), JSON.stringify(edits, null, 2) + '\n');
console.log(
  Object.entries(byLoc)
    .map(([l, e]) => `${l} ${e.length}`)
    .join(', ') || 'no edits',
);
process.exit(bad ? 1 : 0);
