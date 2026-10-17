// Proper-noun inventory of the English source: capitalized tokens (and their
// multi-word runs) that are not vehicle/gazetteer words and not dictionary words.
import fs from 'node:fs';
import path from 'node:path';
import { gazetteer } from '../lib/translate-quality.mjs';
const dict = new Set(fs.readFileSync(process.argv[2], 'utf8').split('\n'));
const veh = new Set([...gazetteer()].flatMap((n) => n.split(/[\s/-]+/)));
const walk = (d) =>
  fs.readdirSync(d).flatMap((n) => {
    const p = path.join(d, n);
    return fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : [];
  });
const runs = new Map();
for (const f of walk('i18n-src/en-US')) {
  const strs = fs.readFileSync(f, 'utf8').match(/"(?:[^"\\]|\\.)*"/g) || [];
  for (const s of strs)
    for (const m of s.matchAll(
      /\b[A-Z][a-zà-ÿ'’]+(?:\s+(?:van |von |de |du |la )?[A-Z][a-zà-ÿ'’]+)*/g,
    )) {
      const words = m[0].split(/\s+/).filter((w) => /^[A-Z]/.test(w));
      if (words.every((w) => dict.has(w.toLowerCase()) || veh.has(w))) continue;
      runs.set(m[0], (runs.get(m[0]) || 0) + 1);
    }
}
const out = [...runs].sort((a, b) => b[1] - a[1]);
fs.writeFileSync(process.argv[3], out.map(([k, v]) => `${v}\t${k}`).join('\n') + '\n');
console.log(
  'distinct runs',
  out.length,
  'occurrences',
  out.reduce((s, [, v]) => s + v, 0),
);
