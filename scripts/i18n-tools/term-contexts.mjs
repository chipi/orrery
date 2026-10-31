// Aligned contexts for one technical term: every overlay field whose en-US text uses
// the term, next to the same field in a locale. For choosing a glossary form from how
// the site already writes it, and for reading drift.
//   node scripts/i18n-tools/term-contexts.mjs <term> <loc> [max=12] [trees=science,essays,missions,fleet,programs] [seed]
// Prints a count line, then up to <max> pairs (sampled evenly, not the first N).
import fs from 'node:fs';
import path from 'node:path';

const [term, loc, maxArg = '12', treesArg = 'science,essays,missions,fleet,programs'] =
  process.argv.slice(2);
if (!term || !loc) {
  console.error('usage: term-contexts.mjs <term> <loc> [max] [trees]');
  process.exit(2);
}
const ROOT = 'i18n-src';
const walk = (d) =>
  fs.existsSync(d)
    ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(d, e.name);
        return e.isDirectory() ? walk(p) : e.name.endsWith('.json') ? [p] : [];
      })
    : [];
function leaves(o, prefix = '', out = []) {
  if (typeof o === 'string') out.push([prefix, o]);
  else if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) leaves(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}
const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const re = new RegExp(`\\b${esc}(?:s|es|ed|ing)?\\b`, 'i');

const pairs = [];
for (const tree of treesArg.split(',')) {
  for (const enFile of walk(path.join(ROOT, 'en-US', tree))) {
    const rel = path.relative(path.join(ROOT, 'en-US'), enFile);
    const locFile = path.join(ROOT, loc, rel);
    if (!fs.existsSync(locFile)) continue;
    const locLeaves = new Map(leaves(JSON.parse(fs.readFileSync(locFile, 'utf8'))));
    for (const [key, en] of leaves(JSON.parse(fs.readFileSync(enFile, 'utf8')))) {
      if (!re.test(en) || !locLeaves.has(key)) continue;
      pairs.push({ where: `${rel} :: ${key}`, en, tr: locLeaves.get(key) });
    }
  }
}
const max = Number(maxArg);
console.log(`${term} → ${loc}: ${pairs.length} aligned fields`);
const step = Math.max(1, Math.floor(pairs.length / max));
for (let i = 0, shown = 0; i < pairs.length && shown < max; i += step, shown++) {
  const p = pairs[i];
  // Trim to the sentence around the term so long paragraphs stay readable.
  const at = p.en.search(re);
  const enCut = p.en.slice(Math.max(0, at - 140), at + 160);
  console.log(`\n# ${p.where}\nEN: …${enCut}…\n${loc}: ${p.tr.slice(0, 600)}`);
}
