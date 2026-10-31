// Programs term round 1 (2026-10-31): adjustments to the reviewers' lists after reading them,
// and the stems their keep reasons showed. Run from the repo root:
//   node …/programs-round1-adjust.mjs <workdir>
import fs from 'node:fs';
const W = process.argv[2];
const load = (loc) => JSON.parse(fs.readFileSync(`${W}/${loc}-edits.json`, 'utf8'));
const save = (loc, e) => fs.writeFileSync(`${W}/${loc}-edits.json`, JSON.stringify(e, null, 1));
const edit = (loc, fn) => {
  const e = load(loc);
  fn(e);
  save(loc, e);
};
// nl: the site writes zwaartekrachtassist 42× (accepted) against 8 slinger forms; use it.
edit('nl', (e) => {
  for (const d of e)
    if (d.decision === 'change' && d.term === 'gravity assist')
      d.replace = d.replace.replace('zwaartekrachtsslinger', 'zwaartekrachtassist');
});
// fr: arrimer is an accepted form (only the stem missed the infinitive) — keep.
edit('fr', (e) => {
  for (const d of e)
    if (d.decision === 'change' && d.term === 'docking' && /arrimer/.test(d.find)) {
      d.decision = 'keep';
      d.why = 'variant: arrimer (stem widened; reviewer change dropped)';
      delete d.find;
      delete d.replace;
    }
});
// ar: the verb agrees with the masculine تحليق.
edit('ar', (e) => {
  const d = e.find((x) => x.decision === 'change' && x.find === 'أي مركبة عابرة');
  if (!d) throw new Error('ar cassini edit not found');
  d.find = 'لا تقدر عليه أي مركبة عابرة';
  d.replace = 'لا يقدر عليه أي تحليق قريب';
});
// image/link-target "keeps" are not reviews any more (term-match prose/isText).
for (const f of fs.readdirSync(W).filter((f) => f.endsWith('-edits.json'))) {
  const e = JSON.parse(fs.readFileSync(`${W}/${f}`, 'utf8'));
  fs.writeFileSync(
    `${W}/${f}`,
    JSON.stringify(
      e.filter((d) => !(d.decision === 'keep' && /image|link target|non-prose/i.test(d.why ?? ''))),
      null,
      1,
    ),
  );
}
const GF = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(GF, 'utf8'));
const add = (term, loc, stems) =>
  (g.term[term]._match[loc] = [...new Set([...g.term[term]._match[loc], ...stems])]);
add('docking', 'fr', ['arrim\\p{L}*']);
add('rendezvous', 'ru', ['сближ\\p{L}*']);
add('docking', 'ru', ['стыку\\p{L}*']);
add('rendezvous', 'sr-Cyrl', ['сусрећ\\p{L}*']);
add('docking', 'sr-Cyrl', ['споје\\p{L}*', 'пристајн\\p{L}* прикључ']);
add('orbit insertion', 'sr-Cyrl', ['(?:уђ|убац)\\p{L}* у орбит']);
add('docking', 'ar', ['تلتحم']);
add('orbit', 'zh-CN', ['低轨', '进入\\p{L}{1,3}轨道']);
add('orbit', 'ko', ['선회']);
add('inclination', 'ko', ['고경사']);
fs.writeFileSync(GF, JSON.stringify(g, null, 2) + '\n');
console.log('ok');
