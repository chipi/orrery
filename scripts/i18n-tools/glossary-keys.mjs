// Per-key review of a pass-2 edit file: which English glossary keys were replaced, how
// often, in which content areas, with a few contexts each — to catch homonyms (a moon
// that is also a mission, a person who is also a spacecraft) before reading every edit.
//   node scripts/i18n-tools/glossary-keys.mjs <edits.json> [classes] [minContexts]
import fs from 'node:fs';

const [file, classes = 'body,feature,star,person', nctx = '3'] = process.argv.slice(2);
const edits = JSON.parse(fs.readFileSync(file, 'utf8'));
const g = JSON.parse(fs.readFileSync('scripts/i18n-tools/native-terms.json', 'utf8'));
const keys = classes
  .split(',')
  .flatMap((c) => Object.keys(g[c] ?? {}).map((k) => [k, c]))
  .sort((a, b) => b[0].length - a[0].length);
const hits = new Map();
for (const e of edits) {
  let old = e.old;
  for (const [k, c] of keys) {
    const re = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    for (const m of old.matchAll(re)) {
      if (e.new.includes(k) && e.new.split(k).length >= old.split(k).length) continue;
      const h = hits.get(k) ?? { c, n: 0, areas: new Map(), ctx: [] };
      h.n++;
      const area = e.rel.split('/').slice(0, 2).join('/');
      h.areas.set(area, (h.areas.get(area) ?? 0) + 1);
      if (h.ctx.length < +nctx)
        h.ctx.push(
          old.slice(Math.max(0, m.index - 45), m.index + k.length + 30).replace(/\s+/g, ' '),
        );
      hits.set(k, h);
    }
    old = old.replace(re, '\u0000');
  }
}
for (const [k, h] of [...hits].sort((a, b) => b[1].n - a[1].n)) {
  const areas = [...h.areas]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([a, n]) => `${a}:${n}`);
  console.log(`${k} [${h.c}] ×${h.n}  ${areas.join(' ')}`);
  for (const c of h.ctx) console.log(`    …${c}…`);
}
