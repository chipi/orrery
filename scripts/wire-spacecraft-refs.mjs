import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Per-mission: which spacecraft + launcher refs to set
const MISSION_REFS = {
  'static/data/missions/ceres/dawn.json': [
    { id: 'delta-ii', role: 'launcher' },
    { id: 'dawn', role: 'spacecraft' },
  ],
  'static/data/missions/comet/giotto.json': [
    { id: 'ariane-1', role: 'launcher' },
    { id: 'giotto', role: 'spacecraft' },
  ],
  'static/data/missions/jupiter/juice.json': [
    { id: 'ariane-5', role: 'launcher' },
    { id: 'juice', role: 'spacecraft' },
  ],
  'static/data/missions/mercury/bepicolombo.json': [
    { id: 'ariane-5', role: 'launcher' },
    { id: 'bepicolombo', role: 'spacecraft' },
  ],
  'static/data/missions/mercury/messenger.json': [
    { id: 'delta-ii', role: 'launcher' },
    { id: 'messenger', role: 'spacecraft' },
  ],
  'static/data/missions/moon/blue-moon-mk1.json': [
    { id: 'new-glenn', role: 'launcher' },
    { id: 'blue-moon-mk1', role: 'spacecraft' },
  ],
  'static/data/missions/moon/clementine.json': [
    { id: 'clementine', role: 'spacecraft' },
  ],
  'static/data/missions/saturn/pioneer-11.json': [
    { id: 'atlas-slv-3d', role: 'launcher' },
    { id: 'pioneer-11', role: 'spacecraft' },
  ],
  'static/data/missions/sun/ulysses.json': [
    { id: 'space-shuttle-stack', role: 'launcher' },
    { id: 'space-shuttle-orbiter', role: 'spacecraft' },
    { id: 'ulysses', role: 'payload' },
  ],
  'static/data/missions/venus/vega-1.json': [
    { id: 'proton-k', role: 'launcher' },
    { id: 'vega-1', role: 'spacecraft' },
  ],
  'static/data/missions/venus/vega-2.json': [
    { id: 'proton-k', role: 'launcher' },
    { id: 'vega-2', role: 'spacecraft' },
  ],
  'static/data/missions/venus/venera-13.json': [
    { id: 'proton-k', role: 'launcher' },
    { id: 'venera-13', role: 'spacecraft' },
  ],
};

// Apply mission-side refs
for (const [path, refs] of Object.entries(MISSION_REFS)) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  data.fleet_refs = refs;
  const ordered = {};
  for (const k of Object.keys(data)) if (k !== 'fleet_refs' && k !== 'flight') ordered[k] = data[k];
  ordered.fleet_refs = refs;
  if ('flight' in data) ordered.flight = data.flight;
  writeFileSync(path, JSON.stringify(ordered, null, 2) + '\n');
  console.log(`✓ mission ${path}`);
}

// Now build the inverse map: fleet id → [mission ids]
const FLEET_LINKS = {};
for (const [path, refs] of Object.entries(MISSION_REFS)) {
  const missionId = path.split('/').pop().replace('.json', '');
  for (const r of refs) {
    (FLEET_LINKS[r.id] = FLEET_LINKS[r.id] || []).push(missionId);
  }
}

// Apply fleet-side linked_missions back-refs
const fleetIdx = JSON.parse(readFileSync('static/data/fleet/index.json', 'utf8'));
const fleetById = Object.fromEntries(fleetIdx.map((e) => [e.id, e]));
for (const [fleetId, missionIds] of Object.entries(FLEET_LINKS)) {
  const e = fleetById[fleetId];
  if (!e) {
    console.log(`?? ${fleetId} not in fleet index`);
    continue;
  }
  const path = `static/data/fleet/${e.category}/${fleetId}.json`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  data.linked_missions = data.linked_missions || [];
  for (const m of missionIds) if (!data.linked_missions.includes(m)) data.linked_missions.push(m);
  data.linked_missions.sort();
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`✓ fleet ${path}: linked_missions = [${data.linked_missions.join(', ')}]`);
}
