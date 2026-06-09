#!/usr/bin/env node
/**
 * Fleet entries needed by Slice A mission fleet_refs that didn't exist:
 *   - vostok-k         (Vostok 1's launcher)
 *   - voskhod-11a57    (Voskhod 2's launcher)
 *   - gagarins-start   (Baikonur Site 1 — used by Vostok 1 + Voskhod 2 + every Soyuz crew through MS-22)
 *   - apollo-csm-block-i (Apollo 1's spacecraft variant — never flew crewed)
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FLEET_ROOT = join(ROOT, 'static', 'data', 'fleet');
const I18N_ROOT = join(ROOT, 'static', 'data', 'i18n');

const ROSCOSMOS = '#cc4444';
const NASA = '#0B3D91';

const ENTRIES = [
  {
    id: 'vostok-k',
    name: 'Vostok-K (8K72K)',
    category: 'launcher',
    agency: 'Roscosmos',
    country: 'USSR',
    manufacturer: 'OKB-1 Korolev Bureau',
    color: ROSCOSMOS,
    first_flight: '1960-12-22',
    status: 'RETIRED',
    era: '1957-1969',
    epoch: 'space-race',
    tagline:
      'Soviet R-7-derived launcher that put Gagarin in space — Vostok 1 (1961-04-12) and 5 more Vostok flights through 1963',
    description:
      "Vostok-K (GRAU index 8K72K) was the human-rated derivative of Korolev's R-7 ICBM, with a Blok-E upper stage and crew-rated parameters. Three-stage liquid-propellant (LOX + kerosene), 38 metres tall, 287 tonnes lift-off mass. Launched all six crewed Vostok flights (1-6, 1961-1963) plus a handful of uncrewed precursors. Reliability evolved from early R-7 teething problems (3 of 6 first-stage failures before Gagarin) to perfect record across the crewed series. The Vostok-K design lineage continues today as the Soyuz-2 launcher (the only crew-capable Russian launch vehicle of 2026).",
    links: [
      { l: 'Vostok-K — Wikipedia', u: 'https://en.wikipedia.org/wiki/Vostok-K', t: 'intro' },
      {
        l: 'R-7 family — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/R-7_(rocket_family)',
        t: 'core',
      },
    ],
    linked_missions: ['vostok-1'],
  },
  {
    id: 'voskhod-11a57',
    name: 'Voskhod (11A57)',
    category: 'launcher',
    agency: 'Roscosmos',
    country: 'USSR',
    manufacturer: 'OKB-1 Korolev Bureau',
    color: ROSCOSMOS,
    first_flight: '1963-11-16',
    status: 'RETIRED',
    era: '1957-1969',
    epoch: 'space-race',
    tagline:
      'Vostok-K successor — more thrust for the heavier Voskhod capsule. Launched Voskhod 1 (1964) + Voskhod 2 (1965 Leonov EVA)',
    description:
      "Voskhod (GRAU index 11A57) was the next iteration of the R-7 family after Vostok-K, with uprated Blok-I third-stage engines for the heavier Voskhod capsule. Three-stage LOX + kerosene, 44 metres tall, 298 tonnes lift-off mass. Launched both crewed Voskhod flights (Voskhod 1 first 3-person crew in 1964; Voskhod 2 with Leonov's first EVA in 1965). After the Voskhod programme ended the 11A57 continued in service for ~300 uncrewed military / civilian satellite launches through 1976, when it was superseded by the Soyuz 11A511 line.",
    links: [
      {
        l: 'Voskhod (rocket) — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Voskhod_(rocket)',
        t: 'intro',
      },
    ],
    linked_missions: ['voskhod-2'],
  },
  {
    id: 'gagarins-start',
    name: "Gagarin's Start (Baikonur Site 1)",
    category: 'launch-site',
    agency: 'Roscosmos',
    country: 'Kazakhstan',
    manufacturer: 'OKB-1 / TsKBEM',
    color: ROSCOSMOS,
    lat: 45.9203,
    lon: 63.342,
    first_flight: '1957-05-15',
    status: 'RETIRED',
    era: '1957-1969',
    epoch: 'space-race',
    tagline:
      "Baikonur Site 1 — Sputnik 1 (1957-10-04), Gagarin's Vostok 1 (1961-04-12), every crewed Soyuz through MS-22 (2022). Retired 2019",
    description:
      'Baikonur Cosmodrome Site 1 (designation 5 in Soviet docs; nicknamed "Gagarin\'s Start" after Vostok 1) was the original R-7 ICBM launch pad and the most-flown crewed launch site in history. First launch 1957-05-15 (R-7 test); Sputnik 1 (1957-10-04 — first artificial satellite); Vostok 1 (1961-04-12 — first crewed spaceflight); every crewed Soyuz from Soyuz 1 (1967) through Soyuz MS-22 (2022) launched from Site 1. After 2019 the pad was decommissioned for an upgrade to support Soyuz-2 (the Vostok-derived Soyuz-FG was retired); subsequent ISS crews launched from Baikonur Site 31 instead. Site 1 is preserved as a historical monument. Visited by every Russian crew during pre-flight ceremonies.',
    links: [
      {
        l: 'Baikonur Site 1 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Gagarin%27s_Start',
        t: 'intro',
      },
    ],
    linked_missions: ['vostok-1', 'voskhod-2'],
  },
  {
    id: 'apollo-csm-block-i',
    name: 'Apollo CSM (Block I)',
    category: 'crewed-spacecraft',
    agency: 'NASA',
    country: 'USA',
    manufacturer: 'North American Aviation',
    color: NASA,
    first_flight: '1966-02-26',
    status: 'RETIRED',
    era: '1957-1969',
    epoch: 'space-race',
    tagline:
      'Original Apollo CSM design — never flew crewed; killed Apollo 1 crew on the pad 1967-01-27. Redesign produced the Block II flown 1968-1975',
    description:
      "Block I was the first design iteration of the Apollo Command and Service Module — intended as a pure Earth-orbit shakedown vehicle before the lunar-capable Block II. Pure-O₂ pressurised cabin at 16.7 psi pre-launch (5 psi in flight); inward-opening hatch sealed by atmospheric differential. CSM-009 + CSM-011 flew uncrewed suborbital tests (AS-201 1966-02-26 + AS-202 1966-08-25). CSM-012 — the Apollo 1 ship — was sealed for a Plugs-Out test 1967-01-27 when a flash fire ignited in the lower-equipment bay, killing the crew in seconds; the cabin couldn't be vented because the hatch opened inward against the spike to 29 psi. The Apollo 204 Accident Review Board led to the Block II redesign: outward-opening unified hatch, non-flammable cabin materials, pre-launch nitrogen-rich atmosphere, redesigned wire bundles. No Block I CSM ever flew crewed; Block II flew Apollo 7 (1968) through ASTP (1975).",
    links: [
      {
        l: 'Apollo Command and Service Module — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Apollo_command_and_service_module#Block_I',
        t: 'intro',
      },
      {
        l: 'Apollo 204 Accident Review Board report (NASA)',
        u: 'https://history.nasa.gov/Apollo204/',
        t: 'deep',
      },
    ],
    linked_missions: ['apollo-1'],
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

  // Fix apollo-1 delta_v to match the schema regex.
  const a1Path = join(ROOT, 'static', 'data', 'missions', 'earth', 'apollo-1.json');
  const a1 = JSON.parse(await readFile(a1Path, 'utf8'));
  a1.delta_v = '0 km/s (mission cancelled before flight)';
  await writeFile(a1Path, JSON.stringify(a1, null, 2) + '\n');
  console.log('✓ apollo-1.delta_v normalised');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
