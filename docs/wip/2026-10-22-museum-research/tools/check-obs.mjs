// Checks translated observatory overlays and the detecting-extraterrestrial-life article against en-US
// (PRD-028): same keys, same number of highlights / paragraphs, film line where en-US has
// one, nothing empty, and the house translation checker (scripts/lib/translate-quality.mjs).
//   node docs/wip/2026-10-22-museum-research/tools/check-obs.mjs [de,fr,...]
import fs from 'node:fs';
import path from 'node:path';
import { problems } from '../../../../scripts/lib/translate-quality.mjs';

const ALL = ['ar', 'de', 'es', 'fr', 'hi', 'it', 'ja', 'ko', 'nl', 'pt-BR', 'ru', 'sr-Cyrl', 'zh-CN'];
const locs = process.argv[2] ? process.argv[2].split(',') : ALL;
let bad = 0;
const say = (m) => {
  bad++;
  console.log(m);
};
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
function compare(loc, label, en, tr) {
  for (const [k, v] of Object.entries(en)) {
    const t = tr[k];
    if (Array.isArray(v)) {
      if (!Array.isArray(t) || t.length !== v.length) {
        say(`${loc} ${label} ${k}: ${Array.isArray(t) ? t.length : 'no'} items, en-US has ${v.length}`);
        continue;
      }
      v.forEach((s, i) => {
        if (typeof t[i] !== 'string' || !t[i].trim()) say(`${loc} ${label} ${k}[${i}]: empty`);
        else for (const pr of problems(loc, s, t[i])) say(`${loc} ${label} ${k}[${i}]: ${pr}`);
      });
    } else if (typeof t !== 'string' || !t.trim()) say(`${loc} ${label} ${k}: missing`);
    else if (k !== 'name' && k !== 'place' && k !== 'title')
      for (const pr of problems(loc, v, t)) say(`${loc} ${label} ${k}: ${pr}`);
  }
  for (const k of Object.keys(tr)) if (!(k in en)) say(`${loc} ${label}: extra key ${k}`);
}
const EN = 'i18n-src/en-US/observatories';
for (const loc of locs) {
  for (const f of fs.readdirSync(EN)) {
    const p = path.join('i18n-src', loc, 'observatories', f);
    if (!fs.existsSync(p)) {
      say(`${loc} observatories/${f}: missing`);
      continue;
    }
    compare(loc, `observatories/${f}`, read(path.join(EN, f)), read(p));
  }
  const art = 'science/exoplanets/detecting-extraterrestrial-life.json';
  const ap = path.join('i18n-src', loc, art);
  if (!fs.existsSync(ap)) say(`${loc} ${art}: missing`);
  else compare(loc, art, read(path.join('i18n-src/en-US', art)), read(ap));
}
console.log(bad ? `CHECK FAIL ${bad}` : `CHECK PASS (${locs.join(',')})`);
process.exitCode = bad ? 1 : 0;
