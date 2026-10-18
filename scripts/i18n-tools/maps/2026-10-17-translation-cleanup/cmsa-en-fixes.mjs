// en-US fact fixes (2026-10-18): China's crewed programme is run by the China Manned Space
// Agency (CMSA), not CNSA. Sources: China Daily 2020-10-01 (third astronaut group: 7 pilots,
// 7 flight engineers, 4 payload specialists, selected 2018–2020; the first two groups, 1998
// and 2010, were PLAAF pilots); space.com "Meet Tansuo and Wangyu" (CMSA's unpressurised
// two-seat crewed lunar rover, landing targeted for 2030); CNBC/Al Jazeera 2021-06-24
// (crewed Mars flights from 2033 presented at GLEX 2021 by Wang Xiaojun, head of CALT).
// "KJ-200 trainers" dropped: KJ-200 is an airborne early-warning aircraft, no source found
// for it as an astronaut trainer. Writes cmsa-en-edits.json ({rel, at, old, new}) and applies.
import fs from 'node:fs';

const D = 'i18n-src/en-US/science/life-in-space';
const FIX = [
  [
    'crew-selection.json',
    "CNSA's taikonaut selection (China Manned Space) was historically restricted to PLAAF test pilots; the second selection wave in 2020 expanded to include scientific researchers and flight engineers, mirroring NASA's 1965 expansion beyond test pilots.",
    "China's astronaut selection, run by the China Manned Space Agency (CMSA), took only PLAAF pilots for its first two groups (1998, 2010); the third group, selected in 2020, added flight engineers and payload specialists, mirroring NASA's 1965 expansion beyond test pilots.",
  ],
  [
    'lunar-surface-ops.json',
    "CNSA has an analogous Chang'e-derived design under development.",
    "China's CMSA is building Tansuo, an unpressurised two-seat rover, for its first crewed landing, targeted for 2030.",
  ],
  [
    'mars-human-architecture.json',
    "China's CNSA Mars-2033 architecture is in the same conceptual family, with a different ISRU profile.",
    'The crewed-Mars plan that CALT, China’s main rocket maker, presented in 2021, with first crews from 2033, is in the same conceptual family, with a different ISRU profile.',
  ],
  [
    'pre-flight-training.json',
    "Basic training is roughly the same across NASA, Roscosmos, ESA, JAXA, CSA, and CNSA: scuba certification (for the neutral-buoyancy pool work that will later teach EVA), aircraft flight time (T-38 jets at JSC, L-39s at Star City, KJ-200 trainers at China's Astronaut Center),",
    'Basic training is roughly the same across NASA, Roscosmos, ESA, JAXA, CSA, and China’s CMSA: scuba certification (for the neutral-buoyancy pool work that will later teach EVA), aircraft flight time (T-38 jets at JSC, L-39s at Star City),',
  ],
  [
    'sleep-nutrition-circadian.json',
    'CNSA has built up its own Chinese-cuisine-oriented menu',
    'China’s CMSA has built up its own Chinese-cuisine-oriented menu',
  ],
];
const strings = (v, at, o) => {
  if (typeof v === 'string') o.push([at, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${at}.${i}`, o));
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) strings(x, at ? `${at}.${k}` : k, o);
  return o;
};
const set = (o, at, val) => {
  const ks = at.split('.');
  const last = ks.pop();
  ks.reduce((a, k) => a[k], o)[last] = val;
};
const edits = [];
for (const [file, from, to] of FIX) {
  const p = `${D}/${file}`;
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  const hits = strings(doc, '', []).filter(([, v]) => v.includes(from));
  if (hits.length !== 1) throw new Error(`${file}: ${hits.length} matches`);
  const [at, old] = hits[0];
  set(doc, at, old.replace(from, to));
  fs.writeFileSync(p, JSON.stringify(doc, null, 2) + '\n');
  edits.push({
    rel: `science/life-in-space/${file}`,
    at,
    old,
    new: old.replace(from, to),
    from,
    to,
  });
}
fs.writeFileSync(
  'scripts/i18n-tools/maps/2026-10-17-translation-cleanup/cmsa-en-edits.json',
  JSON.stringify(edits, null, 1),
);
console.log(edits.map((e) => `${e.rel}:${e.at}`).join('\n'));
