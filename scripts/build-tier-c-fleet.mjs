#!/usr/bin/env node
/**
 * Build the 7 Mars surface-page fleet gaps from GH #311 Tier C.
 * Same pattern as scripts/build-tier-b-fleet.mjs.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FLEET_ROOT = join(ROOT, 'static', 'data', 'fleet');
const I18N_ROOT = join(ROOT, 'static', 'data', 'i18n');

const ENTRIES = [
  {
    id: 'viking1-orbiter',
    name: 'Viking 1 Orbiter',
    category: 'orbiter',
    agency: 'NASA',
    country: 'USA',
    manufacturer: 'NASA Langley Research Center / Martin Marietta',
    color: '#0B3D91',
    first_flight: '1975-08-20',
    status: 'RETIRED',
    era: '1969-1981',
    epoch: 'lunar-era',
    site_id: 'viking1-orbiter',
    linked_mission: null,
    tagline:
      'Companion orbiter to Viking-1 lander — relay + 50000 surface images at 150-300 m/pixel, the first global Mars map. Operated 1976-1980',
    description:
      "The orbital half of NASA's Viking 1 mission — the first US Mars orbiter and one of two near-identical Viking orbiters that returned ~50,000 surface images at 150-300 m/pixel between 1976 and 1980. Launched 1975-08-20 from Cape Canaveral on a Titan IIIE-Centaur, Viking 1 entered Mars orbit 1976-06-19; the orbiter spent a month surveying candidate landing sites before releasing the Viking 1 lander 1976-07-20 to the first successful US Mars landing at Chryse Planitia. The orbiter then continued as a science platform for nearly four more years, building the first global topographic + thermal map of Mars, surveying Phobos + Deimos, and acting as a UHF relay for the lander. Out of attitude-control gas 1980-08-07. Deliberately raised to a 357 × 33614 km park orbit that's expected to remain stable through ~2024 (decayed ~2025 per Aerospace Corp re-entry forecast).",
    links: [
      {
        l: 'Viking 1 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Viking_1',
        t: 'intro',
      },
      {
        l: 'Viking program — NASA',
        u: 'https://science.nasa.gov/mission/viking/',
        t: 'core',
      },
      {
        l: 'Viking 1 — NASA / NSSDCA',
        u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1975-075A',
        t: 'deep',
      },
    ],
  },
  {
    id: 'viking2-lander',
    name: 'Viking 2 Lander',
    category: 'lander',
    agency: 'NASA',
    country: 'USA',
    manufacturer: 'Martin Marietta',
    color: '#0B3D91',
    first_flight: '1975-09-09',
    status: 'RETIRED',
    era: '1969-1981',
    epoch: 'lunar-era',
    site_id: 'viking2-lander',
    linked_mission: null,
    tagline:
      'Second US Mars surface lander (Utopia Planitia 1976-09-03). Twin of Viking 1 lander; ran biology, soil chemistry + meteorology until 1980',
    description:
      "The surface half of NASA's Viking 2 mission and the second successful US Mars lander, 47 days after Viking 1. Launched 1975-09-09 on a Titan IIIE-Centaur, touched down at Utopia Planitia (47.97° N, 134.04° E) on 1976-09-03 — much further north than Viking 1, in a different plains type to broaden the science return. Ran the same instrument suite as Viking 1: a biology package (Pyrolytic Release / Labeled Release / Gas Exchange experiments looking for microbial metabolism — the famously ambiguous Labeled Release positive that remains debated), GC-MS for soil organics (none detected), facsimile cameras returning > 1,400 images, X-ray fluorescence soil chemistry, meteorology, and seismometer (one of two ever flown on Mars — unable to detect quakes through cabin noise). Operated until 1980-04-11 when batteries failed.",
    links: [
      {
        l: 'Viking 2 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Viking_2',
        t: 'intro',
      },
      {
        l: 'Viking program — NASA',
        u: 'https://science.nasa.gov/mission/viking/',
        t: 'core',
      },
      {
        l: 'Labeled Release experiment — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Labeled_release',
        t: 'deep',
      },
    ],
  },
  {
    id: 'mars3-orbiter',
    name: 'Mars 3 Orbiter',
    category: 'orbiter',
    agency: 'Roscosmos',
    country: 'USSR',
    manufacturer: 'NPO Lavochkin',
    color: '#cc4444',
    first_flight: '1971-05-28',
    status: 'RETIRED',
    era: '1969-1981',
    epoch: 'lunar-era',
    site_id: 'mars3-orbiter',
    linked_mission: null,
    tagline:
      'Soviet companion orbiter to Mars 3 — orbited Mars from 1971-12-02 through 1972-08; first measurements of Mars upper atmosphere temperature',
    description:
      "The orbital half of the Soviet Mars 3 mission (its lander made the first soft landing on Mars 1971-12-02 but only transmitted for 14.5 seconds before signal loss in a global dust storm). The orbiter was much more successful — entered a highly elliptical 1500 × 211400 km Mars orbit on 1971-12-02, the second-ever orbiter at Mars (after Mariner 9 by two weeks). Carried infrared and ultraviolet spectrometers, photometers, a Lyman-alpha sensor, magnetometer, plasma analyser, and cosmic-ray detectors. Returned the first measurements of the upper atmosphere temperature profile, mapped surface temperatures (peak +13 °C, lowest -93 °C), and confirmed atmospheric water vapour. Returned approximately 60 image-frames; image quality was compromised by Mars' global dust storm that was already in progress when the orbiter arrived. End of mission 1972-08-22.",
    links: [
      {
        l: 'Mars 3 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Mars_3',
        t: 'intro',
      },
      {
        l: 'Mars 3 — NASA / NSSDCA',
        u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-049A',
        t: 'core',
      },
    ],
  },
  {
    id: 'mars6',
    name: 'Mars 6',
    category: 'lander',
    agency: 'Roscosmos',
    country: 'USSR',
    manufacturer: 'NPO Lavochkin',
    color: '#cc4444',
    first_flight: '1973-08-05',
    status: 'RETIRED',
    era: '1969-1981',
    epoch: 'lunar-era',
    site_id: 'mars6',
    linked_mission: null,
    tagline:
      'Soviet 1973 Mars lander — first direct atmospheric measurements (224 s of descent telemetry) before signal loss 148 m above surface',
    description:
      "Part of the Soviet four-spacecraft Mars wave of 1973 (Mars 4, 5, 6, 7) — and the only one to return useful science from a descent through Mars' atmosphere. Launched 1973-08-05 from Baikonur on a Proton-K, arrived 1974-03-12. The descent module separated from the flyby bus, entered the Martian atmosphere over Margaritifer Terra (23.90° S, 19.42° W), and returned 224 seconds of direct atmospheric telemetry — the first in-situ measurements of Mars' atmospheric temperature, pressure, and composition profile (although the composition data was corrupted by a fault in the mass spectrometer's data system, and was only partially recoverable). Signal was lost at ~148 m altitude during retrorocket firing; the lander either crashed or was so damaged that nothing was transmitted from the surface. The flyby bus continued past Mars and acted as a relay station.",
    links: [
      {
        l: 'Mars 6 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Mars_6',
        t: 'intro',
      },
      {
        l: 'Mars 6 — NASA / NSSDCA',
        u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1973-052A',
        t: 'core',
      },
    ],
  },
  {
    id: 'mars-odyssey',
    name: '2001 Mars Odyssey',
    category: 'orbiter',
    agency: 'NASA',
    country: 'USA',
    manufacturer: 'Lockheed Martin Space',
    color: '#0B3D91',
    first_flight: '2001-04-07',
    status: 'ACTIVE',
    era: '1981-2011',
    epoch: 'shuttle-and-mir',
    site_id: 'mars-odyssey',
    linked_mission: null,
    tagline:
      'Longest-lived Mars asset ever — orbiting since 2001-10-24. Gamma-ray + neutron water-ice maps; UHF relay for the surface fleet',
    description:
      "The longest-lived spacecraft ever to operate at Mars — entered Mars orbit 2001-10-24 and is still active in 2026, surpassing every other Mars mission's lifetime. Launched 2001-04-07 on a Delta II from Cape Canaveral, named after Arthur C. Clarke's '2001: A Space Odyssey'. Carried THEMIS (Thermal Emission Imaging System, 100-m visible / 100-m infrared imaging that mapped global surface mineralogy) and the gamma-ray spectrometer suite GRS + HEND + NS — Boynton et al. (2002, Science 297) used HEND neutron spectroscopy to map global near-surface water ice, the discovery that drove every subsequent lander-mission target selection. Also serves as the primary UHF relay for Mars-surface assets (MERs, MSL, InSight, Perseverance) and a backup for Mars Reconnaissance Orbiter. Extended-mission fuel reserves expected to last to 2026-2027.",
    links: [
      {
        l: '2001 Mars Odyssey — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/2001_Mars_Odyssey',
        t: 'intro',
      },
      {
        l: 'Mars Odyssey mission overview — NASA',
        u: 'https://science.nasa.gov/mission/2001-mars-odyssey/',
        t: 'core',
      },
      {
        l: 'Boynton et al. (2002) — Distribution of hydrogen in the near surface of Mars (Science 297)',
        u: 'https://www.science.org/doi/10.1126/science.1073722',
        t: 'deep',
      },
    ],
  },
  {
    id: 'beagle2',
    name: 'Beagle 2',
    category: 'lander',
    agency: 'UKSA / ESA',
    country: 'United Kingdom',
    manufacturer: 'EADS Astrium / University of Leicester',
    color: '#cc0033',
    first_flight: '2003-06-02',
    status: 'RETIRED',
    era: '1981-2011',
    epoch: 'shuttle-and-mir',
    site_id: 'beagle2',
    linked_mission: null,
    tagline:
      'UK/ESA Mars lander released from Mars Express 2003-12-19. Silent on arrival; found by HiRISE 2015 — landed safely, 2 solar panels stuck',
    description:
      "A 33-kg UK-led Mars lander released from ESA's Mars Express on 2003-12-19, six days before its planned 2003-12-25 landing at Isidis Planitia. Beagle 2 (named after HMS Beagle which carried Darwin) carried a clamshell payload of a Gas Analysis Package mass spectrometer for atmospheric + sub-surface volatiles, a stereo camera, a microscope, a Mössbauer + APX spectrometer pair, and a mole drill. It went silent at separation and was presumed crashed for 12 years — until 2015-01, when high-resolution HiRISE imagery from Mars Reconnaissance Orbiter clearly showed Beagle 2 sitting on the Martian surface (~5 km from its target), with two of four solar panels apparently failed to deploy, preventing the antenna from clearing the housing and from collecting enough power. So: a successful landing, an unsuccessful deployment, and a 12-year mystery solved by the same kind of imagery that LRO uses for the Moon.",
    links: [
      {
        l: 'Beagle 2 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Beagle_2',
        t: 'intro',
      },
      {
        l: 'Beagle 2 found on Mars — UK Space Agency / ESA press release 2015',
        u: 'https://www.esa.int/Science_Exploration/Space_Science/Mars_Express/Beagle_2_lander_found_on_Mars',
        t: 'core',
      },
    ],
  },
  {
    id: 'exomars-rosalind-franklin',
    name: 'Rosalind Franklin (ExoMars rover)',
    category: 'rover',
    agency: 'ESA',
    country: 'Multi (ESA members)',
    manufacturer: 'Airbus Defence and Space (prime)',
    color: '#003247',
    first_flight: '2028-10-01',
    status: 'PLANNED',
    era: 'planned',
    epoch: 'mars-era',
    site_id: 'exomars-rosalind-franklin',
    linked_mission: null,
    tagline:
      "ESA's 2028 Mars rover — 2-m drill to search for biosignatures at Oxia Planum. Paused by Roscosmos pull-out 2022, retargeted to NASA launch",
    description:
      "ESA's first Mars rover, named after the DNA pioneer Rosalind Franklin. Designed to land at Oxia Planum (an ancient clay-bearing Mars region selected for high biosignature-preservation potential) and use a 2-metre subsurface drill — deeper than any prior Mars mission — to acquire samples from depths protected from the cosmic-ray and UV radiation that destroys surface organics. The Analytical Laboratory Drawer holds three life-detection instruments: MOMA (Mars Organic Molecule Analyser, a gas chromatograph + dual-source mass spectrometer), MicrOmega (infrared imaging spectroscopy), and the Raman Laser Spectrometer. Originally targeted for 2022 launch on a Russian Proton with a Russian-built landing platform (Kazachok); after Russia invaded Ukraine in 2022, ESA suspended cooperation, and Rosalind Franklin's launch was deferred. Currently scheduled for 2028 on a NASA-provided launch vehicle with an ESA / Airbus-rebuilt landing platform.",
    links: [
      {
        l: 'Rosalind Franklin (rover) — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Rosalind_Franklin_(rover)',
        t: 'intro',
      },
      {
        l: 'ExoMars Rosalind Franklin rover — ESA',
        u: 'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Exploration/ExoMars/ExoMars_Rosalind_Franklin_rover',
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
    linked_missions: e.linked_mission ? [e.linked_mission] : [],
    linked_sites: e.site_id ? [{ type: 'mars', site_id: e.site_id }] : [],
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
      console.error('✗ ' + e.id + ' tagline ' + e.tagline.length + ' chars > 140');
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
    console.log('✓ ' + e.id.padEnd(28) + ' (' + e.category + ') — ' + e.tagline.length + ' chars');

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
