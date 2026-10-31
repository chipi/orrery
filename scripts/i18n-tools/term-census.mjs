// Which technical terms should the glossary cover next? Counts how often each candidate
// term occurs in the English editorial trees (case-insensitive, word-bounded, simple
// plural) and marks the ones already in the glossary's `term` class.
//   node scripts/i18n-tools/term-census.mjs [--json]
// Extend CANDIDATES when the content grows; pick the next batch from the most used
// terms not yet covered (✓ = in native-terms.json `term`).
import fs from 'node:fs';
import path from 'node:path';
const R = 'i18n-src/en-US';
const COVERED = new Set(
  Object.keys(
    JSON.parse(fs.readFileSync('scripts/i18n-tools/native-terms.json', 'utf8')).term ?? {},
  ),
);
const TREES = ['essays', 'science', 'missions', 'fleet', 'programs'];
const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : e.name.endsWith('.json') ? [p] : [];
  });
const strings = (o, out = []) => {
  if (typeof o === 'string') out.push(o);
  else if (o && typeof o === 'object') for (const v of Object.values(o)) strings(v, out);
  return out;
};
const text = TREES.flatMap((t) =>
  walk(path.join(R, t)).flatMap((f) => strings(JSON.parse(fs.readFileSync(f, 'utf8')))),
).join('\n');

const CANDIDATES = {
  'orbital mechanics': [
    'orbit',
    'orbital period',
    'orbital velocity',
    'semi-major axis',
    'eccentricity',
    'inclination',
    'periapsis',
    'apoapsis',
    'perigee',
    'apogee',
    'perihelion',
    'aphelion',
    'perilune',
    'apolune',
    'line of apsides',
    'true anomaly',
    'mean anomaly',
    'node',
    'ascending node',
    'escape velocity',
    'circular velocity',
    'vis-viva',
    'Hohmann transfer',
    'bi-elliptic',
    'transfer orbit',
    'parking orbit',
    'geostationary',
    'geosynchronous',
    'sun-synchronous',
    'polar orbit',
    'low Earth orbit',
    'Lagrange point',
    'halo orbit',
    'sphere of influence',
    'gravity assist',
    'slingshot',
    'Oberth effect',
    'free-return',
    'launch window',
    'synodic period',
    'delta-v',
    'C3',
    'patched conic',
    'Lambert',
    'porkchop plot',
    'trajectory',
    'ephemeris',
    'precession',
    'libration',
    'tidal locking',
    'resonance',
    'retrograde',
    'prograde',
    'ground track',
    'station-keeping',
    'phasing',
    'rendezvous',
    'docking',
    'berthing',
  ],
  'propulsion & vehicles': [
    'burn',
    'thrust',
    'specific impulse',
    'exhaust velocity',
    'propellant',
    'oxidizer',
    'fuel',
    'staging',
    'stage',
    'upper stage',
    'booster',
    'fairing',
    'payload',
    'engine cycle',
    'gas generator',
    'staged combustion',
    'expander cycle',
    'full-flow',
    'throttle',
    'gimbal',
    'nozzle',
    'combustion chamber',
    'turbopump',
    'mass ratio',
    'rocket equation',
    'thrust-to-weight',
    'ion engine',
    'Hall thruster',
    'solar sail',
    'nuclear thermal',
    'reaction wheel',
    'attitude control',
    'RCS',
    'heat shield',
    'ablative',
    'max-Q',
    'reusable',
    'landing legs',
    'grid fins',
    'cryogenic',
    'hypergolic',
    'boil-off',
  ],
  'mission phases': [
    'launch',
    'liftoff',
    'ascent',
    'cruise',
    'orbit insertion',
    'trans-lunar injection',
    'trajectory correction',
    'flyby',
    'aerobraking',
    'aerocapture',
    'entry',
    'descent',
    'landing',
    'powered descent',
    'sky crane',
    'touchdown',
    'splashdown',
    're-entry',
    'deorbit',
    'EVA',
    'spacewalk',
    'sample return',
    'lander',
    'rover',
    'orbiter',
    'probe',
    'impactor',
    'telemetry',
    'downlink',
    'uplink',
    'Deep Space Network',
    'signal delay',
    'light-time',
  ],
  'astronomy & astrophysics': [
    'main sequence',
    'red giant',
    'white dwarf',
    'neutron star',
    'black hole',
    'supernova',
    'nebula',
    'luminosity',
    'magnitude',
    'spectral class',
    'parallax',
    'light-year',
    'parsec',
    'redshift',
    'Hubble constant',
    'dark matter',
    'dark energy',
    'cosmic microwave background',
    'exoplanet',
    'habitable zone',
    'transit method',
    'radial velocity',
    'biosignature',
    'spectroscopy',
    'interferometry',
    'albedo',
    'regolith',
    'mare',
    'crater',
    'ejecta',
    'impact basin',
    'magnetosphere',
    'solar wind',
    'heliosphere',
    'heliopause',
    'Kuiper belt',
    'Oort cloud',
    'asteroid belt',
    'protoplanetary disk',
    'accretion',
    'tidal',
    'cosmic ray',
    'zodiacal',
  ],
  'human spaceflight': [
    'microgravity',
    'weightlessness',
    'life support',
    'radiation dose',
    'bone loss',
    'spacesuit',
    'airlock',
    'module',
    'truss',
    'solar array',
    'cupola',
    'crew vehicle',
    'capsule',
    'abort',
    'launch escape',
  ],
};
const rows = [];
for (const [group, terms] of Object.entries(CANDIDATES)) {
  for (const t of terms) {
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const n = (text.match(new RegExp(`\\b${esc}(?:s|es)?\\b`, 'gi')) || []).length;
    rows.push({ group, term: t, n });
  }
}
const used = rows.filter((r) => r.n > 0);
for (const g of Object.keys(CANDIDATES)) {
  const gr = rows.filter((r) => r.group === g);
  const u = gr.filter((r) => r.n > 0).sort((a, b) => b.n - a.n);
  console.log(
    `${g}: ${u.length}/${gr.length} used — ${u.map((r) => `${COVERED.has(r.term) ? '✓' : ''}${r.term}(${r.n})`).join(', ')}`,
  );
}
console.log(
  `TOTAL candidates ${rows.length}; used ${used.length}; used ≥5 times ${used.filter((r) => r.n >= 5).length}; ≥20 times ${used.filter((r) => r.n >= 20).length}`,
);
console.log('corpus chars', text.length);
const next = used.filter((r) => !COVERED.has(r.term)).sort((a, b) => b.n - a.n);
console.log(
  `not yet in the glossary: ${next.length} — most used first: ${next
    .slice(0, 30)
    .map((r) => `${r.term}(${r.n})`)
    .join(', ')}`,
);
if (process.argv.includes('--json')) console.log(JSON.stringify(next));
