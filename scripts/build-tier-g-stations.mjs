#!/usr/bin/env node
/**
 * Tier G — pre-ISS Soviet stations Salyut 2/3/4/5 not yet in fleet.
 * Per GH #311 Tier G follow-up.
 *
 * Same pattern as scripts/build-tier-{b,c}-fleet.mjs.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FLEET_ROOT = join(ROOT, 'static', 'data', 'fleet');
const I18N_ROOT = join(ROOT, 'static', 'data', 'i18n');

const ENTRIES = [
  {
    id: 'salyut-2',
    name: 'Salyut 2 (OPS-1)',
    category: 'station',
    agency: 'Roscosmos',
    country: 'USSR',
    manufacturer: 'OKB-52 (TsKBM Chelomey)',
    color: '#cc4444',
    first_flight: '1973-04-03',
    status: 'RETIRED',
    era: '1969-1981',
    epoch: 'lunar-era',
    tagline:
      'First Almaz military station — depressurised on orbit before any crew arrived; reentered 1973-05-28 after 54 days',
    description:
      "The first of the three Soviet military Almaz space stations — publicly called Salyut 2 to disguise its real purpose (DoD-style reconnaissance, with a 6.4-m focal-length panoramic camera and a film-return capsule). Launched 1973-04-03 on a Proton-K from Baikonur, Salyut 2 reached orbit successfully but its attitude-control system tumbled the station 11 days later (1973-04-14), and a sudden depressurisation on the 13th day rendered it unusable before any crew could be sent. The planned crew (Pavel Popovich + Yury Artyukhin) instead flew on Salyut 3 the following year. Salyut 2 reentered the atmosphere 1973-05-28 — the shortest-lived station program in history at that point. Its existence as a military station was only declassified after the Soviet Union's collapse.",
    links: [
      {
        l: 'Salyut 2 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Salyut_2',
        t: 'intro',
      },
      {
        l: 'Almaz program — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Almaz',
        t: 'core',
      },
    ],
  },
  {
    id: 'salyut-3',
    name: 'Salyut 3 (OPS-2)',
    category: 'station',
    agency: 'Roscosmos',
    country: 'USSR',
    manufacturer: 'OKB-52 (TsKBM Chelomey)',
    color: '#cc4444',
    first_flight: '1974-06-25',
    status: 'RETIRED',
    era: '1969-1981',
    epoch: 'lunar-era',
    tagline:
      'Second Almaz military station — Soyuz 14 crew Jul 1974; Soyuz 15 failed automatic docking; reportedly tested an onboard cannon 1975-01-24',
    description:
      "The second Soviet military Almaz station — again publicly called Salyut 3 to mask its surveillance role. Launched 1974-06-25 on a Proton-K, Salyut 3 hosted one short crew mission (Soyuz 14, Popovich + Artyukhin, 15 days, 1974-07-03 to 1974-07-19) which exercised the station's 6.4-m Agat camera + film-return capsule. A second crew attempt (Soyuz 15, Sarafanov + Demin, 1974-08-26) failed the automatic Igla rendezvous and returned the same day. Just before deorbit on 1975-01-24, Salyut 3 reportedly test-fired its onboard 23-mm Rikhter R-23M cannon — the only known instance of a weapon firing in space (recoil was absorbed by the station's attitude-control thrusters; the round disintegrated in the atmosphere). Reentered the atmosphere 1975-01-24.",
    links: [
      {
        l: 'Salyut 3 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Salyut_3',
        t: 'intro',
      },
      {
        l: 'Almaz program — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Almaz',
        t: 'core',
      },
      {
        l: 'Rikhter R-23M autocannon — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Rikhter_R-23',
        t: 'deep',
      },
    ],
  },
  {
    id: 'salyut-4',
    name: 'Salyut 4 (DOS-4)',
    category: 'station',
    agency: 'Roscosmos',
    country: 'USSR',
    manufacturer: 'TsKBEM (Korolev)',
    color: '#cc4444',
    first_flight: '1974-12-26',
    status: 'RETIRED',
    era: '1969-1981',
    epoch: 'lunar-era',
    tagline:
      'Civilian DOS-4 station — hosted Soyuz 17 (30 days) + Soyuz 18 (63 days, then-longest spaceflight) crews; deorbited 1977-02-03',
    description:
      'The fourth civilian Salyut (DOS-4), built by the Korolev bureau and operated by the Soviet civilian space programme rather than the military Almaz line. Launched 1974-12-26 on a Proton-K, Salyut 4 carried a 25-cm OST-1 solar telescope, an X-ray telescope, and a complement of life-sciences experiments. Hosted two long-duration crews: Soyuz 17 (Gubarev + Grechko, 30 days, 1975-01-11 to 1975-02-09) and Soyuz 18 (Klimuk + Sevastyanov, 63 days, 1975-05-24 to 1975-07-26, then the longest crewed spaceflight in history). A third attempt — Soyuz 18a (Lazarev + Makarov, 1975-04-05) — suffered a 21-g booster failure during launch, returning the crew safely after the highest-ever landing g-load survived by humans. Salyut 4 hosted Soyuz 20, an automated dog/biological-experiment 3-month visit, before re-entering on 1977-02-03 after 26 months.',
    links: [
      {
        l: 'Salyut 4 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Salyut_4',
        t: 'intro',
      },
      {
        l: 'Soyuz 18a abort — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Soyuz_18a',
        t: 'core',
      },
    ],
  },
  {
    id: 'salyut-5',
    name: 'Salyut 5 (OPS-3)',
    category: 'station',
    agency: 'Roscosmos',
    country: 'USSR',
    manufacturer: 'OKB-52 (TsKBM Chelomey)',
    color: '#cc4444',
    first_flight: '1976-06-22',
    status: 'RETIRED',
    era: '1969-1981',
    epoch: 'lunar-era',
    tagline:
      'Last Almaz military station — Soyuz 21 + Soyuz 24 crews; Soyuz 23 failed approach; reentered 1977-08-08 after 412 days',
    description:
      "The third and last Soviet military Almaz station. Launched 1976-06-22 on a Proton-K, Salyut 5 hosted two crews: Soyuz 21 (Volynov + Zholobov, 48 days, 1976-07-06 to 1976-08-24 — cut short by acrid odours the crew traced to a corroded film-return capsule seal) and Soyuz 24 (Gorbatko + Glazkov, 17 days, 1977-02-07 to 1977-02-25 — first cosmonauts to swap a station's atmosphere through vent + recharge). Soyuz 23 (Zudov + Rozhdestvensky, 1976-10-14) failed to dock after the Igla rendezvous system malfunctioned; the crew survived a high-water splashdown in Lake Tengiz, the only Soviet water landing. Salyut 5 was the last Almaz mission flown — the program was cancelled after the station deorbited on 1977-08-08.",
    links: [
      {
        l: 'Salyut 5 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Salyut_5',
        t: 'intro',
      },
      {
        l: 'Almaz program — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Almaz',
        t: 'core',
      },
    ],
  },
];

function buildBase(e) {
  return {
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
    linked_missions: [],
    linked_sites: [],
  };
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
    const base = buildBase(e);
    const overlay = buildOverlay(e);
    const detailPath = join(FLEET_ROOT, e.category, e.id + '.json');
    await mkdir(dirname(detailPath), { recursive: true });
    await writeFile(detailPath, JSON.stringify(base, null, 2) + '\n');
    const overlayPath = join(I18N_ROOT, 'en-US', 'fleet', e.category, e.id + '.json');
    await mkdir(dirname(overlayPath), { recursive: true });
    await writeFile(overlayPath, JSON.stringify(overlay, null, 2) + '\n');
    console.log('✓ ' + e.id.padEnd(12) + ' — ' + e.tagline.length + ' chars');

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
    if (typeof galleries[e.id] !== 'number') {
      galleries[e.id] = 5;
    }
  }

  await writeFile(fleetIndexPath, JSON.stringify(fleetIndex, null, 2) + '\n');
  await writeFile(galleriesPath, JSON.stringify(galleries, null, 2) + '\n');
  console.log('\n✓ fleet/index.json + fleet-galleries.json updated');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
