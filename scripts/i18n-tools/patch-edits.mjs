// Hand corrections on top of generated edits: rows "<rel>\t<from>\t<to>" (rel without
// .json, as showdiff prints it) are applied to the matching edit's NEW text; each `from`
// must occur exactly once in it. An optional 4th column names the field, for a file where
// two fields carry the same text. Unmatched rows are reported, so a correction never
// silently stops applying when the generator changes.
//   node scripts/i18n-tools/patch-edits.mjs <edits.json> <corrections.tsv>
import fs from 'node:fs';

const [editsFile, tsv] = process.argv.slice(2);
const edits = JSON.parse(fs.readFileSync(editsFile, 'utf8'));
const rows = fs
  .readFileSync(tsv, 'utf8')
  .split('\n')
  .filter((l) => l.trim() && !l.startsWith('#'))
  .map((l) => l.split('\t'));
let applied = 0;
const missed = [];
for (const [rel, from, to, at] of rows) {
  const hits = edits.filter(
    (e) =>
      e.rel.replace(/\.json$/, '') === rel &&
      (at === undefined || e.at === at) &&
      e.new.split(from).length === 2,
  );
  if (hits.length !== 1) {
    missed.push(`${rel}: "${from}" (${hits.length} matches)`);
    continue;
  }
  hits[0].new = hits[0].new.replace(from, () => to);
  applied += 1;
}
fs.writeFileSync(editsFile, JSON.stringify(edits, null, 1) + '\n');
console.log(`patched ${applied}/${rows.length}`);
if (missed.length) console.log(missed.join('\n'));
