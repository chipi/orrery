// Read-only: for every translated overlay line in fleet/ and missions/ (13 locales), which
// run last wrote it? Buckets by commit date/kind. Output: per locale × tree, % of text lines.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const R = '/work/orrery/main';
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
const TREES = (process.argv[2] ?? 'fleet,missions').split(',');
const bucket = (date) => {
  if (date < '2026-07-14') return 'A initial (May–Jul 13)';
  if (date === '2026-07-14') return 'B fact-check retranslation (Jul 14)';
  if (date < '2026-10-17') return 'C later content (Jul 15–Oct 16)';
  if (date < '2026-10-31') return 'D cleanup passes (Oct 17–30)';
  return 'E term rounds (Oct 31)';
};
const walk = (d) =>
  fs.existsSync(d)
    ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(d, e.name);
        return e.isDirectory() ? walk(p) : e.name.endsWith('.json') ? [p] : [];
      })
    : [];
const out = {};
for (const loc of LOCS)
  for (const tree of TREES) {
    const counts = {};
    for (const f of walk(`${R}/i18n-src/${loc}/${tree}`)) {
      const rel = path.relative(R, f);
      const txt = execFileSync('git', ['blame', '--line-porcelain', '--', rel], {
        cwd: R,
        encoding: 'utf8',
        maxBuffer: 1 << 26,
      });
      let date = '';
      for (const line of txt.split('\n')) {
        if (line.startsWith('committer-time '))
          date = new Date(+line.slice(15) * 1000).toISOString().slice(0, 10);
        else if (line.startsWith('\t')) {
          // count only lines that carry translated text (a JSON string value with letters)
          if (!/":\s*"[^"]*\p{L}/u.test(line) && !/^\t\s*"[^"]*\p{L}/u.test(line)) continue;
          const b = bucket(date);
          counts[b] = (counts[b] ?? 0) + 1;
        }
      }
    }
    out[`${loc} ${tree}`] = counts;
  }
const buckets = [...new Set(Object.values(out).flatMap((c) => Object.keys(c)))].sort();
console.log(['locale tree'.padEnd(16), ...buckets.map((b) => b.slice(0, 1))].join('\t'));
for (const [k, c] of Object.entries(out)) {
  const tot = Object.values(c).reduce((a, b) => a + b, 0) || 1;
  console.log(
    [k.padEnd(16), ...buckets.map((b) => `${Math.round((100 * (c[b] ?? 0)) / tot)}%`)].join('\t'),
  );
}
console.log(buckets.join(' · '));
