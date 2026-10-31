// Turn term-drift misses into per-locale review work files for a term fix round.
//   node scripts/i18n-tools/term-drift.mjs --trees=essays --misses=/tmp/m.json
//   node scripts/i18n-tools/term-workfile.mjs /tmp/m.json <outdir> [--max=150]
// Writes <outdir>/<loc>.json (or <loc>-1.json, <loc>-2.json … over --max fields): one
// entry per field, with every flagged term's sense, binding form and accepted stems —
// the input the fix brief (.claude/skills/term-consistency/fix-brief.md) describes.
import fs from 'node:fs';
import path from 'node:path';

const [missesFile, outDir] = process.argv.slice(2);
const maxArg = process.argv.find((a) => a.startsWith('--max='));
const MAX = maxArg ? Number(maxArg.slice(6)) : 150;
if (!missesFile || !outDir) {
  console.error('usage: term-workfile.mjs <misses.json> <outdir> [--max=150]');
  process.exit(2);
}
const TERMS = JSON.parse(fs.readFileSync('scripts/i18n-tools/native-terms.json', 'utf8')).term;
const byLoc = new Map();
for (const m of JSON.parse(fs.readFileSync(missesFile, 'utf8'))) {
  const [rel, at] = m.where.split(' :: ');
  const fields = byLoc.get(m.loc) ?? new Map();
  byLoc.set(m.loc, fields);
  const f = fields.get(m.where) ?? { rel, at, en: m.en, current: m.tr, terms: [] };
  fields.set(m.where, f);
  const e = TERMS[m.term];
  f.terms.push({
    term: m.term,
    sense: e._sense,
    binding: e[m.loc],
    accepted_stems: e._match[m.loc],
    ...(m.staleKeep ? { earlier_keep_reason: m.staleKeep } : {}),
  });
}
fs.mkdirSync(outDir, { recursive: true });
for (const [loc, fields] of byLoc) {
  const all = [...fields.values()];
  const parts = Math.ceil(all.length / MAX);
  for (let i = 0; i < parts; i++) {
    const name = parts === 1 ? `${loc}.json` : `${loc}-${i + 1}.json`;
    fs.writeFileSync(
      path.join(outDir, name),
      JSON.stringify(all.slice(i * MAX, (i + 1) * MAX), null, 1),
    );
  }
  console.log(`${loc}: ${all.length} fields in ${parts} file(s)`);
}
