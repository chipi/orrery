// The de missions reviewer wrote its keeps with an empty `why` (the reasons were only in its
// report); term-keep recorded them without one. This supplies the reasons after reading each
// field, turns the counted-orbit keeps into a stem (Umläufe), and fixes two fields that were
// not right as they were. Run from the repo root:
//   node …/missions-round1-de-keep-reasons.mjs <edits-out.json> <keeps-out.json>
import fs from 'node:fs';
const [editsOut, keepsOut] = process.argv.slice(2);
const KEEPS = 'scripts/i18n-tools/term-keeps.json';
const keeps = JSON.parse(fs.readFileSync(KEEPS, 'utf8'));
// drop the reason-less keeps; the ones still needed are re-recorded below with a reason
for (const [k, v] of Object.entries(keeps)) if (!v.why) delete keeps[k];
fs.writeFileSync(KEEPS, JSON.stringify(keeps, null, 2) + '\n');

const GF = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(GF, 'utf8'));
g.term.orbit._match.de = [...new Set([...g.term.orbit._match.de, 'Uml(?:a|ä)uf\\p{L}*'])];
fs.writeFileSync(GF, JSON.stringify(g, null, 2) + '\n');

const k = (term, rel, at, why) => ({ term, loc: 'de', rel: `missions/${rel}`, at, why });
fs.writeFileSync(
  keepsOut,
  JSON.stringify(
    [
      k('apogee', 'mars/mangalyaan.json', 'events.3.note', 'engine name: Liquid Apogee Motor'),
      k(
        'booster',
        'earth/otv-5.json',
        'description',
        'variant: first stage (Falcon 9 booster recovered)',
      ),
      k('booster', 'moon/luna16.json', 'description', 'variant: launcher (Proton-K booster)'),
      k('burn', 'earth/apollo-1.json', 'payload', 'fire: burned on the pad'),
      k('burn', 'venus/akatsuki.json', 'events.2.note', 'variant: Brennbeginn ("into the burn")'),
      k(
        'descent',
        'comet/rosetta.json',
        'payload',
        'variant: Landeeinheit Philae (descent lander)',
      ),
      k('descent', 'earth/voskhod-2.json', 'description', 'variant: Landemodul (descent module)'),
      k('descent', 'earth/vostok-1.json', 'payload', 'variant: Landekapsel (descent module)'),
      k(
        'descent',
        'psyche/psyche-mission.json',
        'description',
        'variant: Bahnabsenkung (orbit-lowering phases)',
      ),
      k('orbit', 'earth/sigma-7.json', 'dispatch', 'orbit count rendered in the sentence, natural'),
      k(
        'orbit',
        'earth/vostok-6.json',
        'dispatch',
        'orbit count rendered in the sentence, natural',
      ),
      k('stage', 'venus/magellan.json', 'vehicle', 'vehicle name: Inertial Upper Stage'),
      k('trajectory', 'mars/mangalyaan.json', 'events.2.note', 'variant: Marskurs'),
    ],
    null,
    1,
  ),
);
const get = (o, at) => at.split('.').reduce((v, x) => v?.[x], o);
const doc = (rel) => JSON.parse(fs.readFileSync(`i18n-src/de/missions/${rel}`, 'utf8'));
const sub = (rel, at, a, b) => {
  const old = get(doc(rel), at);
  if (!old.includes(a)) throw new Error(`${rel} ${at}: ${a}`);
  return { rel: `missions/${rel}`, at, old, new: old.replace(a, b) };
};
fs.writeFileSync(
  editsOut,
  JSON.stringify(
    [
      sub(
        'asteroid/hayabusa2.json',
        'description',
        'Die Probenrückkehrkapsel landete am',
        'Der Wiedereintritt der Probenrückkehrkapsel erfolgte am',
      ),
      sub('venus/magellan.json', 'description', 'aus der Ladebucht', 'aus der Nutzlastbucht'),
    ],
    null,
    1,
  ),
);
console.log('ok');
