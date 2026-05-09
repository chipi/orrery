#!/usr/bin/env tsx
/**
 * Scaffolds per-entry fleet detail files from `static/data/fleet/index.json`.
 *
 * One-time scaffold for Phase A of the /fleet rollout (PRD-012 v0.2 / Issue #60).
 * Reads the index.json, emits one skeleton file per entry under
 * `static/data/fleet/{category}/{id}.json`. Each skeleton is schema-compliant
 * (passes `static/data/schemas/fleet-entry.schema.json`) but minimal —
 * subsequent phases (D imagery, E mission cross-refs, I LEARN links) flesh
 * out specs, linked_missions, gallery, real link curation.
 *
 * Run once:
 *   tsx scripts/scaffold-fleet-entries.ts
 *
 * Re-running is safe: existing files are SKIPPED unless `--overwrite` is
 * passed. This protects content authored in later phases from being clobbered.
 */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const INDEX_PATH = join(ROOT, 'static/data/fleet/index.json');
const FLEET_DIR = join(ROOT, 'static/data/fleet');

type IndexEntry = {
  id: string;
  name: string;
  category: string;
  agency: string;
  country: string;
  era: string;
  epoch: string;
  status: string;
  first_flight: string;
  tagline: string;
};

const overwrite = process.argv.includes('--overwrite');

// Manufacturer guesses keyed by id; falls back to agency where unknown.
// Authored from public knowledge; refined in subsequent content phases.
const MANUFACTURERS: Record<string, string> = {
  'atlas-lv-3b': 'Convair',
  'titan-ii-glv': 'Martin Marietta',
  'r-7-vostok': 'OKB-1',
  'saturn-ib': 'Chrysler / Douglas / IBM',
  'saturn-v': 'Boeing / North American Aviation / Douglas',
  n1: 'OKB-1',
  'soyuz-u': 'Progress Rocket Space Centre',
  'space-shuttle-stack': 'Rockwell / Lockheed / Thiokol',
  energia: 'NPO Energia',
  'proton-m': 'Khrunichev',
  'ariane-5': 'ArianeGroup / Airbus Defence and Space',
  'soyuz-fg': 'Progress Rocket Space Centre',
  'atlas-v': 'United Launch Alliance',
  'long-march-2f': 'CALT',
  'h-iia': 'Mitsubishi Heavy Industries',
  'falcon-9': 'SpaceX',
  'long-march-5': 'CALT',
  'falcon-heavy': 'SpaceX',
  lvm3: 'ISRO',
  'long-march-7': 'CALT',
  h3: 'Mitsubishi Heavy Industries',
  'ariane-6': 'ArianeGroup',
  'sls-block-1': 'Boeing / Northrop Grumman / Aerojet Rocketdyne',
  vostok: 'OKB-1',
  voskhod: 'OKB-1',
  'mercury-capsule': 'McDonnell Aircraft',
  gemini: 'McDonnell Aircraft',
  'soyuz-7k-ok': 'OKB-1',
  'apollo-csm-block-ii': 'North American Aviation',
  'apollo-lm': 'Grumman',
  'soyuz-t': 'NPO Energia',
  'space-shuttle-orbiter': 'Rockwell International',
  buran: 'Molniya NPO',
  'soyuz-tm': 'RKK Energia',
  'soyuz-tma': 'RKK Energia',
  shenzhou: 'CAST',
  'soyuz-ms': 'RKK Energia',
  starliner: 'Boeing',
  'crew-dragon': 'SpaceX',
  'new-shepard': 'Blue Origin',
  orion: 'Lockheed Martin / Airbus Defence and Space',
  gaganyaan: 'HAL / ISRO',
  'progress-7k-tg': 'NPO Energia',
  'progress-m': 'RKK Energia',
  atv: 'Astrium / Airbus',
  htv: 'Mitsubishi Heavy Industries',
  'cargo-dragon-v1': 'SpaceX',
  'cygnus-standard': 'Orbital ATK',
  'progress-ms': 'RKK Energia',
  'cygnus-enhanced': 'Northrop Grumman',
  'cargo-dragon-2': 'SpaceX',
  tianzhou: 'CAST',
  'htv-x': 'Mitsubishi Heavy Industries',
  'salyut-1': 'OKB-1',
  skylab: 'McDonnell Douglas',
  'salyut-6': 'NPO Energia',
  'salyut-7': 'NPO Energia',
  mir: 'NPO Energia',
  iss: 'Boeing / RKK Energia / Airbus / Mitsubishi Electric',
  'tiangong-1': 'CAST',
  'tiangong-2': 'CAST',
  tiangong: 'CAST',
  'lunokhod-1': 'NPO Lavochkin',
  'lrv-apollo': 'Boeing / GM Defense Research Labs',
  'lunokhod-2': 'NPO Lavochkin',
  sojourner: 'NASA JPL',
  spirit: 'NASA JPL',
  opportunity: 'NASA JPL',
  yutu: 'CAST',
  curiosity: 'NASA JPL',
  'yutu-2': 'CAST',
  perseverance: 'NASA JPL',
  zhurong: 'CAST',
  pragyan: 'ISRO',
  'luna-9': 'OKB-301 / NPO Lavochkin',
  'surveyor-3': 'Hughes Aircraft',
  'venera-7': 'NPO Lavochkin',
  'mars-2': 'NPO Lavochkin',
  'mars-3': 'NPO Lavochkin',
  'luna-16': 'NPO Lavochkin',
  'viking-1': 'Martin Marietta',
  'mars-polar-lander': 'Lockheed Martin',
  phoenix: 'Lockheed Martin',
  'change-3': 'CAST',
  'change-4': 'CAST',
  schiaparelli: 'Thales Alenia Space',
  insight: 'Lockheed Martin',
  beresheet: 'IAI / SpaceIL',
  'change-5': 'CAST',
  'vikram-cy2': 'ISRO',
  'hakuto-r': 'ispace',
  slim: 'Mitsubishi Electric',
  'vikram-cy3': 'ISRO',
  'im-1-odysseus': 'Intuitive Machines',
  'mariner-4': 'NASA JPL',
  'mariner-9': 'NASA JPL',
  'pioneer-10': 'TRW',
  'voyager-1': 'NASA JPL',
  'voyager-2': 'NASA JPL',
  'phobos-2': 'NPO Lavochkin',
  magellan: 'Martin Marietta',
  galileo: 'NASA JPL',
  cassini: 'NASA JPL / Alenia Spazio',
  'mars-express': 'EADS Astrium',
  rosetta: 'EADS Astrium',
  mro: 'Lockheed Martin',
  'change-2': 'CAST',
  juno: 'Lockheed Martin',
  mangalyaan: 'ISRO',
  'hayabusa-2': 'NEC',
  'osiris-rex': 'Lockheed Martin',
  dart: 'Johns Hopkins APL',
  hubble: 'Lockheed Martin / Perkin-Elmer',
  'compton-gro': 'TRW',
  'xmm-newton': 'Airbus Defence and Space',
  chandra: 'TRW / Northrop Grumman',
  spitzer: 'Lockheed Martin',
  kepler: 'Ball Aerospace',
  gaia: 'Airbus Defence and Space',
  hitomi: 'Mitsubishi Electric',
  tess: 'Orbital ATK',
  'spektr-rg': 'NPO Lavochkin',
  jwst: 'Northrop Grumman / Goddard Space Flight Center',
  euclid: 'Airbus Defence and Space / Thales Alenia Space',
};

// Stations with their own dedicated explorer routes.
const EXPLORER_ROUTES: Record<string, string> = {
  iss: '/iss',
  tiangong: '/tiangong',
};

// Wikipedia article slug for each id when not derivable trivially from name.
// Only used when the id-based slug needs an override.
const WIKIPEDIA_SLUGS: Record<string, string> = {
  'r-7-vostok': 'Vostok-K',
  'space-shuttle-stack': 'Space_Shuttle',
  'space-shuttle-orbiter': 'Space_Shuttle_orbiter',
  'long-march-2f': 'Long_March_2F',
  'long-march-5': 'Long_March_5',
  'long-march-7': 'Long_March_7',
  'h-iia': 'H-IIA',
  h3: 'H3_(rocket)',
  'falcon-9': 'Falcon_9',
  'falcon-heavy': 'Falcon_Heavy',
  lvm3: 'LVM3',
  'sls-block-1': 'Space_Launch_System',
  'soyuz-7k-ok': 'Soyuz_7K-OK',
  'soyuz-t': 'Soyuz-T',
  'soyuz-tm': 'Soyuz-TM',
  'soyuz-tma': 'Soyuz-TMA',
  'soyuz-ms': 'Soyuz_MS',
  'soyuz-fg': 'Soyuz-FG',
  'soyuz-u': 'Soyuz-U',
  'apollo-csm-block-ii': 'Apollo_command_and_service_module',
  'apollo-lm': 'Apollo_Lunar_Module',
  'mercury-capsule': 'Project_Mercury',
  gemini: 'Project_Gemini',
  'crew-dragon': 'SpaceX_Dragon_2',
  'cargo-dragon-v1': 'SpaceX_Dragon',
  'cargo-dragon-2': 'SpaceX_Dragon_2',
  'cygnus-standard': 'Cygnus_(spacecraft)',
  'cygnus-enhanced': 'Cygnus_(spacecraft)',
  'progress-7k-tg': 'Progress_(spacecraft)',
  'progress-m': 'Progress-M',
  'progress-ms': 'Progress-MS',
  'lrv-apollo': 'Lunar_Roving_Vehicle',
  'lunokhod-1': 'Lunokhod_1',
  'lunokhod-2': 'Lunokhod_2',
  yutu: 'Yutu_(rover)',
  'yutu-2': 'Yutu-2',
  'mariner-4': 'Mariner_4',
  'mariner-9': 'Mariner_9',
  'pioneer-10': 'Pioneer_10',
  'voyager-1': 'Voyager_1',
  'voyager-2': 'Voyager_2',
  'phobos-2': 'Phobos_2',
  galileo: 'Galileo_(spacecraft)',
  cassini: 'Cassini%E2%80%93Huygens',
  rosetta: 'Rosetta_(spacecraft)',
  mro: 'Mars_Reconnaissance_Orbiter',
  'mars-express': 'Mars_Express',
  juno: 'Juno_(spacecraft)',
  'change-2': 'Chang%27e_2',
  'change-3': 'Chang%27e_3',
  'change-4': 'Chang%27e_4',
  'change-5': 'Chang%27e_5',
  'hayabusa-2': 'Hayabusa2',
  mangalyaan: 'Mars_Orbiter_Mission',
  'osiris-rex': 'OSIRIS-REx',
  dart: 'Double_Asteroid_Redirection_Test',
  hubble: 'Hubble_Space_Telescope',
  'compton-gro': 'Compton_Gamma_Ray_Observatory',
  'xmm-newton': 'XMM-Newton',
  chandra: 'Chandra_X-ray_Observatory',
  spitzer: 'Spitzer_Space_Telescope',
  kepler: 'Kepler_space_telescope',
  gaia: 'Gaia_(spacecraft)',
  hitomi: 'Hitomi_(satellite)',
  tess: 'Transiting_Exoplanet_Survey_Satellite',
  'spektr-rg': 'Spektr-RG',
  jwst: 'James_Webb_Space_Telescope',
  euclid: 'Euclid_(spacecraft)',
  'mars-2': 'Mars_2',
  'mars-3': 'Mars_3',
  'luna-9': 'Luna_9',
  'luna-16': 'Luna_16',
  'venera-7': 'Venera_7',
  'surveyor-3': 'Surveyor_3',
  'viking-1': 'Viking_1',
  'mars-polar-lander': 'Mars_Polar_Lander',
  phoenix: 'Phoenix_(spacecraft)',
  insight: 'InSight',
  beresheet: 'Beresheet',
  'vikram-cy2': 'Chandrayaan-2',
  'vikram-cy3': 'Chandrayaan-3',
  'hakuto-r': 'Hakuto-R',
  slim: 'Smart_Lander_for_Investigating_Moon',
  'im-1-odysseus': 'IM-1',
  schiaparelli: 'Schiaparelli_EDM',
  'salyut-1': 'Salyut_1',
  'salyut-6': 'Salyut_6',
  'salyut-7': 'Salyut_7',
  skylab: 'Skylab',
  mir: 'Mir',
  iss: 'International_Space_Station',
  'tiangong-1': 'Tiangong-1',
  'tiangong-2': 'Tiangong-2',
  tiangong: 'Tiangong_space_station',
  'atlas-lv-3b': 'Atlas_LV-3B',
  'titan-ii-glv': 'Titan_II_GLV',
  'saturn-ib': 'Saturn_IB',
  'saturn-v': 'Saturn_V',
  n1: 'N1_(rocket)',
  energia: 'Energia_(rocket)',
  'proton-m': 'Proton-M',
  'ariane-5': 'Ariane_5',
  'ariane-6': 'Ariane_6',
  'atlas-v': 'Atlas_V',
  buran: 'Buran-class_orbiter',
  starliner: 'Boeing_Starliner',
  vostok: 'Vostok_(spacecraft)',
  voskhod: 'Voskhod_(spacecraft)',
  shenzhou: 'Shenzhou_(spacecraft)',
  'new-shepard': 'New_Shepard',
  orion: 'Orion_(spacecraft)',
  gaganyaan: 'Gaganyaan',
  atv: 'Automated_Transfer_Vehicle',
  htv: 'H-II_Transfer_Vehicle',
  'htv-x': 'HTV-X',
  tianzhou: 'Tianzhou_(spacecraft)',
  sojourner: 'Sojourner_(rover)',
  spirit: 'Spirit_(rover)',
  opportunity: 'Opportunity_(rover)',
  curiosity: 'Curiosity_(rover)',
  perseverance: 'Perseverance_(rover)',
  zhurong: 'Zhurong_(rover)',
  pragyan: 'Pragyan_(rover)',
  magellan: 'Magellan_(spacecraft)',
};

function wikiUrl(id: string, name: string): string {
  const slug = WIKIPEDIA_SLUGS[id] ?? name.replace(/ /g, '_');
  return `https://en.wikipedia.org/wiki/${slug}`;
}

function manufacturer(id: string, agency: string): string {
  return MANUFACTURERS[id] ?? agency;
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const indexJson = JSON.parse(await readFile(INDEX_PATH, 'utf-8')) as IndexEntry[];
  let written = 0;
  let skipped = 0;

  for (const entry of indexJson) {
    const dir = join(FLEET_DIR, entry.category);
    const file = join(dir, `${entry.id}.json`);

    if ((await exists(file)) && !overwrite) {
      skipped += 1;
      continue;
    }

    await mkdir(dir, { recursive: true });

    const skeleton: Record<string, unknown> = {
      id: entry.id,
      name: entry.name,
      category: entry.category,
      agency: entry.agency,
      country: entry.country,
      manufacturer: manufacturer(entry.id, entry.agency),
      first_flight: entry.first_flight,
      status: entry.status,
      era: entry.era,
      epoch: entry.epoch,
      best_known_for: entry.tagline,
      credit: `Skeleton entry for /fleet (PRD-012 v0.2 / Phase A scaffold). Builder + agency + first-flight per public sources. Specs and gallery TBD in later phases.`,
      links: [
        {
          l: `${entry.name} — Wikipedia`,
          u: wikiUrl(entry.id, entry.name),
          t: 'intro' as const,
        },
      ],
    };

    if (EXPLORER_ROUTES[entry.id]) {
      skeleton.explorer_route = EXPLORER_ROUTES[entry.id];
    }

    await writeFile(file, JSON.stringify(skeleton, null, 2) + '\n', 'utf-8');
    written += 1;
  }

  console.log(`scaffolded ${written} entries, skipped ${skipped} (use --overwrite to replace)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
