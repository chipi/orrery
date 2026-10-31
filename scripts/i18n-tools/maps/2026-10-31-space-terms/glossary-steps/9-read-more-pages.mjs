import fs from 'node:fs';
const GF = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(GF, 'utf8'));
const RM = {
  orbit: 'orbits/keplerian-orbit',
  trajectory: 'transfers/conic-sections',
  inclination: 'orbits/inclination',
  rendezvous: null,
  docking: 'space-stations/node-module',
  'gravity assist': 'transfers/gravity-assist',
  'delta-v': 'propulsion/dv-budget',
  apogee: 'orbits/apsides',
  perigee: 'orbits/apsides',
  burn: 'propulsion/oberth-effect',
  stage: 'propulsion/rocket-stages',
  propellant: 'propulsion/fuels-and-oxidizers',
  payload: null,
  thrust: 'propulsion/thrust-and-twr',
  booster: 'propulsion/rocket-stages',
  'specific impulse': 'propulsion/specific-impulse',
  flyby: 'mission-phases/mission-types',
  'orbit insertion': 'mission-phases/orbit-insertion',
  entry: 'mission-phases/edl',
  descent: 'mission-phases/edl',
};
for (const [t, e] of Object.entries(g.term)) {
  if (!(t in RM)) throw new Error('no read-more decision for ' + t);
  if (RM[t]) {
    if (!fs.existsSync(`i18n-src/en-US/science/${RM[t]}.json`)) throw new Error(RM[t]);
    e._read_more = RM[t];
  }
}
fs.writeFileSync(GF, JSON.stringify(g, null, 2) + '\n');
console.log('ok');
