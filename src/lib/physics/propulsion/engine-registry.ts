/**
 * Engine registry — the curated "legendary / workhorse" rocket engines surfaced
 * as first-class /fleet items (category `engine`, PRD-032). The engine is the
 * workhorse of every launcher and some are legends in their own right; this file
 * is the single source of truth for the ~22 we present.
 *
 * It carries (a) the structural + spec data used to GENERATE the fleet entries
 * (scripts/build-engine-fleet.ts → static/data/fleet/engine/*.json + index) and
 * (b) `designations`, the exact engine-name strings as they appear in
 * `launcher-engines.ts`, which power the bidirectional cross-reference:
 *   - launchersForEngine(id) → every vehicle + stage that flies this engine
 *   - enginesForLauncher(id) → every registry engine a vehicle carries
 * so the "Flies on …" graph is DERIVED from launcher-engines.ts, never
 * hand-maintained (it can't drift from the 3D engine counts).
 *
 * Spec figures are public-source nominal values (thrust in kN, Isp in s, mass in
 * kg); vacuum vs sea-level is noted per field. Fact-checked by the science-editor
 * gate before the editorial overlays ship.
 */
import { LAUNCHER_ENGINES } from './launcher-engines';
import type { FleetEra, FleetEpoch, FleetStatus, FleetLink } from '$types/fleet';

/** Thermodynamic power cycle — the defining engineering choice of an engine. */
export type EngineCycle =
  | 'gas-generator'
  | 'staged-combustion'
  | 'staged-combustion (ox-rich)'
  | 'staged-combustion (full-flow)'
  | 'expander'
  | 'expander-bleed'
  | 'pressure-fed';

export interface EngineMeta {
  id: string;
  name: string;
  agency: string;
  country: string;
  manufacturer: string;
  first_flight: string; // ISO date or YYYY
  last_flight?: string;
  status: FleetStatus;
  era: FleetEra;
  epoch: FleetEpoch;
  /** One-line "why it's legendary" — structural, shown as best_known_for. */
  best_known_for: string;
  cycle: EngineCycle;
  propellant: string; // e.g. "LOX / RP-1"
  /** Thrust in kilonewtons, per engine. `thrustNote` says sea-level vs vacuum. */
  thrust_kn: number;
  thrustNote: 'sea level' | 'vacuum';
  isp_vac_s?: number;
  isp_sl_s?: number;
  mass_kg?: number;
  /** Exact engine-name strings as they appear in launcher-engines.ts stages. */
  designations: string[];
  /** /science article slugs (tab/section) this engine illustrates. */
  science?: string[];
  links: FleetLink[];
  credit: string;
}

// ── The curated set (~22), spanning every major agency ──────────────────────
export const ENGINE_REGISTRY: EngineMeta[] = [
  {
    id: 'f-1',
    name: 'F-1',
    agency: 'NASA',
    country: 'USA',
    manufacturer: 'Rocketdyne',
    first_flight: '1967-11-09',
    last_flight: '1973-05-14',
    status: 'RETIRED',
    era: '1957-1969',
    epoch: 'lunar-era',
    best_known_for: 'Most powerful single-chamber liquid engine ever flown — five lifted Saturn V',
    cycle: 'gas-generator',
    propellant: 'LOX / RP-1',
    thrust_kn: 6770,
    thrustNote: 'sea level',
    isp_vac_s: 304,
    isp_sl_s: 263,
    mass_kg: 8400,
    designations: ['F-1'],
    science: ['propulsion/tsiolkovsky', 'propulsion/thrust-and-twr'],
    links: [
      { l: 'F-1 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Rocketdyne_F-1', t: 'intro' },
      {
        l: 'Saturn V Flight Manual (NASA)',
        u: 'https://ntrs.nasa.gov/citations/19750063889',
        t: 'deep',
      },
    ],
    credit: 'Engine registry (PRD-032). Public-source nominal specs; NASA imagery.',
  },
  {
    id: 'j-2',
    name: 'J-2',
    agency: 'NASA',
    country: 'USA',
    manufacturer: 'Rocketdyne',
    first_flight: '1966-02-26',
    last_flight: '1975-07-15',
    status: 'RETIRED',
    era: '1957-1969',
    epoch: 'lunar-era',
    best_known_for: 'Restartable hydrogen upper-stage engine that sent Apollo translunar',
    cycle: 'gas-generator',
    propellant: 'LOX / LH2',
    thrust_kn: 1033,
    thrustNote: 'vacuum',
    isp_vac_s: 421,
    mass_kg: 1788,
    designations: ['J-2'],
    science: ['propulsion/specific-impulse'],
    links: [
      { l: 'J-2 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Rocketdyne_J-2', t: 'intro' },
    ],
    credit: 'Engine registry (PRD-032). Public-source nominal specs; NASA imagery.',
  },
  {
    id: 'h-1',
    name: 'H-1',
    agency: 'NASA',
    country: 'USA',
    manufacturer: 'Rocketdyne',
    first_flight: '1961-10-27',
    last_flight: '1975-07-15',
    status: 'RETIRED',
    era: '1957-1969',
    epoch: 'space-race',
    best_known_for: 'Eight-cluster Saturn I/IB booster engine — the F-1 rehearsal',
    cycle: 'gas-generator',
    propellant: 'LOX / RP-1',
    thrust_kn: 900,
    thrustNote: 'sea level',
    isp_sl_s: 255,
    mass_kg: 989,
    designations: ['H-1'],
    links: [
      { l: 'H-1 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Rocketdyne_H-1', t: 'intro' },
    ],
    credit: 'Engine registry (PRD-032). Public-source nominal specs; NASA imagery.',
  },
  {
    id: 'rs-25',
    name: 'RS-25 (SSME)',
    agency: 'NASA',
    country: 'USA',
    manufacturer: 'Aerojet Rocketdyne',
    first_flight: '1981-04-12',
    status: 'ACTIVE',
    era: '1981-2011',
    epoch: 'shuttle-and-mir',
    best_known_for: 'Reusable staged-combustion engine — 135 Shuttle flights, now flies on SLS',
    cycle: 'staged-combustion',
    propellant: 'LOX / LH2',
    thrust_kn: 2279,
    thrustNote: 'vacuum',
    isp_vac_s: 452,
    isp_sl_s: 366,
    mass_kg: 3527,
    designations: ['RS-25'],
    science: ['propulsion/engine-types', 'propulsion/specific-impulse'],
    links: [{ l: 'RS-25 — Wikipedia', u: 'https://en.wikipedia.org/wiki/RS-25', t: 'intro' }],
    credit: 'Engine registry (PRD-032). Public-source nominal specs; NASA imagery.',
  },
  {
    id: 'rl10',
    name: 'RL10',
    agency: 'NASA',
    country: 'USA',
    manufacturer: 'Aerojet Rocketdyne',
    first_flight: '1963-11-27',
    status: 'ACTIVE',
    era: '1957-1969',
    epoch: 'space-race',
    best_known_for: 'Longest-serving engine in spaceflight — the first hydrogen upper stage',
    cycle: 'expander',
    propellant: 'LOX / LH2',
    thrust_kn: 110,
    thrustNote: 'vacuum',
    isp_vac_s: 450,
    mass_kg: 301,
    designations: ['RL10C-1'],
    science: ['propulsion/engine-types'],
    links: [{ l: 'RL10 — Wikipedia', u: 'https://en.wikipedia.org/wiki/RL10', t: 'intro' }],
    credit: 'Engine registry (PRD-032). Public-source nominal specs; NASA imagery.',
  },
  {
    id: 'rocketdyne-a7',
    name: 'Rocketdyne A-7',
    agency: 'NASA',
    country: 'USA',
    manufacturer: 'Rocketdyne',
    first_flight: '1961-05-05',
    last_flight: '1963-05-15',
    status: 'RETIRED',
    era: '1957-1969',
    epoch: 'space-race',
    best_known_for: 'The engine that launched the first American — Freedom 7',
    cycle: 'gas-generator',
    propellant: 'LOX / ethyl alcohol',
    thrust_kn: 350,
    thrustNote: 'sea level',
    isp_sl_s: 235,
    designations: ['Rocketdyne A-7'],
    links: [
      {
        l: 'Redstone (rocket) — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/PGM-11_Redstone',
        t: 'intro',
      },
    ],
    credit: 'Engine registry (PRD-032). Public-source nominal specs; NASA imagery.',
  },
  {
    id: 'merlin-1d',
    name: 'Merlin 1D',
    agency: 'SpaceX',
    country: 'USA',
    manufacturer: 'SpaceX',
    first_flight: '2013-09-29',
    status: 'ACTIVE',
    era: '2011-now',
    epoch: 'commercial-era',
    best_known_for:
      'The reusable workhorse — nine lift Falcon 9, flown and re-flown dozens of times',
    cycle: 'gas-generator',
    propellant: 'LOX / RP-1',
    thrust_kn: 845,
    thrustNote: 'sea level',
    isp_vac_s: 311,
    isp_sl_s: 282,
    mass_kg: 470,
    designations: ['Merlin 1D', 'Merlin 1D Vacuum'],
    science: ['propulsion/thrust-and-twr'],
    links: [
      { l: 'Merlin — Wikipedia', u: 'https://en.wikipedia.org/wiki/SpaceX_Merlin', t: 'intro' },
      { l: 'Falcon 9 (SpaceX)', u: 'https://www.spacex.com/vehicles/falcon-9/', t: 'core' },
    ],
    credit: 'Engine registry (PRD-032). Public-source nominal specs.',
  },
  {
    id: 'raptor',
    name: 'Raptor',
    agency: 'SpaceX',
    country: 'USA',
    manufacturer: 'SpaceX',
    first_flight: '2023-04-20',
    status: 'ACTIVE',
    era: '2011-now',
    epoch: 'mars-era',
    best_known_for: 'First full-flow staged-combustion engine to fly — 33 lift Super Heavy',
    cycle: 'staged-combustion (full-flow)',
    propellant: 'LOX / liquid methane',
    thrust_kn: 2258,
    thrustNote: 'sea level',
    isp_vac_s: 350,
    isp_sl_s: 327,
    mass_kg: 1600,
    designations: ['Raptor 2', 'Raptor / RVac'],
    science: ['propulsion/engine-types', 'propulsion/fuels-and-oxidizers'],
    links: [
      { l: 'Raptor — Wikipedia', u: 'https://en.wikipedia.org/wiki/SpaceX_Raptor', t: 'intro' },
      { l: 'Starship (SpaceX)', u: 'https://www.spacex.com/vehicles/starship/', t: 'core' },
    ],
    credit: 'Engine registry (PRD-032). Public-source nominal specs.',
  },
  {
    id: 'rd-107-108',
    name: 'RD-107 / RD-108',
    agency: 'Roscosmos',
    country: 'USSR / Russia',
    manufacturer: 'NPO Energomash',
    first_flight: '1957-08-21',
    status: 'ACTIVE',
    era: '1957-1969',
    epoch: 'first-steps',
    best_known_for: 'The R-7 engines — still flying humans on Soyuz after 65+ years',
    cycle: 'gas-generator',
    propellant: 'LOX / RP-1',
    thrust_kn: 839,
    thrustNote: 'sea level',
    isp_sl_s: 256,
    designations: ['RD-107', 'RD-108', 'RD-107A', 'RD-108A'],
    science: ['propulsion/thrust-and-twr'],
    links: [{ l: 'RD-107 — Wikipedia', u: 'https://en.wikipedia.org/wiki/RD-107', t: 'intro' }],
    credit: 'Engine registry (PRD-032). Public-source nominal specs.',
  },
  {
    id: 'rd-180',
    name: 'RD-180',
    agency: 'Roscosmos',
    country: 'Russia',
    manufacturer: 'NPO Energomash',
    first_flight: '2000-05-24',
    status: 'RETIRED',
    era: '1981-2011',
    epoch: 'iss-assembly',
    best_known_for: 'Oxygen-rich staged combustion the US could not match — flew on Atlas V',
    cycle: 'staged-combustion (ox-rich)',
    propellant: 'LOX / RP-1',
    thrust_kn: 3830,
    thrustNote: 'sea level',
    isp_vac_s: 338,
    isp_sl_s: 311,
    mass_kg: 5480,
    designations: ['RD-180'],
    science: ['propulsion/engine-types'],
    links: [{ l: 'RD-180 — Wikipedia', u: 'https://en.wikipedia.org/wiki/RD-180', t: 'intro' }],
    credit: 'Engine registry (PRD-032). Public-source nominal specs.',
  },
  {
    id: 'rd-253',
    name: 'RD-253',
    agency: 'Roscosmos',
    country: 'USSR / Russia',
    manufacturer: 'NPO Energomash',
    first_flight: '1965-07-16',
    status: 'RETIRED',
    era: '1957-1969',
    epoch: 'space-race',
    best_known_for: "Proton's hypergolic workhorse — six lifted every Proton first stage",
    cycle: 'staged-combustion (ox-rich)',
    propellant: 'N2O4 / UDMH',
    thrust_kn: 1470,
    thrustNote: 'sea level',
    isp_sl_s: 285,
    mass_kg: 1080,
    designations: ['RD-253'],
    links: [{ l: 'RD-253 — Wikipedia', u: 'https://en.wikipedia.org/wiki/RD-253', t: 'intro' }],
    credit: 'Engine registry (PRD-032). Public-source nominal specs.',
  },
  {
    id: 'vulcain-2',
    name: 'Vulcain 2',
    agency: 'ESA',
    country: 'Europe',
    manufacturer: 'Snecma (Safran)',
    first_flight: '2002-12-11',
    last_flight: '2023-07-05',
    status: 'RETIRED',
    era: '1981-2011',
    epoch: 'iss-assembly',
    best_known_for: "Europe's hydrogen core engine — powered every Ariane 5",
    cycle: 'gas-generator',
    propellant: 'LOX / LH2',
    thrust_kn: 1359,
    thrustNote: 'vacuum',
    isp_vac_s: 429,
    mass_kg: 2100,
    designations: ['Vulcain 2'],
    links: [{ l: 'Vulcain — Wikipedia', u: 'https://en.wikipedia.org/wiki/Vulcain', t: 'intro' }],
    credit: 'Engine registry (PRD-032). Public-source nominal specs; ESA imagery.',
  },
  {
    id: 'hm7b',
    name: 'HM7B',
    agency: 'ESA',
    country: 'Europe',
    manufacturer: 'Snecma (Safran)',
    first_flight: '1986-05-31',
    last_flight: '2023-07-05',
    status: 'RETIRED',
    era: '1981-2011',
    epoch: 'shuttle-and-mir',
    best_known_for: "Europe's cryogenic upper-stage engine — Ariane's translunar workhorse",
    cycle: 'gas-generator',
    propellant: 'LOX / LH2',
    thrust_kn: 64.7,
    thrustNote: 'vacuum',
    isp_vac_s: 446,
    mass_kg: 165,
    designations: ['HM7B', 'HM7'],
    links: [{ l: 'HM7B — Wikipedia', u: 'https://en.wikipedia.org/wiki/HM7B', t: 'intro' }],
    credit: 'Engine registry (PRD-032). Public-source nominal specs; ESA imagery.',
  },
  {
    id: 'viking',
    name: 'Viking',
    agency: 'CNES / ESA',
    country: 'France',
    manufacturer: 'SEP (Safran)',
    first_flight: '1979-12-24',
    last_flight: '2003-02-15',
    status: 'RETIRED',
    era: '1969-1981',
    epoch: 'first-stations',
    best_known_for: 'The French engine later licensed to India as Vikas — powered Ariane 1–4',
    cycle: 'gas-generator',
    propellant: 'N2O4 / UH25',
    thrust_kn: 678,
    thrustNote: 'sea level',
    isp_sl_s: 248,
    designations: ['Viking 5', 'Viking 4'],
    links: [
      {
        l: 'Viking (rocket engine) — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Viking_(rocket_engine)',
        t: 'intro',
      },
    ],
    credit: 'Engine registry (PRD-032). Public-source nominal specs; ESA imagery.',
  },
  {
    id: 'yf-100',
    name: 'YF-100',
    agency: 'CNSA',
    country: 'China',
    manufacturer: 'AALPT (Xi’an)',
    first_flight: '2015-09-20',
    status: 'ACTIVE',
    era: '2011-now',
    epoch: 'commercial-era',
    best_known_for: "China's modern staged-combustion kerolox engine — Long March 5/6/7",
    cycle: 'staged-combustion (ox-rich)',
    propellant: 'LOX / RP-1',
    thrust_kn: 1200,
    thrustNote: 'sea level',
    isp_sl_s: 300,
    designations: ['YF-100'],
    science: ['propulsion/engine-types'],
    links: [{ l: 'YF-100 — Wikipedia', u: 'https://en.wikipedia.org/wiki/YF-100', t: 'intro' }],
    credit: 'Engine registry (PRD-032). Public-source nominal specs.',
  },
  {
    id: 'yf-77',
    name: 'YF-77',
    agency: 'CNSA',
    country: 'China',
    manufacturer: 'AALPT',
    first_flight: '2016-11-03',
    status: 'ACTIVE',
    era: '2011-now',
    epoch: 'commercial-era',
    best_known_for: "China's first large hydrogen engine — the Long March 5 core",
    cycle: 'gas-generator',
    propellant: 'LOX / LH2',
    thrust_kn: 700,
    thrustNote: 'vacuum',
    isp_vac_s: 428,
    designations: ['YF-77'],
    links: [{ l: 'YF-77 — Wikipedia', u: 'https://en.wikipedia.org/wiki/YF-77', t: 'intro' }],
    credit: 'Engine registry (PRD-032). Public-source nominal specs.',
  },
  {
    id: 'vikas',
    name: 'Vikas',
    agency: 'ISRO',
    country: 'India',
    manufacturer: 'ISRO (LPSC)',
    first_flight: '1993-09-20',
    status: 'ACTIVE',
    era: '1981-2011',
    epoch: 'iss-assembly',
    best_known_for: "India's workhorse — powers PSLV, GSLV and LVM3 to this day",
    cycle: 'gas-generator',
    propellant: 'N2O4 / UDMH',
    thrust_kn: 725,
    thrustNote: 'sea level',
    isp_sl_s: 262,
    designations: ['Vikas'],
    links: [
      {
        l: 'Vikas (rocket engine) — Wikipedia',
        u: 'https://en.wikipedia.org/wiki/Vikas_(rocket_engine)',
        t: 'intro',
      },
    ],
    credit: 'Engine registry (PRD-032). Public-source nominal specs; ISRO imagery.',
  },
  {
    id: 'ce-20',
    name: 'CE-20',
    agency: 'ISRO',
    country: 'India',
    manufacturer: 'ISRO (LPSC)',
    first_flight: '2017-06-05',
    status: 'ACTIVE',
    era: '2011-now',
    epoch: 'commercial-era',
    best_known_for: "India's first home-grown cryogenic engine — the LVM3 upper stage",
    cycle: 'gas-generator',
    propellant: 'LOX / LH2',
    thrust_kn: 200,
    thrustNote: 'vacuum',
    isp_vac_s: 443,
    designations: ['CE-20'],
    links: [{ l: 'CE-20 — Wikipedia', u: 'https://en.wikipedia.org/wiki/CE-20', t: 'intro' }],
    credit: 'Engine registry (PRD-032). Public-source nominal specs; ISRO imagery.',
  },
  {
    id: 'le-7a',
    name: 'LE-7A',
    agency: 'JAXA',
    country: 'Japan',
    manufacturer: 'Mitsubishi Heavy Industries',
    first_flight: '2001-08-29',
    last_flight: '2024-09-14',
    status: 'RETIRED',
    era: '1981-2011',
    epoch: 'iss-assembly',
    best_known_for: "Japan's staged-combustion hydrogen core — powered H-IIA/H-IIB",
    cycle: 'staged-combustion',
    propellant: 'LOX / LH2',
    thrust_kn: 1098,
    thrustNote: 'vacuum',
    isp_vac_s: 440,
    mass_kg: 1800,
    designations: ['LE-7A'],
    science: ['propulsion/engine-types'],
    links: [{ l: 'LE-7 — Wikipedia', u: 'https://en.wikipedia.org/wiki/LE-7', t: 'intro' }],
    credit: 'Engine registry (PRD-032). Public-source nominal specs; JAXA imagery.',
  },
  {
    id: 'le-9',
    name: 'LE-9',
    agency: 'JAXA',
    country: 'Japan',
    manufacturer: 'Mitsubishi Heavy Industries',
    first_flight: '2023-03-07',
    status: 'ACTIVE',
    era: '2011-now',
    epoch: 'commercial-era',
    best_known_for: 'The largest expander-bleed engine ever flown — the H3 core',
    cycle: 'expander-bleed',
    propellant: 'LOX / LH2',
    thrust_kn: 1471,
    thrustNote: 'vacuum',
    isp_vac_s: 425,
    designations: ['LE-9'],
    science: ['propulsion/engine-types'],
    links: [{ l: 'LE-9 — Wikipedia', u: 'https://en.wikipedia.org/wiki/LE-9', t: 'intro' }],
    credit: 'Engine registry (PRD-032). Public-source nominal specs; JAXA imagery.',
  },
  {
    id: 'le-5b',
    name: 'LE-5B',
    agency: 'JAXA',
    country: 'Japan',
    manufacturer: 'Mitsubishi Heavy Industries',
    first_flight: '2001-08-29',
    status: 'ACTIVE',
    era: '1981-2011',
    epoch: 'iss-assembly',
    best_known_for: "Japan's restartable cryogenic upper stage — H-IIA through H3",
    cycle: 'expander-bleed',
    propellant: 'LOX / LH2',
    thrust_kn: 137,
    thrustNote: 'vacuum',
    isp_vac_s: 448,
    designations: ['LE-5B', 'LE-5B-3'],
    science: ['propulsion/engine-types'],
    links: [{ l: 'LE-5 — Wikipedia', u: 'https://en.wikipedia.org/wiki/LE-5', t: 'intro' }],
    credit: 'Engine registry (PRD-032). Public-source nominal specs; JAXA imagery.',
  },
  {
    id: 'lr87',
    name: 'LR87',
    agency: 'NASA',
    country: 'USA',
    manufacturer: 'Aerojet',
    first_flight: '1959-02-06',
    last_flight: '2005-10-19',
    status: 'RETIRED',
    era: '1957-1969',
    epoch: 'space-race',
    best_known_for: 'The twin-chamber first stage that launched Gemini crews on Titan II',
    cycle: 'gas-generator',
    propellant: 'N2O4 / Aerozine-50',
    thrust_kn: 1900,
    thrustNote: 'sea level',
    isp_sl_s: 258,
    designations: ['LR87-AJ-7'],
    links: [{ l: 'LR87 — Wikipedia', u: 'https://en.wikipedia.org/wiki/LR87', t: 'intro' }],
    credit: 'Engine registry (PRD-032). Public-source nominal specs; NASA imagery.',
  },
];

export const ENGINE_IDS: string[] = ENGINE_REGISTRY.map((e) => e.id);

const BY_ID: Record<string, EngineMeta> = Object.fromEntries(ENGINE_REGISTRY.map((e) => [e.id, e]));

export function getEngineMeta(id: string): EngineMeta | undefined {
  return BY_ID[id];
}

// ── Bidirectional cross-reference, DERIVED from launcher-engines.ts ──────────

export interface EngineOnLauncher {
  /** launcher-engines.ts key (also the /fleet launcher id where one exists). */
  launcherId: string;
  /** Display name from the launcher engine spec. */
  launcherName: string;
  /** Stage labels this engine powers on the vehicle. */
  stages: string[];
}

/** Every vehicle + stage that flies the given registry engine. */
export function launchersForEngine(engineId: string): EngineOnLauncher[] {
  const meta = BY_ID[engineId];
  if (!meta) return [];
  const wanted = new Set(meta.designations);
  const out: EngineOnLauncher[] = [];
  for (const [launcherId, spec] of Object.entries(LAUNCHER_ENGINES)) {
    const stages = spec.stages.filter((s) => wanted.has(s.engine)).map((s) => s.stage);
    if (stages.length) out.push({ launcherId, launcherName: spec.name, stages });
  }
  return out;
}

/** Every registry engine carried by the given launcher (launcher-engines.ts key). */
export function enginesForLauncher(launcherId: string): EngineMeta[] {
  const spec = LAUNCHER_ENGINES[launcherId];
  if (!spec) return [];
  const flown = new Set(spec.stages.map((s) => s.engine));
  return ENGINE_REGISTRY.filter((e) => e.designations.some((d) => flown.has(d)));
}

/**
 * The /science card that explains an engine's power cycle (PRD-032 Phase 2).
 * Every engine deep-links its cycle from `specs.cycle` — one source of truth,
 * so the panel and the cross-ref test agree. `pressure-fed` has no card yet
 * (no curated engine uses it); a future one must add both the card and a case.
 */
export function scienceSlugForCycle(cycle: EngineCycle): string | null {
  if (cycle.startsWith('staged-combustion')) return 'propulsion/staged-combustion';
  if (cycle.startsWith('expander')) return 'propulsion/expander-cycle';
  if (cycle === 'gas-generator') return 'propulsion/gas-generator';
  return null;
}
