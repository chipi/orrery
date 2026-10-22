// Checks translated museum overlays against en-US (PRD-027): same keys and item refs,
// nothing empty, and the house translation checker (scripts/lib/translate-quality.mjs).
//   node docs/wip/2026-10-22-museum-research/tools/check-overlays.mjs [de,fr,...]
import fs from 'node:fs';
import path from 'node:path';
import { problems } from '../../../../scripts/lib/translate-quality.mjs';

const ALL = ['ar', 'de', 'es', 'fr', 'hi', 'it', 'ja', 'ko', 'nl', 'pt-BR', 'ru', 'sr-Cyrl', 'zh-CN'];
const locs = process.argv[2] ? process.argv[2].split(',') : ALL;
const EN = 'i18n-src/en-US/museums';
let bad = 0;
const say = (m) => {
  bad++;
  console.log(m);
};
for (const loc of locs) {
  for (const f of fs.readdirSync(EN)) {
    const en = JSON.parse(fs.readFileSync(path.join(EN, f), 'utf8'));
    const p = path.join('i18n-src', loc, 'museums', f);
    if (!fs.existsSync(p)) {
      say(`${loc} ${f}: missing`);
      continue;
    }
    const tr = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const k of ['name', 'city', 'description'])
      if (typeof tr[k] !== 'string' || !tr[k].trim()) say(`${loc} ${f}: empty ${k}`);
    const want = Object.keys(en.items).sort().join('|');
    const got = Object.keys(tr.items ?? {}).sort().join('|');
    if (want !== got) say(`${loc} ${f}: item refs differ (${got} vs ${want})`);
    const pairs = [['description', en.description, tr.description]];
    for (const [r, line] of Object.entries(en.items)) pairs.push([`items.${r}`, line, tr.items?.[r]]);
    for (const [at, src, out] of pairs) {
      if (typeof out !== 'string') continue;
      for (const pr of problems(loc, src, out)) say(`${loc} ${f} ${at}: ${pr}`);
    }
  }
}
console.log(bad ? `CHECK FAIL ${bad}` : `CHECK PASS (${locs.join(',')})`);
process.exitCode = bad ? 1 : 0;
