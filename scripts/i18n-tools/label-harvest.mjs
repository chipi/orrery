// For each locale and each English label left untranslated somewhere, the most common
// existing translation of that exact English label elsewhere in the same locale.
import fs from 'node:fs';
import path from 'node:path';
const S = 'scripts/i18n-tools/maps/2026-10-17-translation-cleanup';
const R = 'i18n-src';
const walk = (d, o = []) => {
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n);
    if (fs.statSync(p).isDirectory()) walk(p, o);
    else if (n.endsWith('.json')) o.push(p);
  }
  return o;
};
const rows = fs
  .readFileSync(`${S}/labels.tsv`, 'utf8')
  .trim()
  .split('\n')
  .map((l) => {
    const [loc, rest] = l.split('\t');
    return [loc, rest.replace(/^.* — /, '')];
  });
const need = {};
for (const [loc, en] of rows) (need[loc] ||= new Set()).add(en);
const out = {};
for (const [loc, set] of Object.entries(need)) {
  const seen = {};
  for (const p of walk(`${R}/en-US`)) {
    const lp = p.replace('/en-US/', `/${loc}/`);
    if (!fs.existsSync(lp)) continue;
    const e = JSON.parse(fs.readFileSync(p, 'utf8'));
    const t = JSON.parse(fs.readFileSync(lp, 'utf8'));
    (e.events ?? []).forEach((x, i) => {
      const tl = t.events?.[i]?.label;
      if (set.has(x.label) && tl && tl !== x.label)
        (seen[x.label] ||= {})[tl] = ((seen[x.label] ||= {})[tl] || 0) + 1;
    });
  }
  out[loc] = {};
  for (const en of set) {
    const c = seen[en];
    out[loc][en] = c ? Object.entries(c).sort((a, b) => b[1] - a[1])[0][0] : null;
  }
  const have = Object.values(out[loc]).filter(Boolean).length;
  console.log(loc.padEnd(8), `${have}/${set.size} harvested`);
}
fs.writeFileSync(`${S}/label-harvest.json`, JSON.stringify(out, null, 1));
