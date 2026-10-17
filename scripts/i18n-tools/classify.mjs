import fs from 'node:fs';
import path from 'node:path';
import { gazetteer } from '../lib/translate-quality.mjs';
const vehWords = new Set([...gazetteer()].flatMap((n) => n.split(/[\s/-]+/)));
const walk = (d) =>
  fs.readdirSync(d).flatMap((n) => {
    const p = path.join(d, n);
    return fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : [];
  });
for (const loc of ['ru', 'ja', 'zh-CN', 'ko', 'hi', 'ar', 'sr-Cyrl', 'de', 'fr', 'es']) {
  const c = { vehicle: 0, acronym: 0, other: 0 };
  const other = new Map();
  for (const f of walk(`i18n-src/${loc}`)) {
    const toks =
      fs
        .readFileSync(f, 'utf8')
        .match(/"(?:[^"\\]|\\.)*"/g)
        ?.join(' ')
        .match(/\b[A-Z][A-Za-z'’]{2,}\b/g) || [];
    for (const t of toks) {
      if (/^[A-Z]{2,}$/.test(t)) c.acronym++;
      else if (vehWords.has(t)) c.vehicle++;
      else {
        c.other++;
        other.set(t, (other.get(t) || 0) + 1);
      }
    }
  }
  console.log(
    loc,
    JSON.stringify(c),
    'distinct other',
    other.size,
    [...other]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25)
      .map(([k, v]) => `${k}:${v}`)
      .join(' '),
  );
}
