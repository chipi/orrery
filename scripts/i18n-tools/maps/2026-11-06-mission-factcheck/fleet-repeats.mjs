// Fact-check fixes were applied to missions; several reviewers could not search the fleet files.
// This takes every `find` (the wrong text) from the applied batch specs and lists each fleet
// file — base or overlay, any locale — that still contains it.
//   node scripts/i18n-tools/maps/2026-11-06-mission-factcheck/fleet-repeats.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../../..');
const DIR = import.meta.dirname;
const finds = new Map(); // find text → spec file
for (const f of readdirSync(DIR).filter((x) => /^batch.*\.json$|\.json$/.test(x))) {
  let spec;
  try {
    spec = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  } catch {
    continue;
  }
  if (!Array.isArray(spec)) continue;
  for (const e of spec) {
    for (const pairs of [...Object.values(e.text ?? {}), e.base ?? []])
      for (const [find, repl] of pairs) {
        // Skip finds that survive inside their own replacement (an insertion, not a wrong fact).
        if (typeof find === 'string' && find.length >= 12 && !String(repl).includes(find))
          finds.set(find, f);
      }
  }
}
const files = [];
const walk = (d) => {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (n.endsWith('.json')) files.push(p);
  }
};
walk(join(ROOT, 'static/data/fleet'));
for (const loc of readdirSync(join(ROOT, 'i18n-src'))) {
  const d = join(ROOT, 'i18n-src', loc, 'fleet');
  try {
    walk(d);
  } catch {
    /* no fleet overlays */
  }
}
let hits = 0;
for (const p of files) {
  const txt = readFileSync(p, 'utf8');
  for (const [find, spec] of finds)
    if (txt.includes(find)) {
      hits++;
      console.log(`${p.replace(ROOT + '/', '')}  ← ${spec}: "${find.slice(0, 90)}"`);
    }
}
console.log(
  `${finds.size} wrong-text finds checked against ${files.length} fleet files: ${hits} still present`,
);
