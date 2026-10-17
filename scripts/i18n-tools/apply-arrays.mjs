// Replace whole string arrays by hand: { "<file> :: <key>": [p0, p1, …] } for one locale.
// An entry "KEEP:<i>" reuses the current translation's element i. Refuses on length mismatch
// with en-US or on any problems() hit.
import fs from 'node:fs';
import { problems } from '../lib/translate-quality.mjs';
const R = 'i18n-src';
const [loc, src] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(src, 'utf8'));
const get = (o, at) => at.split('.').reduce((a, k) => a?.[k], o);
const set = (o, at, v) => {
  const ks = at.split('.');
  const last = ks.pop();
  ks.reduce((a, k) => a[k], o)[last] = v;
};
let ok = 0,
  bad = 0;
for (const [k, paras] of Object.entries(spec)) {
  const [file, at] = k.split(' :: ');
  const tp = `${R}/${loc}/${file}.json`;
  const t = JSON.parse(fs.readFileSync(tp, 'utf8'));
  const e = get(JSON.parse(fs.readFileSync(`${R}/en-US/${file}.json`, 'utf8')), at);
  const cur = get(t, at);
  const nu = paras.map((p) => (p.startsWith('KEEP:') ? cur[Number(p.slice(5))] : p));
  const errs =
    nu.length !== e.length
      ? [`length ${nu.length} vs en ${e.length}`]
      : nu.flatMap((p, i) => problems(loc, e[i], p).map((x) => `[${i}] ${x.slice(0, 160)}`));
  if (errs.length) {
    bad++;
    console.log(`✗ ${loc} ${k}\n   ${errs.join('\n   ')}`);
    continue;
  }
  set(t, at, nu);
  fs.writeFileSync(tp, JSON.stringify(t, null, 2) + '\n');
  ok++;
  console.log(`✓ ${loc} ${k} (${nu.length})`);
}
console.log(`${loc}: ${ok} written, ${bad} refused`);
process.exit(bad ? 1 : 0);
