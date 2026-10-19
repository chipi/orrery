import fs from 'node:fs';
const D = process.argv[2];
const LOCS = [
  'ru',
  'ja',
  'zh-CN',
  'ko',
  'hi',
  'ar',
  'sr-Cyrl',
  'de',
  'fr',
  'es',
  'it',
  'nl',
  'pt-BR',
];
let TB = 0,
  TM = 0,
  TN = 0;
const fail = [];
for (const l of LOCS) {
  const j = JSON.parse(fs.readFileSync(`${D}/graded-${l}.json`, 'utf8'));
  const md = fs.readFileSync(`${D}/${l}.md`, 'utf8');
  const refs = new Set([...md.matchAll(/^### \S+ `([^`]+)`/gm)].map((m) => m[1]));
  let n = 0,
    b = 0,
    mi = 0;
  for (const [seg, s] of Object.entries(j.segments)) {
    n += s.sampled;
    b += s.broken;
    mi += s.minor;
    if (s.sampled && (s.broken / s.sampled >= 0.2 || (s.broken + s.minor) / s.sampled >= 0.5))
      fail.push(`${l} | ${seg} (${s.broken}/${s.broken + s.minor}/${s.sampled})`);
  }
  const badKeys = j.findings.filter((f) => !refs.has(f.key)).length,
    noFix = j.findings.filter((f) => !f.fix).length;
  const fb = j.findings.filter((f) => f.grade === 'BROKEN').length,
    fm = j.findings.filter((f) => f.grade === 'MINOR').length;
  TB += b;
  TM += mi;
  TN += n;
  console.log(
    `${l.padEnd(6)} locale=${j.locale === l ? 'ok' : j.locale} n=${n} broken=${b} (${((100 * b) / n).toFixed(1)}%) minor=${mi} findings B/M=${fb}/${fm} keys-not-in-sample=${badKeys} no-fix=${noFix}`,
  );
}
console.log(
  `TOTAL n=${TN} broken=${TB} (${((100 * TB) / TN).toFixed(1)}%) broken+minor=${((100 * (TB + TM)) / TN).toFixed(1)}%`,
);
console.log('FAILING CELLS:\n' + (fail.join('\n') || 'none'));
