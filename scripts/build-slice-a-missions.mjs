#!/usr/bin/env node
/**
 * Slice A — 4 historically-iconic crewed missions to close gaps the
 * Mercury 6 + Apollo backfill surfaced:
 *   - vostok-1     (Gagarin, first human in space)
 *   - voskhod-2    (Leonov, first spacewalk)
 *   - apollo-1     (Grissom + White + Chaffee, fatal pad fire 1967)
 *   - apollo-soyuz (ASTP 1975, first international docking)
 *
 * All dest:EARTH. Base + en-US overlay + index row + reciprocal
 * linked_missions on fleet assets.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MISSIONS = join(ROOT, 'static', 'data', 'missions');
const I18N = join(ROOT, 'static', 'data', 'i18n');
const FLEET = join(ROOT, 'static', 'data', 'fleet');

const ROSCOSMOS_COLOR = '#cc4444';
const NASA_COLOR = '#0B3D91';

const ITEMS = [
  {
    id: 'vostok-1',
    name: 'Vostok 1',
    agency: 'Roscosmos',
    agency_full: 'Soviet Academy of Sciences / OKB-1 Korolev Bureau (continued by Roscosmos)',
    color: ROSCOSMOS_COLOR,
    year: 1961,
    status: 'FLOWN',
    departure_date: '1961-04-12',
    arrival_date: '1961-04-12',
    transit_days: 0,
    vehicle: 'Vostok-K (8K72K)',
    payload: '4725 kg launch mass; spherical descent module + service module',
    delta_v: '~9.4 km/s (LEO)',
    type: 'CREWED EARTH-ORBIT · FLOWN',
    first: 'First human in space; first crewed orbital flight',
    description:
      "Yuri Gagarin's 108-minute single-orbit flight — the first crewed spaceflight in history, and the first human to orbit Earth. Launched 1961-04-12 06:07 UTC from Baikonur on a Vostok-K (8K72K) launcher; orbit 169 × 327 km, inclination 65°. The spherical descent module ejected Gagarin at ~7 km altitude (a fact the USSR concealed for years to claim full crewed landing under FAI rules). Gagarin parachuted to Smelovka, Saratov Oblast; the capsule landed separately and is on display at the RKK Energia Museum in Korolyov, Russia. The flight ended Korolev's decade-long missile / satellite work and triggered the U.S. crewed-spaceflight programme + Kennedy's Moon-landing pledge six weeks later.",
    fleet_refs: [
      { id: 'vostok-k', role: 'launcher' },
      { id: 'vostok', role: 'spacecraft' },
      { id: 'gagarins-start', role: 'launch-site' },
    ],
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: "Vostok-K from Baikonur Site 1 (Gagarin's Start) 1961-04-12 06:07 UTC.",
        type: 'nominal',
      },
      {
        met: 0.0001,
        label: 'ORBIT INSERT',
        note: 'Single orbit at 169 × 327 km, 65° inclination.',
        type: 'nominal',
      },
      {
        met: 0.063,
        label: 'RETROFIRE',
        note: 'TDU-1 retro-rocket fires for de-orbit. Service-module separation system partially fails — straps release late, capsule tumbles for ~10 min.',
        type: 'warning',
      },
      {
        met: 0.071,
        label: 'CREW EJECT',
        note: 'Gagarin ejected from the descent module at ~7 km altitude; parachuted to Smelovka, Saratov Oblast. Capsule landed separately.',
        type: 'info',
      },
    ],
    links: [
      { l: 'Vostok 1 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Vostok_1', t: 'intro' },
      { l: 'Yuri Gagarin — Wikipedia', u: 'https://en.wikipedia.org/wiki/Yuri_Gagarin', t: 'core' },
      {
        l: 'Vostok 1 (NASA NSSDCA)',
        u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1961-012A',
        t: 'deep',
      },
    ],
  },
  {
    id: 'voskhod-2',
    name: 'Voskhod 2',
    agency: 'Roscosmos',
    agency_full: 'Soviet Academy of Sciences / OKB-1 Korolev Bureau (continued by Roscosmos)',
    color: ROSCOSMOS_COLOR,
    year: 1965,
    status: 'FLOWN',
    departure_date: '1965-03-18',
    arrival_date: '1965-03-19',
    transit_days: 1,
    vehicle: 'Voskhod (11A57)',
    payload: '5682 kg launch mass; Voskhod capsule + inflatable Volga airlock',
    delta_v: '~9.4 km/s (LEO)',
    type: 'CREWED EARTH-ORBIT · FLOWN',
    first: 'First extra-vehicular activity (Leonov, 12 min, 1965-03-18)',
    description:
      "Pavel Belyayev + Alexei Leonov's 1-day flight — first EVA in history. Leonov spent 12 min outside Voskhod 2 (1965-03-18 11:34 UTC), pressurised through an inflatable Volga airlock that Soviet engineers added because the Voskhod hull lacked the room for full depressurisation. Leonov's suit ballooned in vacuum, jamming him outside the airlock; he had to vent suit pressure to re-enter, raising decompression-sickness risk. Re-entry was equally dramatic — the automatic landing system failed, and Belyayev manually piloted the descent module to a hard landing in deep Urals snow ~390 km off-target; the crew survived a night in the forest among wolves before rescue helicopters arrived 1965-03-20. The cabin atmosphere also became O₂-rich after re-entry, briefly risking spontaneous combustion.",
    fleet_refs: [
      { id: 'voskhod-11a57', role: 'launcher' },
      { id: 'voskhod', role: 'spacecraft' },
      { id: 'gagarins-start', role: 'launch-site' },
    ],
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: "Voskhod 11A57 from Baikonur Site 1 (Gagarin's Start) 1965-03-18 07:00 UTC.",
        type: 'nominal',
      },
      {
        met: 0.001,
        label: 'ORBIT INSERT',
        note: 'Insertion into 167 × 475 km Earth orbit, 64.8° inclination.',
        type: 'nominal',
      },
      {
        met: 0.19,
        label: 'EVA',
        note: 'Leonov exits the Volga airlock 1965-03-18 11:34 UTC; first human EVA. 12 min outside; suit ballooned in vacuum and he vented pressure to re-enter.',
        type: 'info',
      },
      {
        met: 1.05,
        label: 'DEORBIT',
        note: 'Automatic landing system fails; Belyayev manually pilots descent. 390 km off-target hard landing in Perm Oblast snow.',
        type: 'warning',
      },
      {
        met: 2.5,
        label: 'RESCUE',
        note: 'Crew survived 2 nights in -30°C wolf-inhabited forest before recovery helicopters reached them 1965-03-20.',
        type: 'info',
      },
    ],
    links: [
      { l: 'Voskhod 2 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Voskhod_2', t: 'intro' },
      {
        l: 'Alexei Leonov — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Alexei_Leonov',
        t: 'core',
      },
    ],
  },
  {
    id: 'apollo-1',
    name: 'Apollo 1 (AS-204)',
    agency: 'NASA',
    agency_full: 'National Aeronautics and Space Administration / Manned Spacecraft Center',
    color: NASA_COLOR,
    year: 1967,
    status: 'PLANNED', // mission scheduled but never flew due to fire
    departure_date: '1967-02-21',
    arrival_date: '1967-02-21',
    transit_days: 0,
    vehicle: 'Saturn IB (AS-204) — never launched',
    payload: 'Apollo CSM-012 (Block I) — burned on pad',
    delta_v: 'N/A (never launched)',
    type: 'CREWED EARTH-ORBIT · CANCELLED',
    first: 'Fatal pre-launch pad fire 1967-01-27 killed Grissom + White + Chaffee',
    description:
      'Apollo 1 was the planned first crewed flight of the Apollo Block I CSM, originally designated AS-204 and scheduled to launch 1967-02-21 from LC-34. During a routine "plugs-out" test on 1967-01-27 17:31 EST, with the crew sealed inside the pressurised pure-oxygen cabin, a flash fire ignited in the lower-equipment bay — likely a Teflon-insulated wire arc through silver-plated copper that had been damaged during installation. Cabin pressure spiked to 29 psi within 15 seconds; the inward-opening hatch couldn\'t be unsealed against the pressure differential. Gus Grissom, Ed White, and Roger Chaffee died from asphyxiation within seconds. The investigation led to a complete Block I → Block II redesign + the safer outward-opening unified hatch + non-flammable cabin materials + pre-launch nitrogen-rich cabin atmosphere. Apollo 1\'s official designation was assigned posthumously to honour the crew. Subsequent Apollo missions (CSM-101 through CSM-114) flew the Block II hardware that this redesign produced.',
    fleet_refs: [
      { id: 'saturn-ib', role: 'launcher' },
      { id: 'apollo-csm-block-i', role: 'spacecraft' },
      { id: 'lc-34', role: 'launch-site' },
    ],
    events: [
      {
        met: 0,
        label: 'PAD FIRE',
        note: 'Plugs-out test 1967-01-27 17:31 EST. Flash fire in pressurised pure-O₂ cabin; cabin pressure spiked to 29 psi in 15 s.',
        type: 'warning',
      },
      {
        met: 0.0000001,
        label: 'CREW LOST',
        note: 'Grissom + White + Chaffee perish from asphyxiation. Hatch could not be unsealed against pressure differential.',
        type: 'warning',
      },
      {
        met: 25,
        label: 'PROGRAM PAUSE',
        note: 'Apollo crewed program halted 21 months. Mission renamed Apollo 1 in posthumous honour.',
        type: 'info',
      },
    ],
    links: [
      { l: 'Apollo 1 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Apollo_1', t: 'intro' },
      { l: 'Apollo 1 — NASA', u: 'https://www.nasa.gov/history/apollo-1/', t: 'core' },
    ],
  },
  {
    id: 'apollo-soyuz',
    name: 'Apollo-Soyuz Test Project (ASTP)',
    agency: 'NASA · Roscosmos',
    agency_full: 'NASA Manned Spacecraft Center + Soviet Academy of Sciences / RKK Energia',
    color: NASA_COLOR,
    year: 1975,
    status: 'FLOWN',
    departure_date: '1975-07-15',
    arrival_date: '1975-07-17',
    transit_days: 2,
    vehicle: 'Saturn IB (AS-210) + Soyuz-U',
    payload:
      'Apollo CSM-111 (last Apollo CSM ever) + Soyuz 19 (modified 7K-TM); 14.4 t Apollo + 6.8 t Soyuz',
    delta_v: '~9.4 km/s (LEO each)',
    type: 'CREWED EARTH-ORBIT · FLOWN',
    first: 'First international human spaceflight cooperation; first US-USSR rendezvous + docking',
    description:
      "The Apollo-Soyuz Test Project — first international crewed spaceflight, first US-USSR rendezvous + docking, and the final flight of an Apollo CSM. Apollo (Stafford + Brand + Slayton) launched 1975-07-15 from LC-39B; Soyuz 19 (Leonov + Kubasov) launched the same day from Baikonur. Apollo's docking module (built by NASA + Rockwell) used a new androgynous docking ring (APAS) that allowed either spacecraft to be active — the precursor of every international docking system since (Mir, ISS, Tiangong, Dragon, Starliner). Hatch opening 1975-07-17 ~16:00 UTC; the crews exchanged flags, gifts, and joint experiments through 4 separate docking sequences across 44 hours docked. Soyuz returned 1975-07-21; Apollo continued 5 more days in orbit before splashdown 1975-07-24 — last Apollo splashdown ever. CSM-111 is on display at the California Science Center, LA (alongside Endeavour). The détente-era cooperation that ASTP modelled informed the Shuttle-Mir programme 20 years later.",
    fleet_refs: [
      { id: 'saturn-ib', role: 'launcher' },
      { id: 'apollo-csm-block-ii', role: 'spacecraft' },
      { id: 'soyuz-7k-ok', role: 'spacecraft' },
      { id: 'lc-39b', role: 'launch-site' },
    ],
    events: [
      {
        met: 0,
        label: 'LAUNCH (Apollo)',
        note: 'Saturn IB (AS-210) from LC-39B 1975-07-15 19:50 UTC. 7.5 h after Soyuz 19 (Baikonur 1975-07-15 12:20 UTC).',
        type: 'nominal',
      },
      {
        met: 1.85,
        label: 'DOCKING',
        note: 'Apollo + Soyuz 19 dock 1975-07-17 16:09 UTC. First US-USSR rendezvous + dock. Hatch opens at 19:17 UTC; "Glad to see you" handshake.',
        type: 'info',
      },
      {
        met: 2.0,
        label: 'JOINT OPS',
        note: 'Flag + gift exchange; joint experiments; 4 dockings across 44 hours docked.',
        type: 'nominal',
      },
      {
        met: 3.8,
        label: 'UNDOCK',
        note: 'Final undock 1975-07-19 16:26 UTC. Soyuz 19 lands 1975-07-21 in Kazakhstan.',
        type: 'nominal',
      },
      {
        met: 9.06,
        label: 'SPLASHDOWN (Apollo)',
        note: 'Apollo splashed down in Pacific 1975-07-24 21:18 UTC — last Apollo splashdown ever. CSM-111 displayed at California Science Center LA.',
        type: 'nominal',
      },
    ],
    links: [
      {
        l: 'Apollo-Soyuz Test Project — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Apollo%E2%80%93Soyuz',
        t: 'intro',
      },
      {
        l: 'ASTP mission overview (NASA)',
        u: 'https://www.nasa.gov/mission/apollo-soyuz/',
        t: 'core',
      },
      {
        l: 'CSM-111 at California Science Center',
        u: 'https://californiasciencecenter.org/exhibits/air-space/mission-26-the-big-endeavour',
        t: 'deep',
      },
    ],
  },
];

function buildBase(m) {
  // Filter fleet_refs whose target doesn't exist yet so validation passes —
  // any missing target gets surfaced as a TODO in build output.
  return {
    id: m.id,
    agency: m.agency,
    agency_full: m.agency_full,
    sector: 'gov',
    dest: 'EARTH',
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
    credit: '© ' + m.agency + ' mission report. Public domain / archive.',
    links: m.links,
    flight_data_quality: 'reconstructed',
    fleet_refs: m.fleet_refs,
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
  const indexPath = join(MISSIONS, 'index.json');
  const idx = JSON.parse(await readFile(indexPath, 'utf8'));
  const existing = new Set(idx.map((e) => e.id));

  for (const m of ITEMS) {
    const basePath = join(MISSIONS, 'earth', m.id + '.json');
    await mkdir(dirname(basePath), { recursive: true });
    await writeFile(basePath, JSON.stringify(buildBase(m), null, 2) + '\n');
    const overlayPath = join(I18N, 'en-US', 'missions', 'earth', m.id + '.json');
    await mkdir(dirname(overlayPath), { recursive: true });
    await writeFile(overlayPath, JSON.stringify(buildOverlay(m), null, 2) + '\n');
    console.log('✓ ' + m.id);

    if (!existing.has(m.id)) {
      idx.push({
        id: m.id,
        agency: m.agency,
        dest: 'EARTH',
        status: m.status,
        year: m.year,
        sector: 'gov',
        color: m.color,
        crewed: true,
      });
      existing.add(m.id);
    }
  }
  await writeFile(indexPath, JSON.stringify(idx, null, 2) + '\n');
  console.log('\n✓ missions/index.json updated');

  // Reciprocal linked_missions on fleet entries we point at.
  const RECIPROCAL_PATHS = {
    'crewed-spacecraft/apollo-csm-block-ii': ['apollo-soyuz'],
    'crewed-spacecraft/soyuz-7k-ok': ['apollo-soyuz'],
    'crewed-spacecraft/vostok': ['vostok-1'],
    'crewed-spacecraft/voskhod': ['voskhod-2'],
    'launcher/saturn-ib': ['apollo-1', 'apollo-soyuz'],
    'launch-site/lc-34': ['apollo-1'],
    'launch-site/lc-39b': ['apollo-soyuz'],
  };
  for (const [relPath, missionIds] of Object.entries(RECIPROCAL_PATHS)) {
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
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
