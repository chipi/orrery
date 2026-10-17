// Apply hand edits: [loc, file, path, [[find, replace], …]] — each find must occur
// exactly once; the result must pass problems() for names (and add no new problem).
import fs from 'node:fs';
import { writeJsonEdits } from '../lib/json-surgical.mjs';
import { problems } from '../lib/translate-quality.mjs';
const R = process.cwd();
const get = (o, at, flat) =>
  flat ? o[at] : at.split('.').reduce((a, k) => a?.[/^\d+$/.test(k) ? Number(k) : k], o);
let ok = 0;
for (const [loc, file, at, reps] of JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))) {
  const flat = file === 'messages';
  const tp = flat ? `${R}/messages/${loc}.json` : `${R}/i18n-src/${loc}/${file}.json`;
  const ep = flat ? `${R}/messages/en-US.json` : `${R}/i18n-src/en-US/${file}.json`;
  const old = get(JSON.parse(fs.readFileSync(tp, 'utf8')), at, flat);
  const src = get(JSON.parse(fs.readFileSync(ep, 'utf8')), at, flat);
  let nu = old;
  let bad = '';
  if (typeof reps === 'string') nu = reps;
  else
    for (const [a, b] of reps) {
      const n = nu.split(a).length - 1;
      if (n < 1) {
        bad = `"${a.slice(0, 40)}" not found`;
        break;
      }
      nu = nu.split(a).join(b);
    }
  const before = problems(loc, src, old);
  const after = problems(loc, src, nu);
  const added = after.filter((p) => !before.includes(p));
  const still = after.filter((p) => p.startsWith('names translated'));
  if (bad || added.length || still.length) {
    console.log(`✗ ${loc} ${file} :: ${at} — ${bad || [...added, ...still].join('; ')}`);
    continue;
  }
  writeJsonEdits(tp, [{ at, old, nu }], { flat });
  ok++;
}
console.log(`applied ${ok}`);
