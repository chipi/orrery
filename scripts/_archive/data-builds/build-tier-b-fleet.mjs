#!/usr/bin/env node
/**
 * Build the 8 Moon surface-page fleet gaps from GH #311 Tier B.
 *
 * Each entry: detail JSON + en-US overlay + index row + fleet-galleries
 * opt-in. Cross-links to the existing mission entry where one exists,
 * and a linked_sites entry pointing at moon-sites.json.
 *
 * Image fetch is a separate pass (scripts/fetch-tier-b-images.mjs).
 * Translation is also a separate pass.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FLEET_ROOT = join(ROOT, 'static', 'data', 'fleet');
const I18N_ROOT = join(ROOT, 'static', 'data', 'i18n');

// Per-entry data table.
const ENTRIES = [
  {
    id: 'luna10',
    name: 'Luna 10',
    category: 'orbiter',
    agency: 'Roscosmos',
    country: 'USSR',
    manufacturer: 'NPO Lavochkin',
    color: '#cc4444',
    first_flight: '1966-03-31',
    status: 'RETIRED',
    era: '1957-1975',
    epoch: 'space-race',
    site_id: 'luna10',
    linked_mission: null, // luna10 mission not in /missions yet
    tagline:
      'First spacecraft to orbit the Moon (or any body other than Earth) — entered lunar orbit 1966-04-03, three years before Apollo 8',
    description:
      'First spacecraft to orbit the Moon — and the first artificial satellite of any body other than Earth. Launched 1966-03-31 from Baikonur on a Molniya rocket, Luna 10 entered lunar orbit 1966-04-03 with a 350 × 1017 km orbit at 71.9° inclination, three years before Apollo 8 reached the Moon with humans aboard. Measured the lunar magnetic field (~3 nT, essentially zero), micrometeoroid flux, gamma-ray emission, ionising radiation, and solar plasma — the gamma-ray data was the first compositional remote sensing of the Moon, suggesting basalt-like mare composition. Famously played the "Internationale" anthem during the 23rd Congress of the Soviet Communist Party (1966-04-04). Operated 56 days / 460 orbits before its NiCd batteries depleted. Remains in lunar orbit.',
    links: [
      {
        l: 'Luna 10 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Luna_10',
        t: 'intro',
      },
      {
        l: 'Luna 10 — NASA / NSSDCA',
        u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-027A',
        t: 'core',
      },
    ],
  },
  {
    id: 'luna24',
    name: 'Luna 24',
    category: 'lander',
    agency: 'Roscosmos',
    country: 'USSR',
    manufacturer: 'NPO Lavochkin',
    color: '#cc4444',
    first_flight: '1976-08-09',
    status: 'RETIRED',
    era: '1976-1980',
    epoch: 'post-apollo',
    site_id: 'luna24',
    linked_mission: 'luna24',
    tagline:
      "Last successful Soviet Moon landing — returned 170 g of regolith from Mare Crisium 1976-08-22, the last lunar sample return until Chang'e 5 in 2020",
    description:
      "The last successful Soviet Moon mission and the last sample-return lunar lander until Chang'e 5 in 2020 — a 44-year gap. Launched 1976-08-09 from Baikonur on a Proton-K, Luna 24 soft-landed in Mare Crisium (12.7° N, 62.2° E) on 1976-08-18, drilled to a depth of 2.25 m using its rotary-percussive drill, retrieved a 1.6 m core sample, and lifted off the ascent stage which returned 170.1 g of lunar regolith to Surkhandarya in Uzbekistan on 1976-08-22. Soviet scientists at the Vernadsky Institute confirmed the presence of water (~0.1 % by mass) in the samples in a 1978 paper that was largely ignored in the West until LCROSS and Chandrayaan-1 (2008-09) re-confirmed lunar water.",
    links: [
      {
        l: 'Luna 24 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Luna_24',
        t: 'intro',
      },
      {
        l: 'Luna 24 — NASA / NSSDCA',
        u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1976-081A',
        t: 'core',
      },
      {
        l: 'Akhmanova et al. (1978) — water in Luna 24 regolith (Geokhimiia)',
        u: 'https://en.wikipedia.org/wiki/Lunar_water#1976_Soviet_findings_in_Luna_24_regolith',
        t: 'deep',
      },
    ],
  },
  {
    id: 'lunar-prospector',
    name: 'Lunar Prospector',
    category: 'orbiter',
    agency: 'NASA',
    country: 'USA',
    manufacturer: 'Lockheed Martin Space',
    color: '#0B3D91',
    first_flight: '1998-01-07',
    status: 'RETIRED',
    era: '1981-2011',
    epoch: 'shuttle-and-mir',
    site_id: 'lunar-prospector',
    linked_mission: null,
    tagline:
      'NASA Discovery-class polar orbiter — neutron-spectrometer evidence for hydrogen at both lunar poles 1998; ended with deliberate Shackleton impact 1999',
    description:
      'The first NASA Discovery-class mission and the first dedicated US lunar mission since Explorer 49 (1973). Launched 1998-01-07 on an Athena II from Cape Canaveral, Lunar Prospector entered a 100-km circular polar orbit. Its neutron spectrometer detected sharp neutron-flux deficits over both lunar poles (Feldman et al., 1998 / 1999) — consistent with ~2 × 10⁹ tonnes of hydrogen-rich material (most plausibly water ice) in permanently shadowed polar craters. The gravimeter, magnetometer, gamma-ray and alpha-particle spectrometers also delivered global maps of crustal composition and remnant magnetism. End of mission 1999-07-31: deliberately impacted near Shackleton crater hoping to release a detectable water-vapour plume; none was seen (the lithium-7 fluorescence experiment that would have detected it was a long shot). The hydrogen finding stood until LCROSS (2009) and Chandrayaan-1 / M3 (2009) provided independent confirmation.',
    links: [
      {
        l: 'Lunar Prospector — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Lunar_Prospector',
        t: 'intro',
      },
      {
        l: 'Lunar Prospector — NASA Discovery program',
        u: 'https://science.nasa.gov/mission/lunar-prospector/',
        t: 'core',
      },
      {
        l: 'Feldman et al. (1998) — Fluxes of fast and epithermal neutrons from Lunar Prospector (Science 281)',
        u: 'https://www.science.org/doi/10.1126/science.281.5382.1496',
        t: 'deep',
      },
    ],
  },
  {
    id: 'smart-1',
    name: 'SMART-1',
    category: 'orbiter',
    agency: 'ESA',
    country: 'Multi (ESA members)',
    manufacturer: 'Swedish Space Corporation (prime)',
    color: '#003247',
    first_flight: '2003-09-27',
    status: 'RETIRED',
    era: '1981-2011',
    epoch: 'shuttle-and-mir',
    site_id: 'smart-1',
    linked_mission: null,
    tagline:
      'First European Moon mission — solar-electric ion-drive demonstrator. Spiralled to the Moon over 13 months, ended with deliberate impact 2006-09-03',
    description:
      "ESA's first lunar mission and the first European spacecraft to reach the Moon. SMART = Small Missions for Advanced Research in Technology — and the technology that mattered was a Hall-effect solar-electric ion thruster (PPS-1350, the largest such thruster flown at the time). Launched 2003-09-27 as a shared payload on an Ariane 5 from Kourou, the 367-kg spacecraft used its 1.2-kW xenon ion drive over 13 months to slowly raise its Earth orbit, eventually captured by lunar gravity 2004-11-15. Operated for 16 months in a polar lunar orbit, returning high-resolution AMIE camera imagery, the first X-ray fluorescence elemental maps of the Moon (D-CIXS), and infrared mineral spectroscopy (SIR). Deliberately impacted Lacus Excellentiae (34.4° S, 46.2° W) on 2006-09-03 02:42 UTC — the impact flash was observed from the Canada-France-Hawaii Telescope.",
    links: [
      {
        l: 'SMART-1 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/SMART-1',
        t: 'intro',
      },
      {
        l: 'SMART-1 mission — ESA',
        u: 'https://www.esa.int/Science_Exploration/Space_Science/SMART-1',
        t: 'core',
      },
    ],
  },
  {
    id: 'chandrayaan1',
    name: 'Chandrayaan-1',
    category: 'orbiter',
    agency: 'ISRO',
    country: 'India',
    manufacturer: 'ISRO Satellite Centre',
    color: '#FF9933',
    first_flight: '2008-10-22',
    status: 'RETIRED',
    era: '1981-2011',
    epoch: 'shuttle-and-mir',
    site_id: 'chandrayaan1',
    linked_mission: 'chandrayaan1',
    tagline:
      "India's first Moon mission. Discovered widespread surface water on the Moon (M3 + MIP, 2009). Lost contact 2009-08-29 after only 312 days",
    description:
      "India's first mission beyond Earth orbit and its first to the Moon. Launched 2008-10-22 from Satish Dhawan Space Centre on a PSLV-XL, Chandrayaan-1 entered a 100-km polar lunar orbit on 2008-11-12. Carried 11 instruments from 6 countries (India, USA, UK, Germany, Sweden, Bulgaria) — most consequentially NASA's Moon Mineralogy Mapper (M3) which detected the absorption-band signature of OH/H₂O across vast swathes of the lunar surface, particularly at high latitudes (Pieters et al., 2009, Science 326). Its 35-kg Moon Impact Probe (MIP) was released 2008-11-14 and crashed into the south-polar Shackleton crater, becoming the first Indian artefact on the Moon and recording lunar atmospheric water vapour during descent. Spacecraft contact was lost 2009-08-29 after ~10 months / 3400 orbits — half of its planned 2-year mission, but the science return was already game-changing. Remains in lunar orbit, re-acquired by NASA Goldstone radar in 2017.",
    links: [
      {
        l: 'Chandrayaan-1 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Chandrayaan-1',
        t: 'intro',
      },
      {
        l: 'Chandrayaan-1 — ISRO',
        u: 'https://www.isro.gov.in/Chandrayaan_1.html',
        t: 'core',
      },
      {
        l: 'Pieters et al. (2009) — M3 detection of lunar water (Science 326)',
        u: 'https://www.science.org/doi/10.1126/science.1178658',
        t: 'deep',
      },
    ],
  },
  {
    id: 'lro',
    name: 'Lunar Reconnaissance Orbiter (LRO)',
    category: 'orbiter',
    agency: 'NASA',
    country: 'USA',
    manufacturer: 'NASA Goddard Space Flight Center',
    color: '#0B3D91',
    first_flight: '2009-06-18',
    status: 'ACTIVE',
    era: '2011-present',
    epoch: 'commercial-leo',
    site_id: 'lro',
    linked_mission: 'lro',
    tagline:
      "NASA's active lunar recon orbiter. LROC's 0.5 m/pixel imagery is the source of every Apollo + Luna + Chang'e landing-site photograph in this app",
    description:
      "NASA's active flagship lunar orbiter — operating continuously since 2009-06-23. Launched 2009-06-18 with LCROSS on an Atlas V from Cape Canaveral, LRO's payload of 7 instruments has remapped every aspect of the Moon at unprecedented resolution. The Lunar Reconnaissance Orbiter Camera (LROC) NAC (Narrow-Angle Camera, 0.5 m/pixel at 50 km altitude) has imaged every Apollo, Luna, Surveyor, Chang'e, Vikram, Beresheet and Hakuto landing site — every \"tier-2 LROC\" image in this app's /moon hotspots came from LROC NAC. LOLA (Laser Altimeter) gave the most detailed topography of any solar-system body. Diviner mapped surface temperature 10 K precision; LAMP detected widespread surface H₂O down to lunar dawn; LEND mapped neutron flux at <10 km resolution. As of 2026 still operational on extended mission, with no planned end-of-life — propellant supports operations through ~2030+.",
    links: [
      {
        l: 'Lunar Reconnaissance Orbiter — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Lunar_Reconnaissance_Orbiter',
        t: 'intro',
      },
      {
        l: 'LRO mission — NASA',
        u: 'https://science.nasa.gov/mission/lro/',
        t: 'core',
      },
      {
        l: 'LROC image gallery (Arizona State University)',
        u: 'https://www.lroc.asu.edu/images',
        t: 'deep',
      },
    ],
  },
  {
    id: 'change1',
    name: "Chang'e 1",
    category: 'orbiter',
    agency: 'CNSA',
    country: 'China',
    manufacturer: 'CAST (China Academy of Space Technology)',
    color: '#DE2910',
    first_flight: '2007-10-24',
    status: 'RETIRED',
    era: '1981-2011',
    epoch: 'shuttle-and-mir',
    site_id: 'change1',
    linked_mission: null,
    tagline:
      "China's first lunar mission. 200-m global topographic map; ended with deliberate impact in Mare Fecunditatis 2009-03-01 — first Chinese object on Moon",
    description:
      "The first phase of China's Lunar Exploration Program (CLEP), and CNSA's first mission beyond Earth. Launched 2007-10-24 from Xichang Satellite Launch Center on a Long March 3A, Chang'e 1 (named after the Moon goddess of Chinese folklore) entered a 200-km circular polar lunar orbit on 2007-11-07. Carried 8 instruments including a CCD stereo camera, laser altimeter, imaging spectrometer, gamma-ray and X-ray spectrometers, microwave radiometer, solar wind detector, and high-energy particle detector. Produced China's first full lunar global topographic map at 120-200 m resolution and elemental abundance maps of Th, K, U, O, Si, Mg, Al, Ca, Ti, Fe. Mission deliberately ended 2009-03-01 with a controlled impact at 1.50° S, 52.36° E in Mare Fecunditatis — China's first object on the lunar surface, paving the way for Chang'e 3 (2013 surface landing) and Chang'e 5 (2020 sample return). Operated 16 months — 4 months past nominal.",
    links: [
      {
        l: "Chang'e 1 — Wikipedia",
        u: 'https://en.wikipedia.org/wiki/Chang%27e_1',
        t: 'intro',
      },
      {
        l: 'China Lunar Exploration Program — CLEP overview',
        u: 'https://en.wikipedia.org/wiki/Chinese_Lunar_Exploration_Program',
        t: 'core',
      },
    ],
  },
  {
    id: 'change6',
    name: "Chang'e 6",
    category: 'lander',
    agency: 'CNSA',
    country: 'China',
    manufacturer: 'CAST (China Academy of Space Technology)',
    color: '#DE2910',
    first_flight: '2024-05-03',
    status: 'RETIRED',
    era: '2011-present',
    epoch: 'commercial-leo',
    site_id: 'change6',
    linked_mission: 'change6',
    tagline:
      'First-ever lunar far-side sample return. Landed Apollo basin 2024-06-02; ascended 2024-06-03; 1935 g of far-side regolith returned to Inner Mongolia 2024-06-25',
    description:
      "The first-ever sample-return mission from the lunar far side — a 53-year-after-Apollo landmark that no other space agency has yet attempted. Launched 2024-05-03 on a Long March 5 from Wenchang, Chang'e 6 used the Queqiao-2 relay satellite (positioned in a halo orbit around Earth-Moon L2 since March 2024) to communicate with Earth across the lunar limb. The lander touched down in the Apollo basin within the giant South Pole-Aitken impact basin (-153.99° W, -41.64° S) on 2024-06-02 06:23 UTC. Its drill + scoop collected ~1935 g of regolith from a region that has remained largely undisturbed since the basin-forming impact ~4.3 billion years ago — material from the lunar mantle excavated by SPA. The ascender lifted off 2024-06-03, rendezvoused with the orbiter in lunar orbit, and the return capsule landed in Siziwang Banner, Inner Mongolia, on 2024-06-25 14:07 local time. ESA, Italy, France, and Pakistan contributed instruments — the first international science payloads on a Chinese sample-return mission.",
    links: [
      {
        l: "Chang'e 6 — Wikipedia",
        u: 'https://en.wikipedia.org/wiki/Chang%27e_6',
        t: 'intro',
      },
      {
        l: "Chang'e 6 first far-side sample return — Nature news",
        u: 'https://www.nature.com/articles/d41586-024-01828-5',
        t: 'core',
      },
      {
        l: 'Queqiao-2 relay satellite (Wikipedia)',
        u: 'https://en.wikipedia.org/wiki/Queqiao-2',
        t: 'deep',
      },
    ],
  },
];

function buildBase(e) {
  const linked_sites = e.site_id ? [{ type: 'moon-site', site_id: e.site_id }] : [];
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
    linked_sites,
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
    const base = buildBase(e);
    const overlay = buildOverlay(e);
    // detail JSON
    const detailPath = join(FLEET_ROOT, e.category, e.id + '.json');
    await mkdir(dirname(detailPath), { recursive: true });
    await writeFile(detailPath, JSON.stringify(base, null, 2) + '\n');
    // en-US overlay
    const overlayPath = join(I18N_ROOT, 'en-US', 'fleet', e.category, e.id + '.json');
    await mkdir(dirname(overlayPath), { recursive: true });
    await writeFile(overlayPath, JSON.stringify(overlay, null, 2) + '\n');
    console.log('✓ ' + e.id.padEnd(20) + ' (' + e.category + ')');

    // index row (matches existing schema — no `color`, has `tagline`)
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
      console.log('  + index row');
    }

    // galleries — id → image count (number)
    if (typeof galleries[e.id] !== 'number') {
      galleries[e.id] = 5;
      console.log('  + galleries entry (5)');
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
