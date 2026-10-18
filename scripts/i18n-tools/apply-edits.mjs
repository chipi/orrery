// Apply reviewed edits [{rel, at, old, new}] for one locale; every new string must pass problems().
// rel "messages" is the UI bundle messages/<loc>.json (flat keys); any other rel is an
// overlay under i18n-src/<loc>/.
import fs from 'node:fs';
import { writeJsonEdits } from '../lib/json-surgical.mjs';
import { problems } from '../lib/translate-quality.mjs';
const [loc, file] = process.argv.slice(2);
const edits = JSON.parse(fs.readFileSync(file, 'utf8'));
const isMessages = (rel) => rel === 'messages';
const target = (rel, l) => (isMessages(rel) ? `messages/${l}.json` : `i18n-src/${l}/${rel}`);
const byFile = new Map();
const bad = [];
for (const e of edits) {
  const en = (() => {
    try {
      const doc = JSON.parse(fs.readFileSync(target(e.rel, 'en-US'), 'utf8'));
      if (isMessages(e.rel)) return doc[e.at];
      return e.at.split('.').reduce((a, k) => a?.[/^\d+$/.test(k) ? +k : k], doc);
    } catch {
      return '';
    }
  })();
  const before = new Set(problems(loc, en, e.old));
  const after = problems(loc, en, e.new).filter((p) => !before.has(p));
  if (after.length) {
    bad.push(`${e.rel}:${e.at} — ${after.join('; ').slice(0, 160)}`);
    continue;
  }
  (byFile.get(e.rel) ?? byFile.set(e.rel, []).get(e.rel)).push({ at: e.at, old: e.old, nu: e.new });
}
let n = 0,
  skipped = 0;
for (const [rel, es] of byFile) {
  const r = writeJsonEdits(target(rel, loc), es, { flat: isMessages(rel) });
  n += r.applied;
  skipped += r?.skipped?.length ?? 0;
}
console.log(
  `${loc}: applied ${n} in ${byFile.size} files; skipped ${skipped}; refused ${bad.length}`,
);
if (bad.length) console.log(bad.slice(0, 30).join('\n'));
