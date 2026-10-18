// Name drift in existing translations: runs the translation checker's name tests
// (problems() in scripts/lib/translate-quality.mjs: designations and the gazetteer of the
// site's own names must survive verbatim, or in their origin locale's native form) over
// every string already translated — overlays and messages — not only over new ones.
//   node scripts/i18n-tools/name-drift-scan.mjs [locs] [--json=<out>]
import fs from 'node:fs';
import path from 'node:path';
import { problems } from '../lib/translate-quality.mjs';

const args = process.argv.slice(2);
const LOCS = (
  args.find((a) => !a.startsWith('--')) ?? 'ru,ja,zh-CN,ko,hi,ar,sr-Cyrl,de,fr,es,it,nl,pt-BR'
).split(',');
const jsonOut = args.find((a) => a.startsWith('--json='))?.slice(7);
const NAME_PROBLEM = /^names (translated|changed) or missing/;
// Reviewed exceptions, "<file>:<field>": the name there is not the vehicle/mission.
const ALLOW = new Set([
  'messages:plan_destination_psyche', // the asteroid 16 Psyche (a body: native form), not the mission
]);

const walk = (d) =>
  fs.readdirSync(d).flatMap((n) => {
    const p = path.join(d, n);
    return fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : [];
  });
function leaves(o, at, out) {
  if (typeof o === 'string') out.set(at, o);
  else if (Array.isArray(o)) o.forEach((x, i) => leaves(x, at ? `${at}.${i}` : `${i}`, out));
  else if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) leaves(v, at ? `${at}.${k}` : k, out);
  return out;
}
const read = (p) =>
  fs.existsSync(p) ? leaves(JSON.parse(fs.readFileSync(p, 'utf8')), '', new Map()) : new Map();

const sources = [
  ...walk('i18n-src/en-US').map((f) => {
    const rel = path.relative('i18n-src/en-US', f);
    return { rel, en: f, tr: (l) => path.join('i18n-src', l, rel) };
  }),
  { rel: 'messages', en: 'messages/en-US.json', tr: (l) => `messages/${l}.json` },
];
const hits = [];
for (const s of sources) {
  const en = read(s.en);
  for (const loc of LOCS) {
    const tr = read(s.tr(loc));
    for (const [at, src] of en) {
      const out = tr.get(at);
      if (typeof out !== 'string' || out === src || ALLOW.has(`${s.rel}:${at}`)) continue;
      for (const p of problems(loc, src, out))
        if (NAME_PROBLEM.test(p)) hits.push({ loc, rel: s.rel, at, problem: p, src, out });
    }
  }
}
const by = {};
for (const h of hits) by[h.loc] = (by[h.loc] ?? 0) + 1;
console.log(`name problems: ${hits.length}  ${LOCS.map((l) => `${l} ${by[l] ?? 0}`).join('  ')}`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(hits, null, 1) + '\n');
// A gate in validate-data: any hit fails it, with the first few shown.
for (const h of hits.slice(0, 10))
  console.log(
    `  ${h.loc} ${h.rel}:${h.at} — ${h.problem.replace(/.*: /, '')} → ${h.out.slice(0, 80)}`,
  );
process.exit(hits.length ? 1 : 0);
