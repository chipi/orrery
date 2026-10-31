// Essays term round 1 (2026-10-31): adjustments to the four reviewers' edit lists after
// reading them, plus the stem additions their keep reasons showed. Run from the repo root
// on the work folder:  node …/essays-round1-adjust.mjs <workdir>
// The reviewer lists (as adjusted) are copied to essays-round1-decisions/ afterwards.
import fs from 'node:fs';
const W = process.argv[2];
const load = (loc) => JSON.parse(fs.readFileSync(`${W}/${loc}-edits.json`, 'utf8'));
const save = (loc, e) => fs.writeFileSync(`${W}/${loc}-edits.json`, JSON.stringify(e, null, 1));
const drop = (loc, pred, why) => {
  const e = load(loc);
  let n = 0;
  for (const d of e)
    if (d.decision === 'change' && pred(d)) {
      d.decision = 'keep';
      d.why = `${why} (reviewer change dropped)`;
      delete d.find;
      delete d.replace;
      n++;
    }
  save(loc, e);
  return n;
};
const set = (loc, pred, replace) => {
  const e = load(loc);
  const d = e.find((x) => x.decision === 'change' && pred(x));
  if (!d) throw new Error(`${loc}: edit not found`);
  d.replace = replace;
  save(loc, e);
};
const NP5 = (d) =>
  d.rel === 'essays/new-propulsion.json' && d.at === 'body.5.md' && d.term === 'burn';
const COMB = 'chemical burn = combustion here';
const counts = {
  // "no chemical burn could reach": combustion is right; the sr thrust rewrite stays.
  de: drop('de', (d) => NP5(d) && d.find === 'kein chemischer Brennvorgang', COMB),
  es: drop('es', NP5, COMB),
  nl: drop('nl', NP5, COMB),
  ar: drop('ar', NP5, COMB),
  sr: drop('sr-Cyrl', (d) => NP5(d) && d.find.includes('хемијско'), COMB),
  // zh: 轨道 is the standard word in these compounds; accepted as variants below.
  zh: drop(
    'zh-CN',
    (d) => d.term === 'trajectory' && /自由返回轨道|中止轨道|双曲线轨道|轨道修正/.test(d.find),
    'standard compound with 轨道',
  ),
  ko: drop(
    'ko',
    (d) => d.term === 'trajectory' && d.find === '탈출 궤도',
    'standard term 탈출 궤도',
  ),
};
set('de', (d) => d.find === 'während des Brennens', 'während der Brennphase');
set('nl', (d) => d.find === 'het meeste drijfgas', 'de meeste drijfstof');
console.log('dropped', counts);

// Keeps that were not reviews: image paths and English link targets are no longer read
// as text (term-match prose/isText), so those fields are not misses any more.
for (const f of fs.readdirSync(W).filter((f) => f.endsWith('-edits.json'))) {
  const e = JSON.parse(fs.readFileSync(`${W}/${f}`, 'utf8'));
  const kept = e.filter(
    (d) => !(d.decision === 'keep' && /image|link target|non-prose/i.test(d.why ?? '')),
  );
  fs.writeFileSync(`${W}/${f}`, JSON.stringify(kept, null, 1));
}

const GF = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(GF, 'utf8'));
const add = (term, loc, stems) =>
  (g.term[term]._match[loc] = [...new Set([...g.term[term]._match[loc], ...stems])]);
add('trajectory', 'zh-CN', ['(?:自由返回|中止|双曲线?|转移|逃逸)轨道', '轨道修正', '中途修正']);
add('trajectory', 'ko', ['탈출 궤도']);
add('payload', 'ru', ['полезн\\p{L}* груз']);
add('orbit insertion', 'sr-Cyrl', ['улас\\p{L}* у орбит']);
add('orbit insertion', 'ko', ['궤도에 진입']);
add('orbit', 'zh-CN', ['在轨']);
add('stage', 'de', ['\\p{L}*stufig\\p{L}*']);
add('stage', 'nl', ['(?<!\\p{L})(?:een|twee|drie)traps\\p{L}*']);
add('stage', 'ar', ['مرحلت\\p{L}*']);
add('orbit', 'ar', ['تدور', 'دارت']);
add('rendezvous', 'es', ['encontrarse']);
add('orbit insertion', 'fr', ['mise en orbite']);
add('orbit insertion', 'it', ['immissione in orbita']);
add('stage', 'ko', ['(?:^|[\\s0-9(])단에도']);
fs.writeFileSync(GF, JSON.stringify(g, null, 2) + '\n');
console.log('stems added');
