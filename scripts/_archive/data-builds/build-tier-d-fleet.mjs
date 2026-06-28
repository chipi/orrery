#!/usr/bin/env node
/**
 * Build Tier D — Lunar Orbiter 1-5 (NASA, 1966-67).
 * Five robotic precursor orbiters that mapped Apollo landing sites
 * before the crewed missions arrived. Per GH #311 Tier D.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FLEET_ROOT = join(ROOT, 'static', 'data', 'fleet');
const I18N_ROOT = join(ROOT, 'static', 'data', 'i18n');

// All five used the same Boeing-built 386-kg spacecraft + Atlas-Agena D launcher.
const ENTRIES = [
  {
    id: 'lunar-orbiter-1',
    n: 1,
    launch: '1966-08-10',
    arrival: '1966-08-14',
    impact: '1966-10-29',
    tagline:
      'First US lunar orbiter (1966-08-14). Mapped potential Apollo landing sites; took the famous "Earthrise" picture three months before Apollo 8',
    description:
      "The first US spacecraft to orbit the Moon, four months after Luna 10. Launched 1966-08-10 from Cape Canaveral on an Atlas-Agena D, Lunar Orbiter 1 entered an elliptical lunar orbit on 1966-08-14. Its primary mission was to photograph candidate Apollo landing sites at sub-metre resolution — a 70 mm + 610 mm dual-lens camera system that developed film in-orbit (Bimat process) and scanned it for radio transmission to Earth. Captured the first photograph of Earth from lunar orbit (1966-08-23 — three months before Apollo 8's more famous Earthrise) as a wide-angle shot taken during the 16th orbit. Returned 207 high-resolution + 207 medium-resolution frames mapping 4.1 million km² of the lunar surface. Deliberately crashed into the lunar far side on 1966-10-29 to clear the radio band for Lunar Orbiter 2.",
  },
  {
    id: 'lunar-orbiter-2',
    n: 2,
    launch: '1966-11-06',
    arrival: '1966-11-10',
    impact: '1967-10-11',
    tagline:
      "Second US lunar orbiter (1966-11-10). Took the 'Picture of the Century' — oblique view of Copernicus crater at 9 km altitude",
    description:
      "Second of the five Lunar Orbiter spacecraft. Launched 1966-11-06 from Cape Canaveral, entered lunar orbit 1966-11-10. Mapped 13 sites in the equatorial Apollo zone. On 1966-11-24, Frame 162 captured an oblique view of the 93-km Copernicus crater from 45.8 km altitude looking north — a never-before-seen Earth-style mountain landscape on another world. Newspapers called it the 'Picture of the Century'. The photo's release became a turning point in public engagement with lunar exploration. Returned 422 frames total across 33 days of imaging. Deliberately impacted 1967-10-11 at 4° S, 98° E (lunar far side) to prevent radio-frequency interference with Lunar Orbiter 5.",
  },
  {
    id: 'lunar-orbiter-3',
    n: 3,
    launch: '1967-02-04',
    arrival: '1967-02-08',
    impact: '1967-10-09',
    tagline:
      'Third US lunar orbiter (1967-02-08). Photographed Surveyor 1 sitting on the lunar surface — first photo of a spacecraft on another world',
    description:
      "Third of the five Lunar Orbiter spacecraft. Launched 1967-02-04 from Cape Canaveral, entered lunar orbit 1967-02-08. Continued the Apollo site-mapping campaign with 477 frames across 30 days, including a celebrated 1967-02-22 photograph that resolved the 3-metre Surveyor 1 lander sitting on the Oceanus Procellarum surface — the first photograph of one spacecraft taken by another at another world. Mid-mission failure of the camera's film-transport system curtailed the imaging campaign on 1967-03-04. Continued to operate as an Apollo-tracking beacon for navigation tests. Deliberately impacted 1967-10-09 at 14.6° N, 91.7° W.",
  },
  {
    id: 'lunar-orbiter-4',
    n: 4,
    launch: '1967-05-04',
    arrival: '1967-05-08',
    impact: '1967-10-31',
    tagline:
      'Fourth US lunar orbiter (1967-05-08). First polar lunar orbit; mapped 99 % of the near side at 60 m/pixel + far-side regions',
    description:
      'Fourth of the five Lunar Orbiter spacecraft, and the first to fly a high-inclination polar lunar orbit. Launched 1967-05-04 from Cape Canaveral, entered a 6111 × 2706 km polar orbit on 1967-05-08. Mission redirected from Apollo site-selection (the first three Orbiters had already done that job) to broad scientific mapping. Returned 419 frames covering 99 % of the lunar near side at 60 m/pixel resolution plus the first detailed imaging of significant far-side regions. The frames remain the highest-resolution coverage of the lunar near side at this scale until the modern LRO era. Impact in October 1967 at 22-30° W on the far side after the radio failed.',
  },
  {
    id: 'lunar-orbiter-5',
    n: 5,
    launch: '1967-08-01',
    arrival: '1967-08-05',
    impact: '1968-01-31',
    tagline:
      'Final US lunar orbiter (1967-08-05). Completed far-side mapping at 60 m/pixel; impacted 1968-01-31 ahead of Apollo lunar operations',
    description:
      "Fifth and final Lunar Orbiter spacecraft. Launched 1967-08-01 from Cape Canaveral, entered polar lunar orbit 1967-08-05. Returned 633 frames in 35 days — closing out the Lunar Orbiter programme's near-complete coverage of both lunar hemispheres at high resolution. Imaged 36 high-priority science targets selected from gaps in the earlier Orbiters' coverage and from Surveyor / Apollo landing-site needs. After the 1968-01 end-of-mission decision, deliberately crashed 1968-01-31 at 2.79° S, 83.04° W to clear lunar orbital space ahead of Apollo. The five Orbiters together photographed 99 % of the Moon at 60 m/pixel — until LRO began its 0.5 m/pixel LROC NAC programme in 2009, this was the highest-resolution global lunar map ever made.",
  },
];

const SHARED = {
  category: 'orbiter',
  agency: 'NASA',
  country: 'USA',
  manufacturer: 'Boeing',
  era: '1957-1969',
  epoch: 'space-race',
  status: 'RETIRED',
};

const SHARED_LINKS = (n) => [
  {
    l: `Lunar Orbiter ${n} — Wikipedia`,
    u: `https://en.wikipedia.org/wiki/Lunar_Orbiter_${n}`,
    t: 'intro',
  },
  {
    l: 'Lunar Orbiter program — Wikipedia',
    u: 'https://en.wikipedia.org/wiki/Lunar_Orbiter_program',
    t: 'core',
  },
  {
    l: 'Lunar Orbiter Image Recovery Project (LOIRP)',
    u: 'https://www.nasa.gov/centers-and-facilities/ames/lunar-orbiter-image-recovery-project-loirp/',
    t: 'deep',
  },
];

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
    const base = {
      id: e.id,
      name: `Lunar Orbiter ${e.n}`,
      category: SHARED.category,
      agency: SHARED.agency,
      country: SHARED.country,
      manufacturer: SHARED.manufacturer,
      first_flight: e.launch,
      status: SHARED.status,
      era: SHARED.era,
      epoch: SHARED.epoch,
      best_known_for: e.tagline,
      credit: e.description,
      links: SHARED_LINKS(e.n),
      linked_missions: [],
      linked_sites: [],
    };
    const overlay = {
      tagline: e.tagline,
      description: e.description,
      best_known_for: e.tagline,
    };
    const detailPath = join(FLEET_ROOT, 'orbiter', e.id + '.json');
    await mkdir(dirname(detailPath), { recursive: true });
    await writeFile(detailPath, JSON.stringify(base, null, 2) + '\n');
    const overlayPath = join(I18N_ROOT, 'en-US', 'fleet', 'orbiter', e.id + '.json');
    await mkdir(dirname(overlayPath), { recursive: true });
    await writeFile(overlayPath, JSON.stringify(overlay, null, 2) + '\n');
    console.log('✓ ' + e.id + ' — ' + e.tagline.length + ' chars');

    if (!existing.has(e.id)) {
      fleetIndex.push({
        id: e.id,
        name: `Lunar Orbiter ${e.n}`,
        category: SHARED.category,
        agency: SHARED.agency,
        country: SHARED.country,
        era: SHARED.era,
        epoch: SHARED.epoch,
        status: SHARED.status,
        first_flight: e.launch,
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
  console.log('\n✓ index + galleries updated');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
