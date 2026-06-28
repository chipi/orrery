#!/usr/bin/env node
/**
 * Slice C — fill three audit-driven gaps:
 *
 *   - X-37B OTV-1..7 (uncrewed USSF / USAF spaceplane orbital missions)
 *   - Mariner 10 (first Mercury flyby + first gravity-assist mission, missing
 *     entirely from the catalogue)
 *   - Buran OK-GLI credit paragraph expansion to highlight the 3 most-notable
 *     atmospheric test flights (no mission entries — atmospheric-only)
 *
 * Base + en-US overlay + index row + reciprocal linked_missions on the fleet
 * entries we point at + flights[] roster on x37b.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MISSIONS = join(ROOT, 'static', 'data', 'missions');
const I18N = join(ROOT, 'static', 'data', 'i18n');
const FLEET = join(ROOT, 'static', 'data', 'fleet');

const USSF = '#1a3a8a';
const NASA = '#0B3D91';

const OTV = [
  {
    id: 'otv-1',
    name: 'X-37B OTV-1 (USA-212)',
    designation: 'USA-212',
    dep: '2010-04-22',
    arr: '2010-12-03',
    days: 224,
    vehicle: 'Atlas V 501 (AV-012)',
    launch_site: 'CCAFS SLC-41',
    landing_site: 'Vandenberg AFB',
    apogee: '410 km',
    notes:
      'First flight of the Boeing-built X-37B Orbital Test Vehicle programme. Launched 2010-04-22 23:52 UTC from Cape Canaveral SLC-41 on Atlas V 501 AV-012; the first autonomous orbital spaceplane re-entry under runway-landing operations since the Soviet Buran 1.01 in 1988. Landed at Vandenberg AFB 2010-12-03 09:16 UTC after 224 days. Payloads and orbital parameters classified.',
  },
  {
    id: 'otv-2',
    name: 'X-37B OTV-2 (USA-226)',
    designation: 'USA-226',
    dep: '2011-03-05',
    arr: '2012-06-16',
    days: 469,
    vehicle: 'Atlas V 501 (AV-026)',
    launch_site: 'CCAFS SLC-41',
    landing_site: 'Vandenberg AFB',
    apogee: '~340 km',
    notes:
      'Second X-37B flight, second of two flight vehicles. Launched 2011-03-05 22:46 UTC from CCAFS SLC-41 on Atlas V 501 AV-026; landed at Vandenberg AFB 2012-06-16 12:48 UTC. 469 days on orbit — at the time the longest US autonomous orbital spaceflight, surpassed by every subsequent OTV flight. Payloads classified.',
  },
  {
    id: 'otv-3',
    name: 'X-37B OTV-3 (USA-240)',
    designation: 'USA-240',
    dep: '2012-12-11',
    arr: '2014-10-17',
    days: 675,
    vehicle: 'Atlas V 501 (AV-034)',
    launch_site: 'CCAFS SLC-41',
    landing_site: 'Vandenberg AFB',
    apogee: '~360 km',
    notes:
      'Third X-37B flight, reuse of the OTV-1 flight vehicle. Launched 2012-12-11 18:03 UTC from CCAFS SLC-41 on Atlas V 501 AV-034; landed at Vandenberg AFB 2014-10-17 16:24 UTC. 675 days on orbit. Operations interrupted by 16 days when the Antares CRS-3 launch failure on adjacent CCAFS infrastructure briefly hindered USSF support windows.',
  },
  {
    id: 'otv-4',
    name: 'X-37B OTV-4 (USA-261, AFSPC-5)',
    designation: 'USA-261 / AFSPC-5',
    dep: '2015-05-20',
    arr: '2017-05-07',
    days: 718,
    vehicle: 'Atlas V 501 (AV-054)',
    launch_site: 'CCAFS SLC-41',
    landing_site: 'KSC Shuttle Landing Facility',
    apogee: '~325 km',
    notes:
      'Fourth X-37B flight. Launched 2015-05-20 15:05 UTC from CCAFS SLC-41 on Atlas V 501 AV-054; first OTV landing at the Kennedy Space Center Shuttle Landing Facility (the same 4.6 km runway formerly used by the Space Shuttle orbiters) on 2017-05-07 11:47 UTC. Carried the AFRL Hall-effect-thruster experiment (XR-5A, ion propulsion) and a NASA Materials Exposure Test bed.',
  },
  {
    id: 'otv-5',
    name: 'X-37B OTV-5 (USA-277)',
    designation: 'USA-277',
    dep: '2017-09-07',
    arr: '2019-10-27',
    days: 780,
    vehicle: 'Falcon 9 Block 4',
    launch_site: 'KSC LC-39A',
    landing_site: 'KSC Shuttle Landing Facility',
    apogee: '~360 km, 54.5° inclination',
    notes:
      'Fifth X-37B flight, first launch on Falcon 9 instead of Atlas V — and the only X-37B flight on a Block 4 Falcon 9. Launched 2017-09-07 14:00 UTC from KSC LC-39A (the booster recovered downrange at LZ-1); landed at KSC SLF 2019-10-27 07:51 UTC. 780 days on orbit. First X-37B flight to a higher-inclination orbit (54.5°) — broadens the publicly-tracked overflight pattern.',
  },
  {
    id: 'otv-6',
    name: 'X-37B OTV-6 (USA-299, USSF-7)',
    designation: 'USA-299 / USSF-7',
    dep: '2020-05-17',
    arr: '2022-11-12',
    days: 908,
    vehicle: 'Atlas V 501 (AV-081)',
    launch_site: 'CCAFS SLC-41',
    landing_site: 'KSC Shuttle Landing Facility',
    apogee: '~390 km',
    notes:
      'Sixth X-37B flight — first under the new USSF organisational designation; record-setting 908 days on orbit (~2.5 years). Launched 2020-05-17 13:14 UTC from CCAFS SLC-41 on Atlas V 501 AV-081; landed at KSC SLF 2022-11-12 10:22 UTC. Carried the Naval Research Laboratory PRAM (Photovoltaic RF Antenna Module — 1 W solar power-to-microwave-beaming experiment) and an AFRL FalconSAT-8 deployer.',
  },
  {
    id: 'otv-7',
    name: 'X-37B OTV-7 (USA-358, USSF-52)',
    designation: 'USA-358 / USSF-52',
    dep: '2023-12-29',
    arr: '2025-03-07',
    days: 434,
    vehicle: 'Falcon Heavy',
    launch_site: 'KSC LC-39A',
    landing_site: 'Vandenberg SFB',
    apogee: 'HEO ~38,800 km × 250 km (first highly-elliptical OTV flight)',
    notes:
      'Seventh X-37B flight — first to a highly-elliptical (HEO) orbit and first launched on Falcon Heavy. Launched 2023-12-29 01:07 UTC from KSC LC-39A; both side boosters recovered at LZ-1 / LZ-2, centre core expended for the HEO insertion energy. The HEO trajectory took the OTV to roughly the GEO belt altitude at apogee. Performed a controlled aerobraking-style de-orbit sequence (USSF released a public update on the manoeuvre, a deliberate transparency departure from earlier classified flights). Landed at Vandenberg SFB 2025-03-07 09:22 UTC.',
  },
];

const MARINER10 = {
  id: 'mariner10',
  name: 'Mariner 10',
  agency: 'NASA',
  agency_full: 'National Aeronautics and Space Administration / Jet Propulsion Laboratory',
  color: NASA,
  crewed: false,
  year: 1973,
  dest: 'MERCURY',
  status: 'FLOWN',
  departure_date: '1973-11-03',
  arrival_date: '1974-03-29',
  transit_days: 146,
  vehicle: 'Atlas SLV-3D Centaur (AC-34)',
  payload: '503 kg — TV cameras, IR + UV spectrometers, magnetometer, charged-particle telescope',
  delta_v: '~13.7 km/s (Venus gravity-assist trajectory)',
  type: 'PLANETARY FLYBY · FLOWN',
  first: 'First Mercury flyby; first dual-planet flyby; first gravity-assist mission',
  description:
    "First spacecraft to visit Mercury, first to fly past two planets, and first to use a gravity assist to reach its destination. Launched 1973-11-03 05:45 UTC from Cape Canaveral LC-36B on Atlas SLV-3D Centaur AC-34. Mariner 10 swung past Venus on 1974-02-05 (5768 km closest approach, first UV cloud-belt imaging of Venus) using the encounter to drop its perihelion into Mercury's orbital realm — the first deliberate gravity-assist trajectory in space history. Made three Mercury flybys: 1974-03-29 (703 km), 1974-09-21 (48069 km), and 1975-03-16 (327 km). Imaged ~45% of Mercury's surface — the only resolved imagery available until MESSENGER (2008-2015). Discovered Mercury's intrinsic magnetic field and thin sodium-helium exosphere. Solar-array temperature management was an open mission engineering problem: project scientists tilted the panels and rolled the spacecraft to keep them under 115°C. Mission ended 1975-03-24 when attitude-control nitrogen propellant was depleted; spacecraft is presumed to be in heliocentric orbit, periodically passing Mercury.",
  fleet_refs: [{ id: 'atlas-slv-3d', role: 'launcher' }],
  events: [
    {
      met: 0,
      label: 'LAUNCH',
      note: 'Atlas SLV-3D Centaur AC-34 from CCAFS LC-36B 1973-11-03 05:45 UTC.',
      type: 'nominal',
    },
    {
      met: 94,
      label: 'VENUS FLYBY',
      note: '5768 km closest approach 1974-02-05; first deliberate gravity-assist trajectory in space history.',
      type: 'nominal',
    },
    {
      met: 146,
      label: 'MERCURY 1',
      note: '703 km closest approach 1974-03-29; first Mercury images.',
      type: 'nominal',
    },
    {
      met: 322,
      label: 'MERCURY 2',
      note: '48069 km closest approach 1974-09-21; southern-hemisphere imaging.',
      type: 'nominal',
    },
    {
      met: 498,
      label: 'MERCURY 3',
      note: '327 km closest approach 1975-03-16; magnetic-field re-confirmation.',
      type: 'nominal',
    },
    {
      met: 506,
      label: 'PROPELLANT END',
      note: 'N₂ attitude-control gas depleted 1975-03-24; transmitter commanded off.',
      type: 'nominal',
    },
  ],
  links: [
    { l: 'Mariner 10 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Mariner_10', t: 'intro' },
    {
      l: 'Mariner 10 (NASA NSSDCA)',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1973-085A',
      t: 'core',
    },
    {
      l: 'Mariner 10 mission archive (JPL)',
      u: 'https://www.jpl.nasa.gov/missions/mariner-10',
      t: 'deep',
    },
  ],
};

function buildOtvBase(o) {
  return {
    id: o.id,
    agency: 'USSF',
    agency_full:
      'United States Space Force (formerly USAF Air Force Rapid Capabilities Office) / Boeing Phantom Works',
    sector: 'gov',
    dest: 'EARTH',
    color: USSF,
    year: parseInt(o.dep.slice(0, 4), 10),
    status: 'FLOWN',
    departure_date: o.dep,
    arrival_date: o.arr,
    transit_days: o.days,
    vehicle: o.vehicle,
    payload:
      o.designation + '; X-37B Orbital Test Vehicle (~5000 kg). Payloads largely classified.',
    delta_v: '~9.4 km/s (LEO)',
    data_quality: 'good',
    credit: '© USSF / Boeing X-37B programme; press releases via spaceforce.mil.',
    links: [
      { l: 'X-37B OTV-N — Wikipedia', u: 'https://en.wikipedia.org/wiki/Boeing_X-37', t: 'intro' },
      {
        l: 'X-37B Orbital Test Vehicle — USSF',
        u: 'https://www.spaceforce.mil/About-Us/Fact-Sheets/Article/2197756/x-37b-orbital-test-vehicle/',
        t: 'core',
      },
      {
        l: "Gunter's Space Page — X-37B mission log",
        u: 'https://space.skyrocket.de/doc_sdat/x-37b.htm',
        t: 'deep',
      },
    ],
    flight_data_quality: 'reconstructed',
    fleet_refs: [
      {
        id: o.vehicle.includes('Atlas V')
          ? 'atlas-v'
          : o.vehicle.includes('Falcon Heavy')
            ? 'falcon-heavy'
            : 'falcon-9',
        role: 'launcher',
      },
      { id: 'x37b', role: 'spacecraft' },
      {
        id: o.launch_site.includes('LC-39A') ? 'lc-39a' : 'cape-canaveral-slc-41',
        role: 'launch-site',
      },
    ],
  };
}

function buildOtvOverlay(o) {
  return {
    name: o.name,
    type: 'UNCREWED SPACEPLANE · FLOWN',
    first: o.designation + ' — ' + o.days + ' days on orbit, ' + o.landing_site,
    description: o.notes,
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: o.vehicle + ' from ' + o.launch_site + ' ' + o.dep + '.',
        type: 'nominal',
      },
      {
        met: o.days * 0.5,
        label: 'ON-ORBIT OPS',
        note: 'Apogee ' + o.apogee + '; classified payload operations.',
        type: 'info',
      },
      {
        met: o.days,
        label: 'LANDING',
        note: 'Autonomous runway landing at ' + o.landing_site + ' ' + o.arr + '.',
        type: 'nominal',
      },
    ],
  };
}

function buildMariner10Base(m) {
  return {
    id: m.id,
    agency: m.agency,
    agency_full: m.agency_full,
    sector: 'gov',
    dest: m.dest,
    color: m.color,
    year: m.year,
    status: m.status,
    departure_date: m.departure_date,
    arrival_date: m.arrival_date,
    transit_days: m.transit_days,
    vehicle: m.vehicle,
    payload: m.payload,
    delta_v: m.delta_v,
    data_quality: 'good',
    credit: '© NASA / JPL / Mariner 10 mission report. Public domain / archive.',
    links: m.links,
    flight_data_quality: 'reconstructed',
    fleet_refs: m.fleet_refs,
  };
}

async function main() {
  const indexPath = join(MISSIONS, 'index.json');
  const idx = JSON.parse(await readFile(indexPath, 'utf8'));
  const existing = new Set(idx.map((e) => e.id));

  // OTV missions → /missions/earth/
  for (const o of OTV) {
    const basePath = join(MISSIONS, 'earth', o.id + '.json');
    await mkdir(dirname(basePath), { recursive: true });
    await writeFile(basePath, JSON.stringify(buildOtvBase(o), null, 2) + '\n');
    const overlayPath = join(I18N, 'en-US', 'missions', 'earth', o.id + '.json');
    await mkdir(dirname(overlayPath), { recursive: true });
    await writeFile(overlayPath, JSON.stringify(buildOtvOverlay(o), null, 2) + '\n');
    console.log('✓ ' + o.id);
    if (!existing.has(o.id)) {
      idx.push({
        id: o.id,
        agency: 'USSF',
        dest: 'EARTH',
        status: 'FLOWN',
        year: parseInt(o.dep.slice(0, 4), 10),
        sector: 'gov',
        color: USSF,
        crewed: false,
      });
      existing.add(o.id);
    }
  }

  // Mariner 10 → /missions/mercury/
  const m10BasePath = join(MISSIONS, 'mercury', MARINER10.id + '.json');
  await mkdir(dirname(m10BasePath), { recursive: true });
  await writeFile(m10BasePath, JSON.stringify(buildMariner10Base(MARINER10), null, 2) + '\n');
  const m10OverlayPath = join(I18N, 'en-US', 'missions', 'mercury', MARINER10.id + '.json');
  await mkdir(dirname(m10OverlayPath), { recursive: true });
  await writeFile(
    m10OverlayPath,
    JSON.stringify(
      {
        name: MARINER10.name,
        type: MARINER10.type,
        first: MARINER10.first,
        description: MARINER10.description,
        events: MARINER10.events,
      },
      null,
      2,
    ) + '\n',
  );
  console.log('✓ ' + MARINER10.id);
  if (!existing.has(MARINER10.id)) {
    idx.push({
      id: MARINER10.id,
      agency: MARINER10.agency,
      dest: MARINER10.dest,
      status: MARINER10.status,
      year: MARINER10.year,
      sector: 'gov',
      color: MARINER10.color,
      crewed: false,
    });
    existing.add(MARINER10.id);
  }

  await writeFile(indexPath, JSON.stringify(idx, null, 2) + '\n');
  console.log('\n✓ missions/index.json updated');

  // Add flights[] roster + linked_missions to x37b fleet entry
  const x37bPath = join(FLEET, 'crewed-spacecraft', 'x37b.json');
  const x37b = JSON.parse(await readFile(x37bPath, 'utf8'));
  x37b.flights = OTV.map((o) => ({
    mission_id: o.id,
    flight_designation:
      o.name + ' (' + o.dep + ') · ' + o.days + 'd · ' + o.vehicle + ' · ' + o.landing_site,
  }));
  x37b.linked_missions = Array.from(
    new Set([...(x37b.linked_missions || []), ...OTV.map((o) => o.id)]),
  ).sort();
  await writeFile(x37bPath, JSON.stringify(x37b, null, 2) + '\n');
  console.log('✓ x37b.flights + linked_missions wired (' + OTV.length + ' OTV flights)');

  // Reciprocal linked_missions on launcher / launch-site / lander entries
  const RECIPROCAL = {
    'launcher/atlas-v': OTV.filter((o) => o.vehicle.includes('Atlas V')).map((o) => o.id),
    'launcher/falcon-9': OTV.filter((o) => o.vehicle.includes('Falcon 9')).map((o) => o.id),
    'launcher/falcon-heavy': OTV.filter((o) => o.vehicle.includes('Falcon Heavy')).map((o) => o.id),
    'launch-site/cape-canaveral-slc-41': OTV.filter((o) => o.launch_site.includes('SLC-41')).map(
      (o) => o.id,
    ),
    'launch-site/lc-39a': OTV.filter((o) => o.launch_site.includes('LC-39A')).map((o) => o.id),
    'launcher/atlas-slv-3d': ['mariner10'],
  };
  for (const [relPath, missionIds] of Object.entries(RECIPROCAL)) {
    if (missionIds.length === 0) continue;
    const path = join(FLEET, relPath + '.json');
    let obj;
    try {
      obj = JSON.parse(await readFile(path, 'utf8'));
    } catch {
      console.warn('  ⚠ skip ' + relPath + ' (file missing)');
      continue;
    }
    const prev = new Set(obj.linked_missions || []);
    const before = prev.size;
    for (const id of missionIds) prev.add(id);
    obj.linked_missions = Array.from(prev).sort();
    await writeFile(path, JSON.stringify(obj, null, 2) + '\n');
    console.log(
      '  ↔ ' + relPath + ' linked_missions ' + before + ' → ' + obj.linked_missions.length,
    );
  }

  // Expand the buran-ok-gli credit paragraph to highlight 3-4 notable atmospheric flights inline.
  const okGliPath = join(FLEET, 'crewed-spacecraft', 'buran-ok-gli.json');
  const okGli = JSON.parse(await readFile(okGliPath, 'utf8'));
  const HIGHLIGHTS =
    ' Notable flights from the 24-flight programme: maiden runway taxi + lift-off 1985-11-10 (Igor Volk, Rimantas Stankyavichus); first fully-automated landing 1987-03-27 (validating the autoland system used on the 1988-11-15 orbital Buran flight); final test flight 1988-04-15 sealing the atmospheric campaign before the orbital flight.';
  if (!okGli.credit.includes('Notable flights from the 24-flight programme')) {
    okGli.credit = okGli.credit.replace(
      /(\.)(\s*After the Buran programme cancellation)/,
      '$1' + HIGHLIGHTS + '$2',
    );
    await writeFile(okGliPath, JSON.stringify(okGli, null, 2) + '\n');
    console.log('✓ buran-ok-gli credit paragraph expanded with 3 notable atmospheric flights');
  } else {
    console.log('· buran-ok-gli already has flight highlights — skipped');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
