// Apply one fact-check batch: exact find → replace per locale overlay (i18n-src/<loc>/missions/<m>.json),
// event `met` values in every overlay, and base-file edits (static/data/missions/<m>.json).
//   node apply.mjs <batch.json>
// batch.json: [{ m: "earth/vostok-5", text: { "en-US": [[find, replace], …], de: […], … } },
//              { m, met: { "1": 0.98 } }, { m, base: [[find, replace], …] }]
// Every find must occur in its file, or the whole batch stops before anything is written.
import { readFileSync, writeFileSync } from 'node:fs';

const LOCS = [
  'en-US',
  'ar',
  'de',
  'es',
  'fr',
  'hi',
  'it',
  'ja',
  'ko',
  'nl',
  'pt-BR',
  'ru',
  'sr-Cyrl',
  'zh-CN',
];
const batch = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const out = new Map();
const get = (f) => out.get(f) ?? readFileSync(f, 'utf8');
const errors = [];
let n = 0;
for (const e of batch) {
  if (e.text)
    for (const [loc, pairs] of Object.entries(e.text)) {
      const f = `i18n-src/${loc}/missions/${e.m}.json`;
      let s = get(f);
      for (const [a, b] of pairs) {
        if (!s.includes(a)) errors.push(`${f}: not found: ${a.slice(0, 60)}`);
        else ((s = s.split(a).join(b)), n++);
      }
      out.set(f, s);
    }
  if (e.met)
    for (const loc of LOCS) {
      const f = `i18n-src/${loc}/missions/${e.m}.json`;
      const j = JSON.parse(get(f));
      for (const [i, v] of Object.entries(e.met)) {
        if (!j.events?.[+i]) errors.push(`${f}: no event ${i}`);
        else ((j.events[+i].met = v), n++);
      }
      if (e.sort) j.events.sort((x, y) => x.met - y.met);
      out.set(f, JSON.stringify(j, null, 2) + '\n');
    }
  if (e.base) {
    const f = `static/data/missions/${e.m}.json`;
    let s = get(f);
    for (const [a, b] of e.base) {
      if (!s.includes(a)) errors.push(`${f}: not found: ${a.slice(0, 60)}`);
      else ((s = s.split(a).join(b)), n++);
    }
    out.set(f, s);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`${errors.length} not found — nothing written`);
  process.exit(1);
}
for (const [f, s] of out) writeFileSync(f, s);
console.log(`${n} edits in ${out.size} files`);
