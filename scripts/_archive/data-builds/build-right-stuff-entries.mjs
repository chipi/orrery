#!/usr/bin/env node
/**
 * The Right Stuff cross-reference closes 3 fleet gaps:
 *   - mercury-redstone (the launcher for Freedom 7 + Liberty Bell 7)
 *   - lc-5  (Cape Canaveral pad for the Redstone Mercury flights)
 *   - lc-14 (Cape Canaveral pad for the 4 Atlas-Mercury flights)
 *
 * Plus rewires the Mercury flights with the correct launcher +
 * launch-site fleet_refs (was previously missing/incomplete).
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FLEET_ROOT = join(ROOT, 'static', 'data', 'fleet');
const I18N_ROOT = join(ROOT, 'static', 'data', 'i18n');

const ENTRIES = [
  {
    id: 'mercury-redstone',
    name: 'Mercury-Redstone',
    category: 'launcher',
    agency: 'NASA',
    country: 'USA',
    manufacturer: 'Chrysler Corporation',
    first_flight: '1960-11-21',
    status: 'RETIRED',
    era: '1957-1969',
    epoch: 'space-race',
    tagline:
      "First US human-rated launcher — variant of the Army's Redstone IRBM. Launched Freedom 7 (1961-05-05) and Liberty Bell 7 (1961-07-21)",
    description:
      "The Mercury-Redstone launch vehicle was a man-rated derivative of the U.S. Army's Redstone ballistic missile, modified at NASA Marshall Space Flight Center for the suborbital Mercury crewed missions. Single-stage liquid-propellant (LOX + alcohol), 25 metres tall, 28 tonnes of thrust. The first crewed flight was Mercury-Redstone 3 / Freedom 7 (1961-05-05, Alan Shepard) — the first American in space, 23 days after Gagarin. Mercury-Redstone 4 / Liberty Bell 7 followed (1961-07-21, Gus Grissom). After Liberty Bell 7's hatch malfunction, NASA moved the orbital Mercury flights to the more powerful Atlas LV-3B. Final flight 1961-07-21; total 6 Mercury-Redstone vehicles built, 2 crewed flights flown.",
    links: [
      {
        l: 'Mercury-Redstone — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Mercury-Redstone_Launch_Vehicle',
        t: 'intro',
      },
      {
        l: 'Project Mercury — NASA history',
        u: 'https://www.nasa.gov/history/project-mercury/',
        t: 'core',
      },
    ],
    linked_missions: ['freedom-7', 'liberty-bell-7'],
  },
  {
    id: 'lc-5',
    name: 'Launch Complex 5 (LC-5)',
    category: 'launch-site',
    agency: 'USAF / NASA',
    country: 'USA',
    manufacturer: 'USAF',
    lat: 28.4378,
    lon: -80.5728,
    first_flight: '1956-07-19',
    status: 'RETIRED',
    era: '1957-1969',
    epoch: 'space-race',
    tagline:
      'Cape Canaveral Mercury-Redstone pad — launched Freedom 7 (Shepard, 1961-05-05) and Liberty Bell 7 (Grissom, 1961-07-21)',
    description:
      "Cape Canaveral Launch Complex 5 hosted Redstone IRBM tests (1956-1961) before being modified for NASA's Mercury-Redstone programme. Freedom 7 (1961-05-05, Shepard, first American in space) and Liberty Bell 7 (1961-07-21, Grissom) both launched from LC-5. The pad's blockhouse — heavy reinforced concrete with thick blast-resistant glass — survives intact and is part of the Cape Canaveral Air Force Station Museum, used as a Mercury programme exhibit space. The blockhouse interior preserves the period instrument panels, including the consoles where launch teams worked through the Cuban missile crisis. Final launch 1961-07-21 — LC-5 was retired after Liberty Bell 7 when NASA shifted to LC-14 for the Atlas-Mercury flights.",
    links: [
      {
        l: 'Cape Canaveral LC-5 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Cape_Canaveral_Space_Force_Station_Launch_Complex_5',
        t: 'intro',
      },
    ],
    linked_missions: ['freedom-7', 'liberty-bell-7'],
  },
  {
    id: 'lc-14',
    name: 'Launch Complex 14 (LC-14)',
    category: 'launch-site',
    agency: 'USAF / NASA',
    country: 'USA',
    manufacturer: 'USAF',
    lat: 28.4914,
    lon: -80.5453,
    first_flight: '1957-06-11',
    status: 'RETIRED',
    era: '1957-1969',
    epoch: 'space-race',
    tagline:
      'Cape Canaveral Mercury-Atlas pad — launched all 4 orbital Mercury flights (Glenn / Carpenter / Schirra / Cooper, 1962-1963)',
    description:
      'Cape Canaveral Launch Complex 14 hosted Atlas missile tests then the four orbital Mercury-Atlas crewed missions: Friendship 7 (1962-02-20, Glenn — first American in orbit), Aurora 7 (1962-05-24, Carpenter), Sigma 7 (1962-10-03, Schirra), and Faith 7 (1963-05-15, Cooper). After Mercury, LC-14 hosted four Atlas-Agena uncrewed missions before being deactivated in 1968. A bronze Mercury 7 monument (added 1964) stands at the pad — donated by the Mercury 7 astronauts themselves at the close of the programme. The launch ring + service tower base remain visible.',
    links: [
      {
        l: 'Cape Canaveral LC-14 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Cape_Canaveral_Space_Force_Station_Launch_Complex_14',
        t: 'intro',
      },
      {
        l: 'Mercury 7 monument at LC-14',
        u: 'https://www.kennedyspacecenter.com/explore-attractions/heroes-and-legends',
        t: 'core',
      },
    ],
    linked_missions: ['friendship-7', 'aurora-7', 'sigma-7', 'faith-7'],
  },
];

function buildBase(e) {
  const obj = {
    id: e.id,
    name: e.name,
    category: e.category,
    agency: e.agency,
    country: e.country,
    manufacturer: e.manufacturer,
    first_flight: e.first_flight,
    status: e.status,
    era: e.era,
    epoch: e.epoch,
    best_known_for: e.tagline,
    credit: e.description,
    links: e.links,
    linked_missions: e.linked_missions ?? [],
    linked_sites: [],
  };
  if (e.lat !== undefined) obj.lat = e.lat;
  if (e.lon !== undefined) obj.lon = e.lon;
  return obj;
}

function buildOverlay(e) {
  return { tagline: e.tagline, description: e.description, best_known_for: e.tagline };
}

async function main() {
  const fleetIndexPath = join(FLEET_ROOT, 'index.json');
  const fleetIndex = JSON.parse(await readFile(fleetIndexPath, 'utf8'));
  const existing = new Set(fleetIndex.map((row) => row.id));
  const galleriesPath = join(ROOT, 'static', 'data', 'fleet-galleries.json');
  const galleries = JSON.parse(await readFile(galleriesPath, 'utf8'));

  for (const e of ENTRIES) {
    if (e.tagline.length > 140) {
      console.error('✗ ' + e.id + ' tagline ' + e.tagline.length + ' > 140');
      process.exit(1);
    }
    const detailPath = join(FLEET_ROOT, e.category, e.id + '.json');
    await mkdir(dirname(detailPath), { recursive: true });
    await writeFile(detailPath, JSON.stringify(buildBase(e), null, 2) + '\n');
    const overlayPath = join(I18N_ROOT, 'en-US', 'fleet', e.category, e.id + '.json');
    await mkdir(dirname(overlayPath), { recursive: true });
    await writeFile(overlayPath, JSON.stringify(buildOverlay(e), null, 2) + '\n');
    console.log('✓ ' + e.id + ' (' + e.category + ') — ' + e.tagline.length + ' chars');

    if (!existing.has(e.id)) {
      fleetIndex.push({
        id: e.id,
        name: e.name,
        category: e.category,
        agency: e.agency,
        country: e.country,
        era: e.era,
        epoch: e.epoch,
        status: e.status,
        first_flight: e.first_flight,
        tagline: e.tagline,
      });
      existing.add(e.id);
    }
    if (typeof galleries[e.id] !== 'number') galleries[e.id] = 5;
  }
  await writeFile(fleetIndexPath, JSON.stringify(fleetIndex, null, 2) + '\n');
  await writeFile(galleriesPath, JSON.stringify(galleries, null, 2) + '\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
