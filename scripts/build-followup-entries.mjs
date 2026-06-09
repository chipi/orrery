#!/usr/bin/env node
/**
 * Two follow-up fleet entries surfaced in the Tier-G retro:
 *   - lc-34 — Cape Canaveral launch complex (Apollo 1 fire + Apollo 7
 *             launch); was missing from the fleet, blocking the
 *             apollo7 mission from carrying a launch-site fleet_ref
 *   - mars2-orbiter — Soviet Mars 2 mission's successful orbiter half;
 *             companion to the failed Mars 2 lander (already in fleet)
 *
 * Same shape as Tier B/C/D/G builders.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FLEET_ROOT = join(ROOT, 'static', 'data', 'fleet');
const I18N_ROOT = join(ROOT, 'static', 'data', 'i18n');

const ENTRIES = [
  {
    id: 'lc-34',
    name: 'Launch Complex 34 (LC-34)',
    category: 'launch-site',
    agency: 'NASA',
    country: 'USA',
    manufacturer: 'USAF / NASA',
    lat: 28.5217,
    lon: -80.5614,
    first_flight: '1961-10-27',
    status: 'RETIRED',
    era: '1957-1969',
    epoch: 'space-race',
    site_id: null,
    linked_mission: 'apollo7',
    tagline:
      'NASA pad at Cape Canaveral (1961-68) — first Saturn I; Apollo 1 fire site 1967-01-27; Apollo 7 first crewed launch 1968-10-11',
    description:
      "Cape Canaveral Launch Complex 34 served NASA from 1961-10-27 (first Saturn I, SA-1) through 1968-10-11 (Apollo 7, the first crewed Apollo flight). LC-34's single steel umbilical tower hosted four uncrewed Saturn I flights then was reconstructed for Saturn IB. On 1967-01-27 during a Plugs-Out test of Apollo 1 — the planned first crewed Block I CSM flight — a flash fire in the pure-O₂ cabin killed Gus Grissom, Ed White, and Roger Chaffee in seconds. The pad was rebuilt for Apollo 7 (1968-10-11) which launched the first crewed Apollo flight, then deactivated 1968-11. The pad's concrete deluge ring + main flame trench still stand; a memorial plaque on site reads \"They gave their lives in service to their country in the ongoing exploration of humankind's final frontier.\"",
    links: [
      {
        l: 'Cape Canaveral LC-34 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Cape_Canaveral_Space_Force_Station_Launch_Complex_34',
        t: 'intro',
      },
      {
        l: 'Apollo 1 — NASA history',
        u: 'https://www.nasa.gov/history/apollo-1/',
        t: 'core',
      },
    ],
  },
  {
    id: 'mars2-orbiter',
    name: 'Mars 2 Orbiter',
    category: 'orbiter',
    agency: 'Roscosmos',
    country: 'USSR',
    manufacturer: 'NPO Lavochkin',
    first_flight: '1971-05-19',
    status: 'RETIRED',
    era: '1969-1981',
    epoch: 'lunar-era',
    site_id: 'mars2',
    linked_mission: null,
    tagline:
      'Soviet companion orbiter to Mars 2 — second spacecraft ever in Mars orbit (after Mariner 9 by 2 weeks). Operated 1971-11-27 to 1972-08',
    description:
      "The orbital half of the Soviet Mars 2 mission. Launched 1971-05-19 on a Proton-K from Baikonur, Mars 2 reached Mars 1971-11-27 — just 13 days after Mariner 9 became the first Mars orbiter. Its lander attempted descent on 1971-11-27 but its parachute failed to deploy and the lander crashed (the first man-made object on Mars, but no telemetry). The orbiter half was much more successful, returning ~60 image frames + extensive measurements of the upper atmosphere, magnetic field, and surface temperatures during the same global dust storm that compromised Mariner 9's early imaging. Carried infrared and ultraviolet spectrometers, photometers, a Lyman-alpha sensor, magnetometer, plasma analyser, and cosmic-ray detectors — the same instrument suite as Mars 3 Orbiter. End of mission 1972-08-22 after 362 orbits.",
    links: [
      {
        l: 'Mars 2 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Mars_2',
        t: 'intro',
      },
      {
        l: 'Mars 2 — NASA / NSSDCA',
        u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-045A',
        t: 'core',
      },
    ],
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
    linked_missions: e.linked_mission ? [e.linked_mission] : [],
    linked_sites: e.site_id ? [{ type: 'mars', site_id: e.site_id }] : [],
  };
  if (e.lat !== undefined) obj.lat = e.lat;
  if (e.lon !== undefined) obj.lon = e.lon;
  return obj;
}

function buildOverlay(e) {
  return {
    tagline: e.tagline,
    description: e.description,
    best_known_for: e.tagline,
  };
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

  // Wire apollo7 mission → fleet_refs incl. lc-34
  const a7Path = join(ROOT, 'static', 'data', 'missions', 'earth', 'apollo7.json');
  const a7 = JSON.parse(await readFile(a7Path, 'utf8'));
  a7.fleet_refs = a7.fleet_refs || [];
  if (!a7.fleet_refs.some((r) => r.id === 'lc-34')) {
    a7.fleet_refs.push({ id: 'lc-34', role: 'launch-site' });
    await writeFile(a7Path, JSON.stringify(a7, null, 2) + '\n');
    console.log('  ↔ apollo7 mission → fleet_refs: + lc-34');
  }

  // Wire mars2 mars-site → fleet_refs incl. mars2-orbiter
  const marsSitesPath = join(ROOT, 'static', 'data', 'mars-sites.json');
  const sites = JSON.parse(await readFile(marsSitesPath, 'utf8'));
  for (const s of sites) {
    if (s.id !== 'mars2') continue;
    s.fleet_refs = s.fleet_refs || [];
    if (!s.fleet_refs.some((r) => r.id === 'mars2-orbiter')) {
      s.fleet_refs.push({ id: 'mars2-orbiter', role: 'spacecraft' });
      console.log('  ↔ mars-site mars2 → fleet_refs: + mars2-orbiter');
    }
  }
  await writeFile(marsSitesPath, JSON.stringify(sites, null, 2) + '\n');

  // Reciprocal linked_missions on lc-34 fleet entry
  const lcPath = join(FLEET_ROOT, 'launch-site', 'lc-34.json');
  const lc = JSON.parse(await readFile(lcPath, 'utf8'));
  if (!lc.linked_missions.includes('apollo7')) {
    lc.linked_missions.push('apollo7');
    await writeFile(lcPath, JSON.stringify(lc, null, 2) + '\n');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
