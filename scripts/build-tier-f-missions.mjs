#!/usr/bin/env node
/**
 * Tier F — backfill 4 missing /missions counterparts for Tier B fleet
 * entries: luna10, lunar-prospector, smart-1, change1. Per GH #311 Tier F.
 *
 * Each generated record:
 *   - base mission JSON in static/data/missions/moon/<id>.json
 *   - en-US overlay in static/data/i18n/en-US/missions/moon/<id>.json
 *   - row in static/data/missions/index.json (idempotent)
 *
 * No hand-tuned cislunar trajectory waypoints — /fly falls back to the
 * parametric translunar mode. Reciprocal linked_missions on the fleet
 * side is wired by the same script.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MISSIONS_ROOT = join(ROOT, 'static', 'data', 'missions');
const I18N_ROOT = join(ROOT, 'static', 'data', 'i18n');
const FLEET_ROOT = join(ROOT, 'static', 'data', 'fleet');

const MISSIONS = [
  {
    id: 'luna10',
    name: 'Luna 10',
    agency: 'Roscosmos',
    agency_full: 'Soviet Academy of Sciences (continued by Roscosmos)',
    color: '#cc4444',
    year: 1966,
    departure_date: '1966-03-31',
    arrival_date: '1966-04-03',
    transit_days: 3,
    vehicle: 'Molniya-M (Block-L upper stage)',
    payload: '~1582 kg launch mass; 248 kg dedicated orbiter section',
    delta_v: '~3.7 km/s (TLI + LOI)',
    fleet_id: 'luna10',
    fleet_category: 'orbiter',
    type: 'ROBOTIC ORBITER · FLOWN',
    first: 'First spacecraft to orbit the Moon (and any body other than Earth)',
    description:
      'Launched 1966-03-31 from Baikonur, Luna 10 became the first spacecraft to orbit the Moon — and the first artificial satellite of any body other than Earth — when it inserted into a 350 × 1017 km lunar orbit at 71.9° inclination on 1966-04-03. Three years before Apollo 8 reached the Moon with humans aboard. Carried a magnetometer, gamma-ray spectrometer, infrared radiometer, micrometeoroid detectors, plasma sensors, and a radio probe of the lunar gravity field. The gamma-ray data was the first compositional remote sensing of the Moon, suggesting basalt-like mare composition. Famously broadcast the Internationale anthem during the 23rd Congress of the Soviet Communist Party on 1966-04-04 — a propaganda flourish more than science. Operated 56 days / 460 orbits before its NiCd batteries depleted on 1966-05-30; remains in lunar orbit.',
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Molniya-M from Baikonur 1966-03-31 10:46 UTC.',
        type: 'nominal',
      },
      {
        met: 0.01,
        label: 'TLI',
        note: 'Block-L upper stage propels Luna 10 toward Moon.',
        type: 'nominal',
      },
      {
        met: 3,
        label: 'LOI',
        note: 'Lunar orbit insertion 1966-04-03 — first artificial satellite of any body other than Earth.',
        type: 'nominal',
      },
      {
        met: 3.5,
        label: 'INTERNATIONALE BROADCAST',
        note: 'Broadcast the Internationale during the 23rd Congress of the Soviet Communist Party (1966-04-04).',
        type: 'info',
      },
      {
        met: 60,
        label: 'EOL',
        note: 'NiCd batteries depleted; mission ended 1966-05-30. Remains in lunar orbit.',
        type: 'nominal',
      },
    ],
    links: [
      { l: 'Luna 10 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Luna_10', t: 'intro' },
      {
        l: 'Luna 10 (NASA NSSDCA)',
        u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-027A',
        t: 'core',
      },
    ],
  },
  {
    id: 'lunar-prospector',
    name: 'Lunar Prospector',
    agency: 'NASA',
    agency_full: 'National Aeronautics and Space Administration / Ames Research Center',
    color: '#0B3D91',
    year: 1998,
    departure_date: '1998-01-07',
    arrival_date: '1998-01-11',
    transit_days: 4,
    vehicle: 'Athena II',
    payload: '296 kg dry; carried 5 science instruments',
    delta_v: '~4 km/s (TLI + LOI)',
    fleet_id: 'lunar-prospector',
    fleet_category: 'orbiter',
    type: 'ROBOTIC ORBITER · FLOWN',
    first: 'Neutron-spectrometer hydrogen finding at both lunar poles',
    description:
      'The first NASA Discovery-class mission and the first dedicated US lunar mission since Explorer 49 (1973). Launched 1998-01-07 on an Athena II from Cape Canaveral, Lunar Prospector entered a 100-km circular polar lunar orbit on 1998-01-11. The 296-kg spinning spacecraft carried five instruments: a gamma-ray spectrometer for global crustal composition, a neutron spectrometer for hydrogen / water-ice detection at the poles, an alpha-particle spectrometer for radon gas (indirect volcanism detection), a magnetometer + electron reflectometer for crustal magnetism, and a Doppler gravity experiment. Boynton-team analysis of the neutron data (Feldman et al., Science 281 + 284) found sharp neutron-flux deficits over both lunar poles — consistent with ~2 × 10⁹ tonnes of hydrogen-rich material (probably water ice) in permanently shadowed polar craters. Mission ended 1999-07-31 with deliberate impact near Shackleton crater hoping to release a detectable water-vapour plume; none was seen. The hydrogen finding stood until LCROSS and Chandrayaan-1 / M3 (2009) provided independent confirmation.',
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Athena II from Cape Canaveral SLC-46 1998-01-07 02:28 UTC.',
        type: 'nominal',
      },
      { met: 0.07, label: 'TLI', note: 'Trans-lunar injection.', type: 'nominal' },
      {
        met: 4.1,
        label: 'LOI',
        note: 'Lunar orbit insertion 1998-01-11 — initial 100 × 100 km polar orbit.',
        type: 'nominal',
      },
      {
        met: 60,
        label: 'POLAR HYDROGEN',
        note: 'Neutron-spectrometer detects sharp neutron-flux deficits over both lunar poles — strong hydrogen signal, consistent with polar water ice.',
        type: 'info',
      },
      {
        met: 569,
        label: 'SHACKLETON IMPACT',
        note: 'Deliberate impact near Shackleton crater 1999-07-31 09:52 UTC. No water-vapour plume detected from Earth.',
        type: 'nominal',
      },
    ],
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
    agency: 'ESA',
    agency_full: 'European Space Agency',
    color: '#003247',
    year: 2003,
    departure_date: '2003-09-27',
    arrival_date: '2004-11-15',
    transit_days: 415,
    vehicle: 'Ariane 5 (shared payload)',
    payload: '367 kg launch mass; 1.2 kW solar-electric Hall-effect ion thruster',
    delta_v: '~3.9 km/s (cumulative ion-drive over 13 months)',
    fleet_id: 'smart-1',
    fleet_category: 'orbiter',
    type: 'ROBOTIC ORBITER · FLOWN',
    first:
      'First European spacecraft to reach the Moon + first deep-space ion-drive cruise to a planetary body',
    description:
      "ESA's first lunar mission and the first European spacecraft to reach the Moon. SMART = Small Missions for Advanced Research in Technology — and the key technology was a Hall-effect solar-electric ion thruster (PPS-1350-G), at the time the largest such thruster ever flown. Launched 2003-09-27 as a shared payload on an Ariane 5 from Kourou, the 367-kg spacecraft used its 1.2-kW xenon ion drive over 13 months to slowly raise its Earth orbit, eventually captured by lunar gravity on 2004-11-15 — a 13-month low-thrust spiral rather than the days-long chemical transfer of every prior lunar mission. Operated for 16 months in a polar lunar orbit returning AMIE camera imagery, the first X-ray fluorescence elemental maps of the Moon (D-CIXS), and infrared mineral spectroscopy (SIR). Deliberately impacted Lacus Excellentiae (34.4° S, 46.2° W) on 2006-09-03 02:42 UTC — the impact flash was observed live from the Canada-France-Hawaii Telescope.",
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Ariane 5G from Kourou 2003-09-27 23:14 UTC — shared payload with Insat-3E + e-Bird.',
        type: 'nominal',
      },
      {
        met: 0,
        label: 'ION DRIVE START',
        note: 'PPS-1350-G Hall-effect ion thruster begins 13-month low-thrust spiral.',
        type: 'nominal',
      },
      {
        met: 414,
        label: 'LUNAR CAPTURE',
        note: 'Captured by lunar gravity 2004-11-15 — first European spacecraft at the Moon.',
        type: 'nominal',
      },
      {
        met: 720,
        label: 'D-CIXS MAPPING',
        note: 'D-CIXS X-ray fluorescence delivers first global elemental maps of the Moon.',
        type: 'info',
      },
      {
        met: 1072,
        label: 'LACUS EXCELLENTIAE IMPACT',
        note: 'Deliberate impact at 34.4° S, 46.2° W on 2006-09-03 02:42 UTC. Impact flash observed from CFHT.',
        type: 'nominal',
      },
    ],
    links: [
      { l: 'SMART-1 — Wikipedia', u: 'https://en.wikipedia.org/wiki/SMART-1', t: 'intro' },
      {
        l: 'SMART-1 mission — ESA',
        u: 'https://www.esa.int/Science_Exploration/Space_Science/SMART-1',
        t: 'core',
      },
    ],
  },
  {
    id: 'change1',
    name: "Chang'e 1",
    agency: 'CNSA',
    agency_full: 'China National Space Administration',
    color: '#DE2910',
    year: 2007,
    departure_date: '2007-10-24',
    arrival_date: '2007-11-07',
    transit_days: 14,
    vehicle: 'Long March 3A',
    payload: '2350 kg launch mass; 130 kg science payload',
    delta_v: '~3.8 km/s (TLI + LOI)',
    fleet_id: 'change1',
    fleet_category: 'orbiter',
    type: 'ROBOTIC ORBITER · FLOWN',
    first: "China's first lunar mission + first object on the lunar surface",
    description:
      "The first phase of China's Lunar Exploration Program (CLEP) and CNSA's first mission beyond Earth. Launched 2007-10-24 from Xichang Satellite Launch Center on a Long March 3A, Chang'e 1 (named after the Moon goddess of Chinese folklore) entered a 200-km circular polar lunar orbit on 2007-11-07. Carried 8 instruments — a CCD stereo camera, a laser altimeter, an imaging spectrometer, gamma-ray and X-ray spectrometers, a microwave radiometer, a solar wind detector, and a high-energy particle detector. Produced China's first full lunar global topographic map at 120-200 m resolution and elemental abundance maps of Th, K, U, O, Si, Mg, Al, Ca, Ti, Fe. Mission deliberately ended 2009-03-01 with a controlled impact at 1.50° S, 52.36° E in Mare Fecunditatis — China's first object on the lunar surface, paving the way for Chang'e 3 (2013 surface landing) and Chang'e 5 (2020 sample return). Operated 16 months — 4 months past nominal.",
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Long March 3A from Xichang LC-3 2007-10-24 10:05 UTC.',
        type: 'nominal',
      },
      {
        met: 0.13,
        label: 'TLI',
        note: 'Trans-lunar injection via Earth parking-orbit + phasing orbits.',
        type: 'nominal',
      },
      {
        met: 14.2,
        label: 'LOI',
        note: 'Lunar orbit insertion 2007-11-07 — first Chinese spacecraft at the Moon.',
        type: 'nominal',
      },
      {
        met: 200,
        label: 'GLOBAL TOPO MAP',
        note: "Stereo CCD + laser altimeter produce China's first full lunar global topographic map at 120-200 m resolution.",
        type: 'info',
      },
      {
        met: 494,
        label: 'MARE FECUNDITATIS IMPACT',
        note: "Controlled impact at 1.50° S, 52.36° E on 2009-03-01 — China's first object on the lunar surface.",
        type: 'nominal',
      },
    ],
    links: [
      { l: "Chang'e 1 — Wikipedia", u: 'https://en.wikipedia.org/wiki/Chang%27e_1', t: 'intro' },
      {
        l: 'China Lunar Exploration Program — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Chinese_Lunar_Exploration_Program',
        t: 'core',
      },
    ],
  },
];

function buildBase(m) {
  return {
    id: m.id,
    agency: m.agency,
    agency_full: m.agency_full,
    sector: 'gov',
    dest: 'MOON',
    color: m.color,
    year: m.year,
    status: 'FLOWN',
    departure_date: m.departure_date,
    arrival_date: m.arrival_date,
    transit_days: m.transit_days,
    vehicle: m.vehicle,
    payload: m.payload,
    delta_v: m.delta_v,
    data_quality: 'good',
    credit: `Public domain / ${m.agency} archive. ${m.first}.`,
    links: m.links,
    flight_data_quality: 'reconstructed',
    fleet_refs: [{ id: m.fleet_id, role: 'spacecraft' }],
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
  const indexPath = join(MISSIONS_ROOT, 'index.json');
  const indexRaw = JSON.parse(await readFile(indexPath, 'utf8'));
  const indexList = Array.isArray(indexRaw) ? indexRaw : indexRaw.missions;
  const existing = new Set(indexList.map((e) => e.id));

  for (const m of MISSIONS) {
    const base = buildBase(m);
    const overlay = buildOverlay(m);
    const basePath = join(MISSIONS_ROOT, 'moon', m.id + '.json');
    await mkdir(dirname(basePath), { recursive: true });
    await writeFile(basePath, JSON.stringify(base, null, 2) + '\n');
    const overlayPath = join(I18N_ROOT, 'en-US', 'missions', 'moon', m.id + '.json');
    await mkdir(dirname(overlayPath), { recursive: true });
    await writeFile(overlayPath, JSON.stringify(overlay, null, 2) + '\n');
    console.log('✓ ' + m.id);

    if (!existing.has(m.id)) {
      indexList.push({
        id: m.id,
        agency: m.agency,
        dest: 'MOON',
        status: 'FLOWN',
        year: m.year,
        sector: 'gov',
        color: m.color,
      });
      existing.add(m.id);
      console.log('  + index row');
    }
  }
  if (Array.isArray(indexRaw)) {
    await writeFile(indexPath, JSON.stringify(indexList, null, 2) + '\n');
  } else {
    indexRaw.missions = indexList;
    await writeFile(indexPath, JSON.stringify(indexRaw, null, 2) + '\n');
  }
  console.log('\n✓ missions/index.json updated');

  // Reciprocal linked_missions on fleet entries.
  for (const m of MISSIONS) {
    const path = join(FLEET_ROOT, m.fleet_category, m.fleet_id + '.json');
    const obj = JSON.parse(await readFile(path, 'utf8'));
    const prev = new Set(obj.linked_missions || []);
    const before = prev.size;
    prev.add(m.id);
    obj.linked_missions = Array.from(prev).sort();
    await writeFile(path, JSON.stringify(obj, null, 2) + '\n');
    console.log(
      '  ↔ ' + m.fleet_id + ' linked_missions ' + before + ' → ' + obj.linked_missions.length,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
