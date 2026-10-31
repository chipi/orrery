// Missions term round 1 (2026-10-31): adjustments after reading the eight reviewers' lists,
// the nl gravity-assist binding change, and the stems the keep reasons showed.
//   node …/missions-round1-adjust.mjs <workdir>
import fs from 'node:fs';
const W = process.argv[2];
const load = (loc) => JSON.parse(fs.readFileSync(`${W}/${loc}-edits.json`, 'utf8'));
const save = (loc, e) => fs.writeFileSync(`${W}/${loc}-edits.json`, JSON.stringify(e, null, 1));
const edit = (loc, fn) => {
  const e = load(loc);
  fn(e);
  save(loc, e);
};
const one = (e, pred, what) => {
  const d = e.find((x) => x.decision === 'change' && pred(x));
  if (!d) throw new Error(`not found: ${what}`);
  return d;
};
// hi: the burn noun is दहन (221× on the site, the sourced binding); the reviewer used प्रज्वलन.
// Both are masculine, so agreement is unchanged. The verb प्रज्वलित stays (accepted).
edit('hi', (e) => {
  for (const d of e)
    if (d.decision === 'change' && d.term === 'burn')
      d.replace = d.replace.replaceAll('प्रज्वलनों', 'दहनों').replaceAll('प्रज्वलन', 'दहन');
});
// nl: zwaartekrachtassist is the site majority (and now the binding); keep case.
edit('nl', (e) => {
  for (const d of e)
    if (d.decision === 'change')
      d.replace = d.replace
        .replaceAll('zwaartekrachtsslinger', 'zwaartekrachtassist')
        .replaceAll('ZWAARTEKRACHTSSLINGER', 'ZWAARTEKRACHTASSIST');
  const s = one(
    e,
    (x) => x.rel === 'missions/mars/schiaparelli.json' && x.at === 'type',
    'nl schiaparelli',
  );
  s.find = 'ENTRY/DESCENT/LANDING DEMONSTRATOR · CRASHED';
  s.replace = 'DEMONSTRATOR VOOR INTREDE, AFDALING EN LANDING · NEERGESTORT';
});
// ko: 궤도 수정 (trajectory correction) and 자유복귀 궤도 (free return) are standard compounds.
edit('ko', (e) => {
  for (const d of e)
    if (
      d.decision === 'change' &&
      d.term === 'trajectory' &&
      /궤도 수정|자유복귀 궤도/.test(d.find)
    ) {
      d.decision = 'keep';
      d.why = 'variant: standard compound (reviewer change dropped)';
      delete d.find;
      delete d.replace;
    }
});
// sr: fix the misspelt label as a whole (ПАЛЕЊЕ → ПАЉЕЊЕ), not only the English "(BURN 1)".
edit('sr-Cyrl', (e) => {
  const d = one(e, (x) => x.find === ' (BURN 1)', 'sr mangalyaan');
  d.find = 'ПАЛЕЊЕ У ПЕРИГЕЈУ (BURN 1)';
  d.replace = 'ПАЉЕЊЕ У ПЕРИГЕЈУ 1';
});
// ar: مدتها referred to the feminine حرقة; with إشعال the phrase is rewritten (English
// "RCS-thruster" left in the text, too).
edit('ar', (e) => {
  const d = one(e, (x) => x.find === 'حرقة', 'ar akatsuki');
  d.find = 'حرقة RCS-thruster مدتها 1228 ثانية';
  d.replace = 'إشعال دافعات RCS لمدة 1228 ثانية';
});
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
g.term['gravity assist'].nl = 'zwaartekrachtassist';
g.sources['term:gravity assist:nl'] =
  'site majority zwaartekrachtassist (42+) over zwaartekrachtslinger; ESA NL uses both; binding changed 2026-10-31 after reviewers kept re-introducing the minority form';
add('entry', 'ar', ['العودة لل?غلاف الجوي', 'دخل\\p{L}* (?:\\S+ ){0,3}الغلاف الجوي']);
add('orbit insertion', 'es', ['inserción \\p{L}+ en (?:la )?órbita']);
add('orbit insertion', 'fr', ['insertion \\p{L}+ en orbite']);
add('descent', 'hi', ['अवरोही']);
add('orbit insertion', 'it', ["inserimento nell'orbita", 'inseriment\\p{L}* in orbita']);
add('orbit insertion', 'ja', ['軌道への投入', '軌道投入']);
add('flyby', 'ko', ['근접 ?위성 ?비행']);
add('inclination', 'ko', ['궤도 ?경사']);
add('trajectory', 'ko', ['궤도 ?수정', '자유 ?복귀 ?궤도', '자유 ?귀환 ?궤도']);
add('orbit', 'nl', ['(?<!\\p{L})(?:aarde?|maan|mars)ba(?:an|nen)\\p{L}*']);
add('orbit insertion', 'nl', ['baaninvoe\\p{L}*', 'baanopname']);
add('booster', 'pt-BR', ['foguetes? laterais']);
add('docking', 'pt-BR', ['atracag\\p{L}*']);
add('orbit insertion', 'pt-BR', ['inserção na órbita']);
add('burn', 'ru', ['включени\\p{L}* (?:\\p{L}+ )?двигател']);
add('orbit insertion', 'ru', [
  'вы(?:шел|шла|шли|ходит) на (?:\\p{L}+ )?орбит',
  'захват\\p{L}* (?:\\p{L}+ )?орбит',
  'захват\\p{L}* на орбит',
]);
add('burn', 'sr-Cyrl', ['рад\\p{L}* (?:\\p{L}+ )?мотора']);
add('descent', 'sr-Cyrl', ['спуштајућ\\p{L}*']);
add('docking', 'sr-Cyrl', ['спојио', 'спојил\\p{L}*']);
add('entry', 'sr-Cyrl', ['поврат\\p{L}* кроз атмосфер']);
add('orbit insertion', 'sr-Cyrl', ['ула\\p{L}* у (?:\\p{L}+ )?орбит']);
add('orbit insertion', 'zh-CN', ['入\\p{L}{1,3}轨道', '进入.{1,12}轨道']);
add('orbit', 'zh-CN', ['绕\\p{L}{0,6}运行', '绕轨', '高轨']);
add('orbit insertion', 'de', ['Einschwu\\p{L}*']);
fs.writeFileSync(GF, JSON.stringify(g, null, 2) + '\n');
console.log('ok');
