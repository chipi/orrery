import fs from 'node:fs';
import path from 'node:path';
const [loc, out, ...pairs] = process.argv.slice(2);
const R = pairs.map((p) => {
  const [a, b] = p.split('=>');
  return [new RegExp(a, 'g'), b];
});
const walkDir = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? walkDir(path.join(d, e.name))
        : e.name.endsWith('.json')
          ? [path.join(d, e.name)]
          : [],
    );
const edits = [];
for (const p of walkDir(`i18n-src/${loc}`)) {
  const rel = p.slice(`i18n-src/${loc}/`.length);
  const walk = (v, at) => {
    if (typeof v === 'string') {
      let n = v;
      for (const [re, r] of R) n = n.replace(re, r);
      if (n !== v) edits.push({ rel, at, old: v, new: n });
    } else if (v && typeof v === 'object')
      for (const [k, x] of Object.entries(v)) walk(x, at ? `${at}.${k}` : k);
  };
  walk(JSON.parse(fs.readFileSync(p, 'utf8')), '');
}
const m = JSON.parse(fs.readFileSync(`messages/${loc}.json`, 'utf8'));
for (const [k, v] of Object.entries(m))
  if (typeof v === 'string') {
    let n = v;
    for (const [re, r] of R) n = n.replace(re, r);
    if (n !== v) edits.push({ rel: 'messages', at: k, old: v, new: n });
  }
fs.writeFileSync(out, JSON.stringify(edits, null, 2) + '\n');
console.log('edits', edits.length);
for (const e of edits) console.log(' ', e.rel, e.at);
