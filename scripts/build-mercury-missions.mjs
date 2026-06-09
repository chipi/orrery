#!/usr/bin/env node
/**
 * Build the 6 crewed Mercury missions (Freedom 7, Liberty Bell 7,
 * Friendship 7, Aurora 7, Sigma 7, Faith 7) so /missions has the full
 * U.S. early crewed set + the Right Stuff cross-reference resolves.
 *
 * All 6 are dest:EARTH (suborbital for Redstone pair; orbital for the
 * 4 Atlas flights). Tight base JSON + en-US overlay each — 14-locale
 * i18n is a follow-up pass.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MISSIONS = join(ROOT, 'static', 'data', 'missions');
const I18N = join(ROOT, 'static', 'data', 'i18n');

const NASA_COLOR = '#0B3D91';
const NASA_FULL = 'National Aeronautics and Space Administration / Space Task Group';

const ITEMS = [
  {
    id: 'freedom-7',
    name: 'Freedom 7 / MR-3',
    year: 1961,
    departure_date: '1961-05-05',
    arrival_date: '1961-05-05',
    transit_days: 0,
    vehicle: 'Mercury-Redstone (MR-7)',
    payload: 'Mercury capsule #7 (1832 kg); Alan Shepard',
    delta_v: '~2.3 km/s (suborbital)',
    fleet_id: 'mercury-capsule',
    launcher_id: 'mercury-redstone',
    site_id: 'lc-5',
    type: 'CREWED SUBORBITAL · FLOWN',
    first: 'First American in space',
    description:
      "Alan Shepard's 15-minute suborbital flight — first American in space, 23 days after Yuri Gagarin's Vostok 1 orbital flight. Apogee 187 km; max-g 11.6 g during re-entry; max-Q 3.7 g. Capsule Freedom 7 splashed down 487 km downrange in the Atlantic. Shepard reportedly remarked \"What a beautiful view\" at apogee. The flight was suborbital because the Mercury-Redstone launcher couldn't reach orbital velocity; subsequent orbital Mercury missions used the more powerful Atlas LV-3B. Capsule Freedom 7 is on display at the JFK Presidential Library, Boston MA.",
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'MR-7 from Cape Canaveral LC-5 1961-05-05 14:34 UTC.',
        type: 'nominal',
      },
      {
        met: 0.000018,
        label: 'APOGEE',
        note: 'Apogee 187 km after 2.5 minutes; weightlessness for ~5 min.',
        type: 'info',
      },
      {
        met: 0.000174,
        label: 'SPLASHDOWN',
        note: 'Capsule splashed down 487 km downrange in Atlantic Ocean. Recovery by USS Lake Champlain.',
        type: 'nominal',
      },
    ],
    links: [
      {
        l: 'Mercury-Redstone 3 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Mercury-Redstone_3',
        t: 'intro',
      },
      { l: 'Freedom 7 — NASA', u: 'https://www.nasa.gov/history/mercury-redstone-3/', t: 'core' },
    ],
  },
  {
    id: 'liberty-bell-7',
    name: 'Liberty Bell 7 / MR-4',
    year: 1961,
    departure_date: '1961-07-21',
    arrival_date: '1961-07-21',
    transit_days: 0,
    vehicle: 'Mercury-Redstone (MR-8)',
    payload: 'Mercury capsule #11 (1832 kg); Gus Grissom',
    delta_v: '~2.3 km/s (suborbital)',
    fleet_id: 'mercury-capsule',
    launcher_id: 'mercury-redstone',
    site_id: 'lc-5',
    type: 'CREWED SUBORBITAL · FLOWN',
    first: 'Second American suborbital flight; hatch malfunction lost the capsule (recovered 1999)',
    description:
      "Gus Grissom's 15-min suborbital flight — second American in space, first flight to feature an explosive escape hatch. After splashdown the hatch fired prematurely, the capsule flooded, and Liberty Bell 7 sank in 4900 m of water; Grissom escaped but his suit took on water and he was nearly drowned during helicopter pickup. The cause of the hatch firing remained controversial for decades; Grissom maintained he had not bumped the firing pin. Recovered 1999-07-20 by an Oceaneering/Discovery Channel expedition, restored and now displayed at the Kansas Cosmosphere & Space Center, Hutchinson KS. The Tom Wolfe book / 1983 film The Right Stuff dramatised this flight + the hatch controversy.",
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'MR-8 from Cape Canaveral LC-5 1961-07-21 12:20 UTC.',
        type: 'nominal',
      },
      {
        met: 0.000018,
        label: 'APOGEE',
        note: 'Apogee 190 km after 2.5 minutes; ~5 min of weightlessness.',
        type: 'info',
      },
      {
        met: 0.000174,
        label: 'SPLASHDOWN',
        note: 'Atlantic Ocean 480 km downrange. Hatch fired prematurely — capsule flooded and sank. Grissom escaped; recovered by USS Randolph.',
        type: 'warning',
      },
      {
        met: 13880,
        label: 'CAPSULE RECOVERY',
        note: 'Liberty Bell 7 raised from 4900 m depth by Oceaneering International, 1999-07-20.',
        type: 'info',
      },
    ],
    links: [
      {
        l: 'Mercury-Redstone 4 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Mercury-Redstone_4',
        t: 'intro',
      },
      {
        l: 'Liberty Bell 7 recovery — Cosmosphere',
        u: 'https://cosmo.org/visit/liberty-bell-7/',
        t: 'core',
      },
    ],
  },
  {
    id: 'friendship-7',
    name: 'Friendship 7 / MA-6',
    year: 1962,
    departure_date: '1962-02-20',
    arrival_date: '1962-02-20',
    transit_days: 0,
    vehicle: 'Atlas LV-3B (MA-6)',
    payload: 'Mercury capsule #13 (1955 kg); John Glenn',
    delta_v: '~9.4 km/s (LEO)',
    fleet_id: 'mercury-capsule',
    launcher_id: 'atlas-lv-3b',
    site_id: 'lc-14',
    type: 'CREWED EARTH-ORBIT · FLOWN',
    first: 'First American to orbit the Earth',
    description:
      'John Glenn\'s 3-orbit flight — first American to orbit Earth, 10 months after Gagarin and 4 months after Titov. Orbit: 159 × 265 km, inclination 32.5°. A heat-shield warning indicator in mission control suggested the shield might be loose — the retropack was kept attached through re-entry as a backup, prompting Glenn\'s famous "fireflies" observation as bits of retropack ablated past the window. Splashdown 1287 km southeast of Cape Canaveral, 4 h 55 min after launch. Glenn returned to space 36 years later on STS-95 (1998) at age 77. Friendship 7 on display at the National Air and Space Museum, Washington DC.',
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Atlas LV-3B from Cape Canaveral LC-14 1962-02-20 14:47 UTC.',
        type: 'nominal',
      },
      {
        met: 0.0001,
        label: 'ORBIT INSERT',
        note: 'Insertion into 159 × 265 km Earth orbit, inclination 32.5°.',
        type: 'nominal',
      },
      {
        met: 0.005,
        label: '"FIREFLIES"',
        note: 'Glenn reports luminous "fireflies" outside the window — bits of retropack ablating during re-entry.',
        type: 'info',
      },
      {
        met: 0.205,
        label: 'SPLASHDOWN',
        note: 'Capsule splashed down 1287 km SE of Cape Canaveral after 3 orbits / 4h 55min. Recovery by USS Noa.',
        type: 'nominal',
      },
    ],
    links: [
      {
        l: 'Mercury-Atlas 6 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Mercury-Atlas_6',
        t: 'intro',
      },
      {
        l: 'Friendship 7 at NASM',
        u: 'https://airandspace.si.edu/collection-objects/capsule-mercury-ma-6-friendship-7',
        t: 'core',
      },
    ],
  },
  {
    id: 'aurora-7',
    name: 'Aurora 7 / MA-7',
    year: 1962,
    departure_date: '1962-05-24',
    arrival_date: '1962-05-24',
    transit_days: 0,
    vehicle: 'Atlas LV-3B (MA-7)',
    payload: 'Mercury capsule #18 (1956 kg); Scott Carpenter',
    delta_v: '~9.4 km/s (LEO)',
    fleet_id: 'mercury-capsule',
    launcher_id: 'atlas-lv-3b',
    site_id: 'lc-14',
    type: 'CREWED EARTH-ORBIT · FLOWN',
    first: "Repeated Glenn's 3-orbit profile; overshot landing target by 400 km",
    description:
      "Scott Carpenter's 3-orbit flight — repeated Glenn's MA-6 profile to firm up confidence in the Mercury-Atlas vehicle before attempting the longer Schirra/Cooper flights. Carpenter ran extensive zero-g experiments and observation tasks; the heavy experimental load + a stuck yaw thruster caused him to be ~25° off attitude at retro-fire, overshooting the landing target by ~400 km. The 1 h 7 min recovery delay was widely reported and damaged Carpenter's reputation in NASA management; he never flew again. Capsule Aurora 7 on display at the Museum of Science and Industry, Chicago IL.",
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Atlas LV-3B from Cape Canaveral LC-14 1962-05-24 12:45 UTC.',
        type: 'nominal',
      },
      {
        met: 0.0001,
        label: 'ORBIT INSERT',
        note: 'Insertion into 161 × 268 km Earth orbit.',
        type: 'nominal',
      },
      {
        met: 0.205,
        label: 'SPLASHDOWN',
        note: 'Atlantic Ocean ~400 km past target; 1 h 7 min recovery delay. USS Pierce, USS Intrepid.',
        type: 'warning',
      },
    ],
    links: [
      {
        l: 'Mercury-Atlas 7 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Mercury-Atlas_7',
        t: 'intro',
      },
    ],
  },
  {
    id: 'sigma-7',
    name: 'Sigma 7 / MA-8',
    year: 1962,
    departure_date: '1962-10-03',
    arrival_date: '1962-10-03',
    transit_days: 0,
    vehicle: 'Atlas LV-3B (MA-8)',
    payload: 'Mercury capsule #16 (1962 kg); Wally Schirra',
    delta_v: '~9.4 km/s (LEO)',
    fleet_id: 'mercury-capsule',
    launcher_id: 'atlas-lv-3b',
    site_id: 'lc-14',
    type: 'CREWED EARTH-ORBIT · FLOWN',
    first: 'First textbook Mercury flight — 6 orbits; double Glenn / Carpenter duration',
    description:
      "Wally Schirra's 6-orbit flight — doubled Glenn's and Carpenter's mission length. Schirra called his flight a \"textbook engineering test\" — minimal experimental load, focus on conserving consumables, validating the vehicle for longer duration. Flight duration 9 h 13 min; orbital parameters 161 × 283 km. Splashed down 480 km NE of Midway in the Pacific — first Mercury flight to splash in the Pacific. Aurora 7 had used 38 kg of attitude control gas; Schirra used only 32 kg with double the flight time. Capsule Sigma 7 on display at the Astronaut Memorial Planetarium and Observatory, Cocoa FL.",
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Atlas LV-3B from Cape Canaveral LC-14 1962-10-03 12:15 UTC.',
        type: 'nominal',
      },
      {
        met: 0.0001,
        label: 'ORBIT INSERT',
        note: 'Insertion into 161 × 283 km Earth orbit.',
        type: 'nominal',
      },
      {
        met: 0.385,
        label: 'SPLASHDOWN',
        note: 'Pacific Ocean 480 km NE of Midway after 6 orbits / 9 h 13 min. First Mercury Pacific recovery.',
        type: 'nominal',
      },
    ],
    links: [
      {
        l: 'Mercury-Atlas 8 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Mercury-Atlas_8',
        t: 'intro',
      },
    ],
  },
  {
    id: 'faith-7',
    name: 'Faith 7 / MA-9',
    year: 1963,
    departure_date: '1963-05-15',
    arrival_date: '1963-05-15',
    transit_days: 0,
    vehicle: 'Atlas LV-3B (MA-9)',
    payload: 'Mercury capsule #20 (1376 kg dry); Gordon Cooper',
    delta_v: '~9.4 km/s (LEO)',
    fleet_id: 'mercury-capsule',
    launcher_id: 'atlas-lv-3b',
    site_id: 'lc-14',
    type: 'CREWED EARTH-ORBIT · FLOWN',
    first: 'Last solo American crewed spaceflight; 22 orbits / 34 hours',
    description:
      "Gordon Cooper's 22-orbit flight — last Mercury mission and last solo American spaceflight ever (all subsequent US programmes flew multi-person crews). Duration 34 h 19 min — more than all previous Mercury flights combined. Cooper conducted Earth observation, photography, and ate the first meal in space. Late in the mission a power-supply failure forced manual control of all attitude + retro-fire — Cooper used the window's painted alignment marks against Earth's horizon for orientation, achieving the most accurate splashdown of any Mercury flight (~7 km from target). Capsule Faith 7 on display at Space Center Houston, TX.",
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Atlas LV-3B from Cape Canaveral LC-14 1963-05-15 13:04 UTC.',
        type: 'nominal',
      },
      {
        met: 0.0001,
        label: 'ORBIT INSERT',
        note: 'Insertion into 161 × 267 km Earth orbit.',
        type: 'nominal',
      },
      {
        met: 1.3,
        label: 'POWER FAILURE',
        note: 'Power-supply failure; Cooper switches to manual attitude control + retro-fire — earned his "best stick" reputation.',
        type: 'warning',
      },
      {
        met: 1.43,
        label: 'SPLASHDOWN',
        note: 'Pacific Ocean ~7 km from target after 22 orbits / 34 h 19 min. Recovery by USS Kearsarge.',
        type: 'nominal',
      },
    ],
    links: [
      {
        l: 'Mercury-Atlas 9 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Mercury-Atlas_9',
        t: 'intro',
      },
    ],
  },
];

function buildBase(m) {
  return {
    id: m.id,
    agency: 'NASA',
    agency_full: NASA_FULL,
    sector: 'gov',
    dest: 'EARTH',
    color: NASA_COLOR,
    year: m.year,
    status: 'FLOWN',
    departure_date: m.departure_date,
    arrival_date: m.arrival_date,
    transit_days: m.transit_days,
    vehicle: m.vehicle,
    payload: m.payload,
    delta_v: m.delta_v,
    data_quality: 'good',
    credit: '© NASA — Mercury mission reports. Public domain.',
    links: m.links,
    flight_data_quality: 'reconstructed',
    fleet_refs: [
      { id: m.launcher_id, role: 'launcher' },
      { id: m.fleet_id, role: 'spacecraft' },
      { id: m.site_id, role: 'launch-site' },
    ],
  };
}

function buildOverlay(m) {
  return {
    name: m.name,
    type: m.type,
    first: m.first,
    description: m.description,
    events: m.events,
  };
}

async function main() {
  const indexPath = join(MISSIONS, 'index.json');
  const idx = JSON.parse(await readFile(indexPath, 'utf8'));
  const existing = new Set(idx.map((e) => e.id));

  for (const m of ITEMS) {
    const basePath = join(MISSIONS, 'earth', m.id + '.json');
    await mkdir(dirname(basePath), { recursive: true });
    await writeFile(basePath, JSON.stringify(buildBase(m), null, 2) + '\n');
    const overlayPath = join(I18N, 'en-US', 'missions', 'earth', m.id + '.json');
    await mkdir(dirname(overlayPath), { recursive: true });
    await writeFile(overlayPath, JSON.stringify(buildOverlay(m), null, 2) + '\n');
    console.log('✓ ' + m.id);

    if (!existing.has(m.id)) {
      idx.push({
        id: m.id,
        agency: 'NASA',
        dest: 'EARTH',
        status: 'FLOWN',
        year: m.year,
        sector: 'gov',
        color: NASA_COLOR,
        crewed: true,
      });
      existing.add(m.id);
    }
  }
  await writeFile(indexPath, JSON.stringify(idx, null, 2) + '\n');
  console.log('\n✓ missions/index.json updated');

  // Reciprocal linked_missions on the now-resolvable launcher + sites
  // + capsule entries.
  const RECIPROCAL = {
    'launcher/mercury-redstone': ['freedom-7', 'liberty-bell-7'],
    'launcher/atlas-lv-3b': ['friendship-7', 'aurora-7', 'sigma-7', 'faith-7'],
    'launch-site/lc-5': ['freedom-7', 'liberty-bell-7'],
    'launch-site/lc-14': ['friendship-7', 'aurora-7', 'sigma-7', 'faith-7'],
    'crewed-spacecraft/mercury-capsule': [
      'freedom-7',
      'liberty-bell-7',
      'friendship-7',
      'aurora-7',
      'sigma-7',
      'faith-7',
    ],
  };
  for (const [relPath, missionIds] of Object.entries(RECIPROCAL)) {
    const path = join(ROOT, 'static', 'data', 'fleet', relPath + '.json');
    const obj = JSON.parse(await readFile(path, 'utf8'));
    const prev = new Set(obj.linked_missions || []);
    const before = prev.size;
    for (const id of missionIds) prev.add(id);
    obj.linked_missions = Array.from(prev).sort();
    await writeFile(path, JSON.stringify(obj, null, 2) + '\n');
    console.log(
      '  ↔ ' + relPath + ' linked_missions ' + before + ' → ' + obj.linked_missions.length,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
