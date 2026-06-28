#!/usr/bin/env node
/**
 * Slice B — 12 EARTH crewed missions filling Vostok / Voskhod tail,
 * Skylab crews, Shenzhou debut and modern commercial crewed flights.
 *
 *   - shenzhou-1   (uncrewed PRC orbital test, 1999)
 *   - vostok-2..6  (Titov / Nikolayev / Popovich / Bykovsky / Tereshkova)
 *   - voskhod-1    (Komarov+Feoktistov+Yegorov, first 3-crew orbital)
 *   - skylab-2..4  (Conrad / Bean / Carr crews, US first station ops)
 *   - inspiration4 (first all-civilian orbital, 2021)
 *   - polaris-dawn (first commercial EVA, 2024)
 *
 * Base + en-US overlay + index row + reciprocal linked_missions on
 * the fleet entries we touch.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MISSIONS = join(ROOT, 'static', 'data', 'missions');
const I18N = join(ROOT, 'static', 'data', 'i18n');
const FLEET = join(ROOT, 'static', 'data', 'fleet');

const RUS = '#cc4444';
const NASA = '#0B3D91';
const PRC = '#de2910';
const SPX = '#005288';

const ITEMS = [
  {
    id: 'shenzhou-1',
    name: 'Shenzhou 1',
    agency: 'CNSA',
    agency_full:
      'China National Space Administration / China Aerospace Science and Technology Corporation',
    color: PRC,
    crewed: false,
    year: 1999,
    status: 'FLOWN',
    departure_date: '1999-11-20',
    arrival_date: '1999-11-21',
    transit_days: 1,
    vehicle: 'Long March 2F',
    payload: '7600 kg launch mass; uncrewed Shenzhou prototype with mock-up systems',
    delta_v: '~9.4 km/s (LEO)',
    type: 'CREW-RATED TEST · UNCREWED · FLOWN',
    first: "China's first Shenzhou orbital test — opened the path to crewed PRC spaceflight",
    description:
      "First flight of the Shenzhou crewed-spacecraft programme. Launched 1999-11-20 22:30 UTC from Jiuquan on the inaugural flight of the human-rated Long March 2F (CZ-2F). The capsule completed 14 orbits at 196 × 324 km, 42.6° inclination, and re-entered to recovery on the Inner Mongolia steppe 1999-11-21 19:41 UTC. Carried mock-up life-support hardware, telemetry packages, and a Chinese flag, plus seeds for a microgravity-genetics return cargo. Marked China's commitment to follow the USSR / USA into independent crewed spaceflight; led directly to Shenzhou 5 (2003) with Yang Liwei.",
    fleet_refs: [
      { id: 'long-march-2f', role: 'launcher' },
      { id: 'shenzhou', role: 'spacecraft' },
      { id: 'jiuquan-slc-43', role: 'launch-site' },
    ],
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Long March 2F maiden flight from Jiuquan SLC-43 at 22:30 UTC.',
        type: 'nominal',
      },
      {
        met: 0.001,
        label: 'ORBIT',
        note: '14-orbit flight at 196 × 324 km, 42.6° inclination.',
        type: 'nominal',
      },
      {
        met: 0.875,
        label: 'DE-ORBIT',
        note: 'Service-module retro-fire over Africa.',
        type: 'nominal',
      },
      {
        met: 0.882,
        label: 'RECOVERY',
        note: 'Capsule descended to Siziwang Banner, Inner Mongolia, 1999-11-21 19:41 UTC.',
        type: 'nominal',
      },
    ],
    links: [
      { l: 'Shenzhou 1 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Shenzhou_1', t: 'intro' },
      {
        l: 'Long March 2F — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Long_March_2F',
        t: 'core',
      },
      {
        l: 'Shenzhou programme overview (NASA NSSDCA)',
        u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1999-061A',
        t: 'deep',
      },
    ],
  },

  {
    id: 'vostok-2',
    name: 'Vostok 2',
    agency: 'Roscosmos',
    agency_full: 'Soviet Academy of Sciences / OKB-1 Korolev Bureau (continued by Roscosmos)',
    color: RUS,
    crewed: true,
    year: 1961,
    status: 'FLOWN',
    departure_date: '1961-08-06',
    arrival_date: '1961-08-07',
    transit_days: 1,
    vehicle: 'Vostok-K (8K72K)',
    payload: '4731 kg launch mass; single cosmonaut',
    delta_v: '~9.4 km/s (LEO)',
    type: 'CREWED EARTH-ORBIT · FLOWN',
    first: 'First day in space — 17 orbits over 25 hours',
    description:
      "Gherman Titov's 17-orbit, 25-hour flight — the second human in space and the first to spend over a day in orbit. Launched 1961-08-06 06:00 UTC from Baikonur; at 25 years 10 months Titov remained the youngest person ever launched into space until 2021 (Oliver Daemen, NS-16). Tested human reactions to prolonged microgravity — Titov reported the first case of space motion sickness, slept ~8 hours on orbit, and made the first hand-camera Earth photographs. Capsule landed near Krasny Kut, Saratov Oblast 1961-08-07 07:18 UTC after Titov ejected during descent. Service-module strap separation problem (same as Vostok 1) recurred.",
    fleet_refs: [
      { id: 'vostok-k', role: 'launcher' },
      { id: 'vostok', role: 'spacecraft' },
      { id: 'gagarins-start', role: 'launch-site' },
    ],
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Vostok-K from Baikonur Site 1 1961-08-06 06:00 UTC.',
        type: 'nominal',
      },
      {
        met: 0.5,
        label: 'EARTH PHOTOS',
        note: 'Titov made the first hand-camera photographs of Earth from orbit.',
        type: 'info',
      },
      { met: 0.8, label: 'SLEEP', note: 'First sleep period in space (~8 hours).', type: 'info' },
      {
        met: 1.04,
        label: 'EJECT + LAND',
        note: 'Capsule de-orbited; Titov ejected at ~7 km and parachuted to Krasny Kut.',
        type: 'nominal',
      },
    ],
    links: [
      { l: 'Vostok 2 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Vostok_2', t: 'intro' },
      {
        l: 'Gherman Titov — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Gherman_Titov',
        t: 'core',
      },
    ],
  },

  {
    id: 'vostok-3',
    name: 'Vostok 3',
    agency: 'Roscosmos',
    agency_full: 'Soviet Academy of Sciences / OKB-1 Korolev Bureau (continued by Roscosmos)',
    color: RUS,
    crewed: true,
    year: 1962,
    status: 'FLOWN',
    departure_date: '1962-08-11',
    arrival_date: '1962-08-15',
    transit_days: 4,
    vehicle: 'Vostok-K (8K72K)',
    payload: '4722 kg launch mass; single cosmonaut',
    delta_v: '~9.4 km/s (LEO)',
    type: 'CREWED EARTH-ORBIT · FLOWN',
    first: 'First dual-flight rendezvous — flew within ~6.5 km of Vostok 4',
    description:
      "Andriyan Nikolayev's 64-orbit flight, launched 1962-08-11 08:30 UTC. Twenty-four hours after launch Vostok 4 (Popovich) joined him in orbit — the closest approach was approximately 6.5 km, though no actual rendezvous capability existed (the two capsules had no manoeuvring thrusters). The simultaneous flight was a propaganda response to US suborbital missions and to John Glenn's Friendship 7. Nikolayev landed 1962-08-15 07:55 UTC near Karaganda, Kazakh SSR, after almost 4 days in space.",
    fleet_refs: [
      { id: 'vostok-k', role: 'launcher' },
      { id: 'vostok', role: 'spacecraft' },
      { id: 'gagarins-start', role: 'launch-site' },
    ],
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Vostok-K from Baikonur Site 1 1962-08-11 08:30 UTC.',
        type: 'nominal',
      },
      {
        met: 0.25,
        label: 'VOSTOK 4 RDV',
        note: 'Vostok 4 launched 24h later; closest approach ~6.5 km on day 2.',
        type: 'info',
      },
      {
        met: 3.98,
        label: 'EJECT + LAND',
        note: 'Nikolayev landed near Karaganda 1962-08-15 07:55 UTC after 64 orbits.',
        type: 'nominal',
      },
    ],
    links: [
      { l: 'Vostok 3 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Vostok_3', t: 'intro' },
      {
        l: 'Andriyan Nikolayev — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Andriyan_Nikolayev',
        t: 'core',
      },
    ],
  },

  {
    id: 'vostok-4',
    name: 'Vostok 4',
    agency: 'Roscosmos',
    agency_full: 'Soviet Academy of Sciences / OKB-1 Korolev Bureau (continued by Roscosmos)',
    color: RUS,
    crewed: true,
    year: 1962,
    status: 'FLOWN',
    departure_date: '1962-08-12',
    arrival_date: '1962-08-15',
    transit_days: 3,
    vehicle: 'Vostok-K (8K72K)',
    payload: '4728 kg launch mass; single cosmonaut',
    delta_v: '~9.4 km/s (LEO)',
    type: 'CREWED EARTH-ORBIT · FLOWN',
    first: 'Second half of first dual flight — first communications between two crewed spacecraft',
    description:
      "Pavel Popovich's 48-orbit flight, launched 1962-08-12 08:02 UTC, twenty-four hours after Vostok 3. The two capsules came within ~6.5 km and exchanged the first voice radio communications between cosmonauts in orbit. Popovich was ordered down a day early when ground controllers misinterpreted a coded phrase about thunder as the duress code-word for early termination — the real signal was a routine weather observation. Landed 1962-08-15 07:59 UTC near Karaganda, four minutes after Vostok 3.",
    fleet_refs: [
      { id: 'vostok-k', role: 'launcher' },
      { id: 'vostok', role: 'spacecraft' },
      { id: 'gagarins-start', role: 'launch-site' },
    ],
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Vostok-K from Baikonur Site 1 1962-08-12 08:02 UTC.',
        type: 'nominal',
      },
      {
        met: 0.001,
        label: 'INTER-CRAFT VOICE',
        note: 'First voice communication between two crewed spacecraft.',
        type: 'info',
      },
      {
        met: 2.99,
        label: 'EJECT + LAND',
        note: 'Landed near Karaganda 1962-08-15 07:59 UTC.',
        type: 'nominal',
      },
    ],
    links: [
      { l: 'Vostok 4 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Vostok_4', t: 'intro' },
      {
        l: 'Pavel Popovich — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Pavel_Popovich',
        t: 'core',
      },
    ],
  },

  {
    id: 'vostok-5',
    name: 'Vostok 5',
    agency: 'Roscosmos',
    agency_full: 'Soviet Academy of Sciences / OKB-1 Korolev Bureau (continued by Roscosmos)',
    color: RUS,
    crewed: true,
    year: 1963,
    status: 'FLOWN',
    departure_date: '1963-06-14',
    arrival_date: '1963-06-19',
    transit_days: 5,
    vehicle: 'Vostok-K (8K72K)',
    payload: '4720 kg launch mass; single cosmonaut',
    delta_v: '~9.4 km/s (LEO)',
    type: 'CREWED EARTH-ORBIT · FLOWN',
    first: 'Longest solo Earth-orbital flight — 4 days 23 hours, 81 orbits',
    description:
      "Valery Bykovsky's 81-orbit, 4-day-23-hour flight — still the longest solo Earth-orbital mission in history. Launched 1963-06-14 11:59 UTC; flew the second half of his mission alongside Vostok 6 (Tereshkova, launched 2 days later). Bykovsky's planned 8-day duration was shortened due to solar-flare radiation concerns and a slow orbital decay. Landed 1963-06-19 11:06 UTC near Karaganda after parachute separation.",
    fleet_refs: [
      { id: 'vostok-k', role: 'launcher' },
      { id: 'vostok', role: 'spacecraft' },
      { id: 'gagarins-start', role: 'launch-site' },
    ],
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Vostok-K from Baikonur Site 1 1963-06-14 11:59 UTC.',
        type: 'nominal',
      },
      {
        met: 2,
        label: 'VOSTOK 6 JOIN',
        note: 'Vostok 6 (Tereshkova) launched 1963-06-16 09:30 UTC.',
        type: 'info',
      },
      {
        met: 4.965,
        label: 'EJECT + LAND',
        note: 'Landed near Karaganda 1963-06-19 11:06 UTC after 81 orbits.',
        type: 'nominal',
      },
    ],
    links: [
      { l: 'Vostok 5 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Vostok_5', t: 'intro' },
      {
        l: 'Valery Bykovsky — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Valery_Bykovsky',
        t: 'core',
      },
    ],
  },

  {
    id: 'vostok-6',
    name: 'Vostok 6',
    agency: 'Roscosmos',
    agency_full: 'Soviet Academy of Sciences / OKB-1 Korolev Bureau (continued by Roscosmos)',
    color: RUS,
    crewed: true,
    year: 1963,
    status: 'FLOWN',
    departure_date: '1963-06-16',
    arrival_date: '1963-06-19',
    transit_days: 3,
    vehicle: 'Vostok-K (8K72K)',
    payload: '4713 kg launch mass; single cosmonaut',
    delta_v: '~9.4 km/s (LEO)',
    type: 'CREWED EARTH-ORBIT · FLOWN',
    first: 'First woman in space — Valentina Tereshkova, 48 orbits',
    description:
      "Valentina Tereshkova's 48-orbit, 2-day-23-hour flight — the first woman in space, and (until Soyuz MS-22 in 2022) the only woman to have flown a solo space mission. Selected from a group of five female cosmonaut candidates assembled in 1962, Tereshkova launched 1963-06-16 09:30 UTC, only 2 years after Gagarin's first orbital flight. Her capsule programmed for an upward-rather-than-downward orbit-correction burn — she manually identified the error and ground controllers re-uploaded corrected attitude software the next day. Landed 1963-06-19 08:20 UTC near Bayevo, Altai Krai. Tereshkova later became a senior figure in Soviet politics and remains the youngest woman ever flown to orbit at 26 years.",
    fleet_refs: [
      { id: 'vostok-k', role: 'launcher' },
      { id: 'vostok', role: 'spacecraft' },
      { id: 'gagarins-start', role: 'launch-site' },
    ],
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Vostok-K from Baikonur Site 1 1963-06-16 09:30 UTC.',
        type: 'nominal',
      },
      {
        met: 0.5,
        label: 'ORBIT-CORRECTION ERROR',
        note: 'Pre-loaded attitude software would have raised orbit instead of lowering it; corrected next day.',
        type: 'warning',
      },
      {
        met: 2.95,
        label: 'EJECT + LAND',
        note: 'Landed near Bayevo, Altai Krai, 1963-06-19 08:20 UTC after 48 orbits.',
        type: 'nominal',
      },
    ],
    links: [
      { l: 'Vostok 6 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Vostok_6', t: 'intro' },
      {
        l: 'Valentina Tereshkova — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Valentina_Tereshkova',
        t: 'core',
      },
    ],
  },

  {
    id: 'voskhod-1',
    name: 'Voskhod 1',
    agency: 'Roscosmos',
    agency_full: 'Soviet Academy of Sciences / OKB-1 Korolev Bureau (continued by Roscosmos)',
    color: RUS,
    crewed: true,
    year: 1964,
    status: 'FLOWN',
    departure_date: '1964-10-12',
    arrival_date: '1964-10-13',
    transit_days: 1,
    vehicle: 'Voskhod (11A57)',
    payload: '5320 kg launch mass; three cosmonauts (no spacesuits, no ejection seats)',
    delta_v: '~9.4 km/s (LEO)',
    type: 'CREWED EARTH-ORBIT · FLOWN',
    first: 'First multi-crew spaceflight — three cosmonauts in a Vostok-derived capsule',
    description:
      "First three-crew spaceflight in history. Komarov, Feoktistov and Yegorov flew 1964-10-12 to 1964-10-13 in a heavily modified Vostok capsule (designated Voskhod / 'Sunrise'). Ejection seats were removed and the cabin pressure system re-rated to allow three men to sit in shirtsleeves — a propaganda victory against the planned US Gemini two-crew flights, but a brutal compromise that left the crew with no escape capability during launch or re-entry. Cabin spacing was so tight Komarov reported he could feel Yegorov's breath on his neck for 24 hours. Landed 1964-10-13 07:47 UTC near Marevka, Kazakhstan, using the new soft-landing solid-rocket retro system because no parachute ejection was possible. While they were in orbit, Khrushchev was deposed; the crew returned to a fully different Soviet leadership.",
    fleet_refs: [
      { id: 'voskhod-11a57', role: 'launcher' },
      { id: 'voskhod', role: 'spacecraft' },
      { id: 'gagarins-start', role: 'launch-site' },
    ],
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Voskhod 11A57 from Baikonur Site 1 1964-10-12 07:30 UTC.',
        type: 'nominal',
      },
      {
        met: 0.8,
        label: 'KHRUSHCHEV DEPOSED',
        note: 'Soviet leadership change occurred during the flight.',
        type: 'info',
      },
      {
        met: 1.01,
        label: 'LAND',
        note: 'Soft-landing retro-rocket touchdown near Marevka 1964-10-13 07:47 UTC.',
        type: 'nominal',
      },
    ],
    links: [
      { l: 'Voskhod 1 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Voskhod_1', t: 'intro' },
      {
        l: 'Vladimir Komarov — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Vladimir_Komarov',
        t: 'core',
      },
    ],
  },

  {
    id: 'skylab-2',
    name: 'Skylab 2',
    agency: 'NASA',
    agency_full: 'National Aeronautics and Space Administration',
    color: NASA,
    crewed: true,
    year: 1973,
    status: 'FLOWN',
    departure_date: '1973-05-25',
    arrival_date: '1973-06-22',
    transit_days: 28,
    vehicle: 'Saturn IB (SA-206)',
    payload: '20121 kg launch mass; CSM-116 + 3-person crew',
    delta_v: '~9.4 km/s (LEO)',
    type: 'CREWED STATION CREW · FLOWN',
    first: 'First crewed Skylab visit — repaired the damaged workshop and saved the programme',
    description:
      'Conrad, Kerwin and Weitz — the first crew to inhabit the US Skylab space station. Launched 1973-05-25 13:00 UTC on Saturn IB (SA-206), 11 days after Skylab itself was damaged at launch (the micrometeoroid / sun shield ripped off, taking one solar wing with it and jamming the second). The crew executed a 28-day rescue: Weitz attempted (and failed) to free the jammed wing during a 38-minute stand-up EVA on day 1, then Conrad and Kerwin successfully cut the restraining strap on a 3.5-hour EVA on day 14, restoring power. Deployed a Marshall-designed parasol thermal shield through the scientific airlock to bring cabin temperatures back from 54°C to 24°C. Returned 1973-06-22 13:50 UTC; CSM-116 displayed at the National Air and Space Museum, Washington DC.',
    fleet_refs: [
      { id: 'saturn-ib', role: 'launcher' },
      { id: 'apollo-csm-block-ii', role: 'spacecraft' },
      { id: 'skylab', role: 'station' },
      { id: 'lc-39b', role: 'launch-site' },
    ],
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Saturn IB SA-206 from LC-39B 1973-05-25 13:00 UTC.',
        type: 'nominal',
      },
      {
        met: 0.33,
        label: 'DOCK',
        note: 'CSM docked to Skylab axial port after a soft-dock troubleshoot.',
        type: 'nominal',
      },
      {
        met: 14,
        label: 'EVA #2 — POWER RESTORED',
        note: 'Conrad + Kerwin freed the jammed solar wing during a 3.5h EVA.',
        type: 'nominal',
      },
      {
        met: 28.04,
        label: 'SPLASHDOWN',
        note: 'CSM-116 splashed down in Pacific 1973-06-22 13:50 UTC.',
        type: 'nominal',
      },
    ],
    links: [
      { l: 'Skylab 2 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Skylab_2', t: 'intro' },
      {
        l: 'Skylab 2 (NASA NSSDCA)',
        u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1973-032A',
        t: 'core',
      },
    ],
  },

  {
    id: 'skylab-3',
    name: 'Skylab 3',
    agency: 'NASA',
    agency_full: 'National Aeronautics and Space Administration',
    color: NASA,
    crewed: true,
    year: 1973,
    status: 'FLOWN',
    departure_date: '1973-07-28',
    arrival_date: '1973-09-25',
    transit_days: 59,
    vehicle: 'Saturn IB (SA-207)',
    payload: '19979 kg launch mass; CSM-117 + 3-person crew',
    delta_v: '~9.4 km/s (LEO)',
    type: 'CREWED STATION CREW · FLOWN',
    first: 'Second Skylab crew — 59 days, deployed twin-pole solar shield to replace parasol',
    description:
      'Bean, Garriott and Lousma — the second crew to live aboard Skylab, for 59 days 11 hours. Launched 1973-07-28 11:11 UTC on Saturn IB (SA-207). Within hours of docking the CSM service module suffered an attitude-control thruster leak — back-up CSM-119 was prepped at Cape Canaveral for a possible rescue mission, but the crew completed nominally. Garriott led 305 hours of solar observations using the Apollo Telescope Mount instruments. Three EVAs deployed a twin-pole sun shield over the original parasol, repaired the rate gyro package, and recovered film canisters from the ATM. Splashed down 1973-09-25 22:19 UTC; CSM-117 displayed at the Glenn Visitor Center, Cleveland.',
    fleet_refs: [
      { id: 'saturn-ib', role: 'launcher' },
      { id: 'apollo-csm-block-ii', role: 'spacecraft' },
      { id: 'skylab', role: 'station' },
      { id: 'lc-39b', role: 'launch-site' },
    ],
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Saturn IB SA-207 from LC-39B 1973-07-28 11:11 UTC.',
        type: 'nominal',
      },
      {
        met: 0.5,
        label: 'CSM THRUSTER LEAK',
        note: 'Service-module RCS quad leak; rescue CSM-119 prepared at Cape but not flown.',
        type: 'warning',
      },
      {
        met: 30,
        label: 'TWIN-POLE SHIELD EVA',
        note: 'Crew deployed twin-pole shield over original parasol.',
        type: 'nominal',
      },
      {
        met: 59.46,
        label: 'SPLASHDOWN',
        note: 'CSM-117 splashed down in Pacific 1973-09-25 22:19 UTC.',
        type: 'nominal',
      },
    ],
    links: [
      { l: 'Skylab 3 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Skylab_3', t: 'intro' },
      {
        l: 'Skylab 3 (NASA NSSDCA)',
        u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1973-050A',
        t: 'core',
      },
    ],
  },

  {
    id: 'skylab-4',
    name: 'Skylab 4',
    agency: 'NASA',
    agency_full: 'National Aeronautics and Space Administration',
    color: NASA,
    crewed: true,
    year: 1973,
    status: 'FLOWN',
    departure_date: '1973-11-16',
    arrival_date: '1974-02-08',
    transit_days: 84,
    vehicle: 'Saturn IB (SA-208)',
    payload: '20847 kg launch mass; CSM-118 + 3-person crew',
    delta_v: '~9.4 km/s (LEO)',
    type: 'CREWED STATION CREW · FLOWN',
    first:
      'Longest Skylab stay — 84 days, observed Comet Kohoutek, "Skylab strike" rest day dispute',
    description:
      "Carr, Gibson and Pogue — the final and longest Skylab crew, 84 days 1 hour, all-rookie. Launched 1973-11-16 14:01 UTC on Saturn IB (SA-208). Comprehensive Earth-resources and solar observation, including a full Comet Kohoutek campaign over December–January. The mission is best remembered for the unofficial 'Skylab strike' on day 45 when the crew turned off radios for a half-day after relentless ground-controller demands compressed every minute of waking time — the dispute led to permanent NASA reforms on crew time-line planning for long-duration missions. Splashed down 1974-02-08 15:17 UTC, the last US crewed water landing until SpaceX Crew Dragon in 2020. CSM-118 displayed at the National Museum of the US Air Force, Dayton OH.",
    fleet_refs: [
      { id: 'saturn-ib', role: 'launcher' },
      { id: 'apollo-csm-block-ii', role: 'spacecraft' },
      { id: 'skylab', role: 'station' },
      { id: 'lc-39b', role: 'launch-site' },
    ],
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Saturn IB SA-208 from LC-39B 1973-11-16 14:01 UTC.',
        type: 'nominal',
      },
      {
        met: 30,
        label: 'KOHOUTEK CAMPAIGN',
        note: 'Comprehensive ATM + window observations of Comet Kohoutek.',
        type: 'info',
      },
      {
        met: 45,
        label: 'TIMELINE RESET',
        note: 'Crew/ground dispute over timeline density led to permanent NASA reforms.',
        type: 'warning',
      },
      {
        met: 84.05,
        label: 'SPLASHDOWN',
        note: 'CSM-118 splashed down in Pacific 1974-02-08 15:17 UTC — last US crewed water landing until Crew Dragon.',
        type: 'nominal',
      },
    ],
    links: [
      { l: 'Skylab 4 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Skylab_4', t: 'intro' },
      {
        l: 'Skylab 4 (NASA NSSDCA)',
        u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1973-090A',
        t: 'core',
      },
    ],
  },

  {
    id: 'inspiration4',
    name: 'Inspiration4',
    agency: 'SpaceX',
    agency_full: 'Space Exploration Technologies Corp (commercial / private mission)',
    color: SPX,
    crewed: true,
    year: 2021,
    status: 'FLOWN',
    departure_date: '2021-09-15',
    arrival_date: '2021-09-18',
    transit_days: 3,
    vehicle: 'Falcon 9 Block 5 (B1062.3) + Crew Dragon C207 (Resilience)',
    payload: '~12000 kg LEO; 4 crew, no professional astronauts',
    delta_v: '~9.4 km/s (LEO; 585 km circular)',
    type: 'CREWED FREE-FLYER · FLOWN',
    first:
      "First all-civilian orbital spaceflight; raised $243M for St. Jude Children's Research Hospital",
    description:
      "Jared Isaacman, Sian Proctor, Hayley Arceneaux and Chris Sembroski — the first orbital flight crewed entirely by people who were not professional government astronauts. Launched 2021-09-15 00:02 UTC from LC-39A on Falcon 9 B1062 (third flight), atop Crew Dragon Resilience (C207, previously flown on Crew-1). Reached a 585 km circular orbit at 51.6° inclination — the highest crewed orbit since the Hubble servicing missions. No docking with any station; three days of free flight including the first onboard cupola (replacing the docking adapter). Splashed down off the Florida coast 2021-09-18 23:06 UTC. The mission raised over $243M for St. Jude Children's Research Hospital — Arceneaux is a former St. Jude patient and the first cancer survivor in orbit.",
    fleet_refs: [
      { id: 'falcon-9', role: 'launcher' },
      { id: 'crew-dragon', role: 'spacecraft' },
      { id: 'lc-39a', role: 'launch-site' },
    ],
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Falcon 9 B1062 from LC-39A 2021-09-15 00:02 UTC.',
        type: 'nominal',
      },
      {
        met: 0.05,
        label: 'ORBIT',
        note: '585 km circular, 51.6° inclination — highest crewed orbit since Hubble servicing.',
        type: 'nominal',
      },
      {
        met: 1,
        label: 'CUPOLA WINDOW',
        note: 'First viewing through the Crew Dragon cupola (replacing docking adapter).',
        type: 'info',
      },
      {
        met: 2.96,
        label: 'SPLASHDOWN',
        note: 'Resilience splashed down off Florida coast 2021-09-18 23:06 UTC.',
        type: 'nominal',
      },
    ],
    links: [
      {
        l: 'Inspiration4 — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Inspiration4',
        t: 'intro',
      },
      {
        l: 'Inspiration4 mission page (SpaceX)',
        u: 'https://www.spacex.com/launches/inspiration-4/',
        t: 'core',
      },
    ],
  },

  {
    id: 'polaris-dawn',
    name: 'Polaris Dawn',
    agency: 'SpaceX',
    agency_full: 'Space Exploration Technologies Corp (Polaris Program / commercial mission)',
    color: SPX,
    crewed: true,
    year: 2024,
    status: 'FLOWN',
    departure_date: '2024-09-10',
    arrival_date: '2024-09-15',
    transit_days: 5,
    vehicle: 'Falcon 9 Block 5 (B1083.4) + Crew Dragon C207 (Resilience)',
    payload: '~12500 kg LEO; 4 crew, first commercial EVA suits',
    delta_v: '~10.5 km/s (1408 km initial apogee, then 730 km circular)',
    type: 'CREWED FREE-FLYER · FLOWN',
    first: 'First commercial spacewalk; highest Earth orbit by humans since Apollo 17 (1408 km)',
    description:
      "Jared Isaacman (commander), Scott 'Kidd' Poteet (pilot), Sarah Gillis and Anna Menon (SpaceX engineers / mission specialists). Launched 2024-09-10 09:23 UTC from LC-39A on Falcon 9 B1083, atop Crew Dragon Resilience (C207, third flight). Day 1 raised apogee to 1408 km — the highest orbit ever flown by humans excluding Apollo lunar missions; the apogee then lowered to 730 km circular for the EVA. Day 3 saw the first commercial EVA: Isaacman and Gillis stepped through the open hatch in new SpaceX EVA suits (no airlock — full cabin vacuum exposure for all 4 crew), each spending ~8 minutes in vacuum testing mobility. Tested Starlink laser inter-satellite links from orbit. Splashed down off Florida 2024-09-15 07:36 UTC.",
    fleet_refs: [
      { id: 'falcon-9', role: 'launcher' },
      { id: 'crew-dragon', role: 'spacecraft' },
      { id: 'lc-39a', role: 'launch-site' },
    ],
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Falcon 9 B1083 from LC-39A 2024-09-10 09:23 UTC.',
        type: 'nominal',
      },
      {
        met: 0.5,
        label: 'APOGEE BOOST',
        note: 'Raised orbit to 1408 km apogee — highest crewed orbit since Apollo 17.',
        type: 'info',
      },
      {
        met: 3,
        label: 'COMMERCIAL EVA',
        note: 'Isaacman + Gillis exited through cabin hatch into vacuum — first commercial spacewalk.',
        type: 'nominal',
      },
      {
        met: 4.93,
        label: 'SPLASHDOWN',
        note: 'Resilience splashed down off Florida 2024-09-15 07:36 UTC.',
        type: 'nominal',
      },
    ],
    links: [
      {
        l: 'Polaris Dawn — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Polaris_Dawn',
        t: 'intro',
      },
      { l: 'Polaris Program', u: 'https://polarisprogram.com/dawn/', t: 'core' },
    ],
  },
];

function buildBase(m) {
  return {
    id: m.id,
    agency: m.agency,
    agency_full: m.agency_full,
    sector: m.agency === 'SpaceX' ? 'private' : 'gov',
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
        sector: m.agency === 'SpaceX' ? 'private' : 'gov',
        color: m.color,
        crewed: m.crewed,
      });
      existing.add(m.id);
    }
  }
  await writeFile(indexPath, JSON.stringify(idx, null, 2) + '\n');
  console.log('\n✓ missions/index.json updated');

  // Reciprocal linked_missions on fleet entries.
  const RECIPROCAL = {
    'launcher/vostok-k': ['vostok-2', 'vostok-3', 'vostok-4', 'vostok-5', 'vostok-6'],
    'crewed-spacecraft/vostok': ['vostok-2', 'vostok-3', 'vostok-4', 'vostok-5', 'vostok-6'],
    'launcher/voskhod-11a57': ['voskhod-1'],
    'crewed-spacecraft/voskhod': ['voskhod-1'],
    'launch-site/gagarins-start': [
      'vostok-2',
      'vostok-3',
      'vostok-4',
      'vostok-5',
      'vostok-6',
      'voskhod-1',
    ],
    'launcher/long-march-2f': ['shenzhou-1'],
    'crewed-spacecraft/shenzhou': ['shenzhou-1'],
    'launch-site/jiuquan-slc-43': ['shenzhou-1'],
    'launcher/saturn-ib': ['skylab-2', 'skylab-3', 'skylab-4'],
    'crewed-spacecraft/apollo-csm-block-ii': ['skylab-2', 'skylab-3', 'skylab-4'],
    'station/skylab': ['skylab-2', 'skylab-3', 'skylab-4'],
    'launch-site/lc-39b': ['skylab-2', 'skylab-3', 'skylab-4'],
    'launcher/falcon-9': ['inspiration4', 'polaris-dawn'],
    'crewed-spacecraft/crew-dragon': ['inspiration4', 'polaris-dawn'],
    'launch-site/lc-39a': ['inspiration4', 'polaris-dawn'],
  };
  for (const [relPath, missionIds] of Object.entries(RECIPROCAL)) {
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
