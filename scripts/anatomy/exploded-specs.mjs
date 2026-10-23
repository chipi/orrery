/**
 * Stage + engine specs for launchers that have an exploded cutaway but are not
 * flown in /fly (so they are not in src/lib/physics/propulsion/launcher-engines.ts).
 * Same shape as LAUNCHER_ENGINES; read by scripts/essays/build-cutaway-sketches.mjs
 * for the structural reference sketch, and quoted in the generation prompt
 * (scripts/anatomy/prompts.json).
 *
 * `manual` marks vehicles the tandem-stack sketch draws wrong (side-mount, Korolev
 * cross, clustered first stage, conical stages, parallel cores, bare capsule). Per
 * docs/guides/launcher-cutaway-style.md §5 they are generated from prose only, no sketch.
 */
const S = (stage, engine, engineCount, arrangement, extra = {}) => ({
  stage,
  engine,
  engineCount,
  nozzlesPerEngine: 1,
  mainNozzles: engineCount,
  arrangement,
  ...extra,
});

export const EXPLODED_SPECS = {
  antares: {
    name: 'Antares 230+',
    agency: 'Northrop Grumman',
    propellant: 'LOX / RP-1 first stage, solid second stage',
    sources: ['https://en.wikipedia.org/wiki/Antares_(rocket)'],
    stages: [
      S('Stage 1', 'RD-181', 2, 'pair', { prop: 'LOX / RP-1' }),
      S('Stage 2 (Castor 30XL)', 'Castor 30XL solid motor', 1, 'single'),
    ],
  },
  'ariane-6': {
    name: 'Ariane 6 (A62)',
    agency: 'ESA / ArianeGroup',
    propellant: 'LOX / LH2 core and upper stage, solid boosters',
    sources: ['https://en.wikipedia.org/wiki/Ariane_6'],
    stages: [
      S('P120C solid boosters ×2', 'P120C solid motor', 2, 'per-booster', { boosterCount: 2 }),
      S('Core (LLPM)', 'Vulcain 2.1', 1, 'single', { prop: 'LOX / LH2' }),
      S('Upper (ULPM)', 'Vinci', 1, 'single', { prop: 'LOX / LH2' }),
    ],
  },
  'atlas-slv-3d': {
    name: 'Atlas SLV-3D Centaur',
    agency: 'NASA / General Dynamics',
    propellant: 'LOX / RP-1 Atlas, LOX / LH2 Centaur',
    manual:
      'stage-and-a-half Atlas: a jettisonable booster skirt with 2 LR89 booster engines around 1 central LR105 sustainer plus 2 small vernier engines, all sharing one balloon tank; Centaur D upper stage with 2 RL10 engines; payload under a fairing',
    sources: ['https://en.wikipedia.org/wiki/Atlas-Centaur'],
    stages: [
      S('Atlas booster section', 'LR89', 2, 'pair'),
      S('Atlas sustainer', 'LR105', 1, 'single', { vernierNozzles: 2 }),
      S('Centaur D', 'RL10', 2, 'pair'),
    ],
  },
  'delta-ii': {
    name: 'Delta II 7925',
    agency: 'NASA / McDonnell Douglas',
    propellant: 'LOX / RP-1 first stage, hypergolic second stage, solid strap-ons',
    sources: ['https://en.wikipedia.org/wiki/Delta_II'],
    stages: [
      S('GEM-40 strap-ons ×9', 'GEM-40 solid motor', 9, 'per-booster', { boosterCount: 9 }),
      S('Stage 1 (Thor/Delta XLT)', 'RS-27A', 1, 'single', {
        vernierNozzles: 2,
        prop: 'LOX / RP-1',
      }),
      S('Stage 2', 'AJ10-118K', 1, 'single', { prop: 'N2O4 / Aerozine 50' }),
      S('Stage 3 (PAM-D)', 'Star 48B solid motor', 1, 'single'),
    ],
  },
  energia: {
    name: 'Energia',
    agency: 'NPO Energia (Soviet)',
    propellant: 'LOX / LH2 core, LOX / RP-1 boosters',
    manual:
      'side-mount: a central Blok Ts core stage with 4 RD-0120 engines, 4 strap-on Blok A boosters around it (each with one four-chamber RD-170), and the payload (the Buran orbiter) mounted on the SIDE of the core, not on top',
    sources: ['https://en.wikipedia.org/wiki/Energia'],
    stages: [
      S('Blok A strap-ons ×4', 'RD-170 (4 chambers)', 4, 'per-booster', { boosterCount: 4 }),
      S('Core (Blok Ts)', 'RD-0120', 4, 'quad'),
    ],
  },
  'falcon-heavy': {
    name: 'Falcon Heavy',
    agency: 'SpaceX',
    propellant: 'LOX / RP-1',
    manual:
      'three identical Falcon 9-derived cores side by side (a center core flanked by two side boosters with nose cones), each with 9 Merlin 1D engines in an octaweb (27 in total), and a single second stage with 1 Merlin Vacuum engine plus the fairing on top of the center core',
    sources: ['https://en.wikipedia.org/wiki/Falcon_Heavy'],
    stages: [
      S('Side boosters ×2', 'Merlin 1D', 18, 'per-booster', { boosterCount: 2 }),
      S('Center core', 'Merlin 1D', 9, 'octaweb-9'),
      S('Stage 2', 'Merlin 1D Vacuum', 1, 'single'),
    ],
  },
  'long-march-7': {
    name: 'Long March 7',
    agency: 'CASC',
    propellant: 'LOX / RP-1',
    sources: ['https://en.wikipedia.org/wiki/Long_March_7'],
    stages: [
      S('Boosters ×4', 'YF-100', 4, 'per-booster', { boosterCount: 4, prop: 'LOX / RP-1' }),
      S('Core stage', 'YF-100', 2, 'pair', { prop: 'LOX / RP-1' }),
      S('Stage 2', 'YF-115', 4, 'quad', { prop: 'LOX / RP-1' }),
    ],
  },
  n1: {
    name: 'N1',
    agency: 'OKB-1 (Soviet)',
    propellant: 'LOX / RP-1',
    manual:
      'a tall CONICAL stack (wide at the base, tapering upward, no cylindrical stages) with SPHERICAL propellant tanks inside each block: Blok A with 30 NK-15 engines in two rings (24 outer + 6 inner), Blok B with 8 NK-15V, Blok V with 4 NK-21, then the L3 lunar complex (Blok G with 1 NK-19, Blok D with 1 RD-58, the LOK orbiter and LK lander) under a shroud with an escape tower',
    sources: ['https://en.wikipedia.org/wiki/N1_(rocket)'],
    stages: [
      S('Blok A', 'NK-15', 30, 'ring'),
      S('Blok B', 'NK-15V', 8, 'ring'),
      S('Blok V', 'NK-21', 4, 'quad'),
      S('Blok G', 'NK-19', 1, 'single'),
      S('Blok D', 'RD-58', 1, 'single'),
    ],
  },
  'new-glenn': {
    name: 'New Glenn',
    agency: 'Blue Origin',
    propellant: 'LOX / LNG first stage, LOX / LH2 second stage',
    sources: ['https://en.wikipedia.org/wiki/New_Glenn'],
    stages: [
      S('Stage 1 (GS1)', 'BE-4', 7, 'ring', { prop: 'LOX / LNG' }),
      S('Stage 2 (GS2)', 'BE-3U', 2, 'pair', { prop: 'LOX / LH2' }),
    ],
  },
  'proton-m': {
    name: 'Proton-M / Briz-M',
    agency: 'Khrunichev',
    propellant: 'N2O4 / UDMH',
    manual:
      'clustered first stage: one central oxidizer tank surrounded by 6 outboard fuel tanks, each outboard tank carrying one RD-275M engine (6 in total); stage 2 with 3 RD-0210 + 1 RD-0211; stage 3 with 1 RD-0213 and a four-nozzle RD-0214 vernier; the Briz-M upper stage (a toroidal drop tank around a central core) under the fairing',
    sources: ['https://en.wikipedia.org/wiki/Proton-M'],
    stages: [
      S('Stage 1', 'RD-275M', 6, 'ring'),
      S('Stage 2', 'RD-0210 / RD-0211', 4, 'quad'),
      S('Stage 3', 'RD-0213', 1, 'single', { vernierNozzles: 4 }),
      S('Briz-M', 'S5.98M', 1, 'single'),
    ],
  },
  'pslv-xl': {
    name: 'PSLV-XL',
    agency: 'ISRO',
    propellant: 'solid PS1 and PS3, N2O4 / UDMH PS2, MMH / MON PS4',
    sources: ['https://en.wikipedia.org/wiki/Polar_Satellite_Launch_Vehicle'],
    stages: [
      S('PSOM-XL strap-ons ×6', 'PSOM-XL solid motor', 6, 'per-booster', { boosterCount: 6 }),
      S('PS1', 'S139 solid motor', 1, 'single'),
      S('PS2', 'Vikas', 1, 'single', { prop: 'N2O4 / UDMH' }),
      S('PS3', 'HPS3 solid motor', 1, 'single'),
      S('PS4', 'PS-4 engine', 2, 'pair', { prop: 'MON / MMH' }),
    ],
  },
  // The original two-stage R-7 (8K71PS) that launched Sputnik 1 — the Vostok-K
  // configuration with the Blok E upper stage already has its own cutaway (vostok-k).
  'r-7-vostok': {
    name: 'R-7 Semyorka (8K71PS)',
    agency: 'OKB-1 (Soviet)',
    propellant: 'LOX / RP-1',
    manual:
      'the Korolev cross: 4 tapered conical strap-on boosters (Blok B, V, G, D) clustered around the Blok A core, each booster with one four-chamber RD-107 plus 2 vernier nozzles, the core with one four-chamber RD-108 plus 4 verniers; no upper stage at all — a small conical nose fairing on top of the core housing the polished Sputnik 1 sphere with its four whip antennas',
    sources: [
      'https://en.wikipedia.org/wiki/Sputnik_(rocket)',
      'https://en.wikipedia.org/wiki/R-7_Semyorka',
    ],
    stages: [
      S('Strap-ons ×4', 'RD-107', 4, 'per-booster', { boosterCount: 4, vernierNozzles: 8 }),
      S('Core (Blok A)', 'RD-108', 1, 'quad', { vernierNozzles: 4 }),
    ],
  },
  'sls-block-1': {
    name: 'SLS Block 1',
    agency: 'NASA',
    propellant: 'LOX / LH2 core and upper stage, solid boosters',
    manual:
      'an orange-foam core stage with 4 RS-25 engines, 2 five-segment solid rocket boosters on its sides, the ICPS upper stage with 1 RL10B-2, and the Orion capsule with its service module and launch abort tower on top (no payload fairing)',
    sources: ['https://en.wikipedia.org/wiki/Space_Launch_System'],
    stages: [
      S('Solid rocket boosters ×2', 'five-segment SRB', 2, 'per-booster', { boosterCount: 2 }),
      S('Core stage', 'RS-25', 4, 'quad'),
      S('ICPS', 'RL10B-2', 1, 'single'),
    ],
  },
  'soyuz-2': {
    name: 'Soyuz-2.1b',
    agency: 'Roscosmos / Progress RKTs',
    propellant: 'LOX / RP-1',
    manual:
      'the Korolev cross: 4 tapered conical strap-on boosters around the Blok A core, each booster with one four-chamber RD-107A plus 2 verniers, the core with one four-chamber RD-108A plus 4 verniers; Blok I third stage with one four-chamber RD-0124; payload (often on a Fregat upper stage) under a fairing',
    sources: ['https://en.wikipedia.org/wiki/Soyuz-2'],
    stages: [
      S('Strap-ons ×4', 'RD-107A', 4, 'per-booster', { boosterCount: 4, vernierNozzles: 8 }),
      S('Core (Blok A)', 'RD-108A', 1, 'quad', { vernierNozzles: 4 }),
      S('Blok I', 'RD-0124', 1, 'quad'),
    ],
  },
  'soyuz-fg': {
    name: 'Soyuz-FG',
    agency: 'Roscosmos / Progress RKTs',
    propellant: 'LOX / RP-1',
    manual:
      'the Korolev cross: 4 tapered conical strap-on boosters around the Blok A core, each booster with one four-chamber RD-107A plus 2 verniers, the core with one four-chamber RD-108A plus 4 verniers; Blok I third stage with one four-chamber RD-0110; the crewed Soyuz spacecraft under its shroud with the launch escape tower on top',
    sources: ['https://en.wikipedia.org/wiki/Soyuz-FG'],
    stages: [
      S('Strap-ons ×4', 'RD-107A', 4, 'per-booster', { boosterCount: 4, vernierNozzles: 8 }),
      S('Core (Blok A)', 'RD-108A', 1, 'quad', { vernierNozzles: 4 }),
      S('Blok I', 'RD-0110', 1, 'quad'),
    ],
  },
  'soyuz-u': {
    name: 'Soyuz-U',
    agency: 'OKB-1 / TsSKB (Soviet)',
    propellant: 'LOX / RP-1',
    manual:
      'the Korolev cross: 4 tapered conical strap-on boosters around the Blok A core, each booster with one four-chamber RD-117 plus 2 verniers, the core with one four-chamber RD-118 plus 4 verniers; Blok I third stage with one four-chamber RD-0110; payload (a Progress cargo ship or Soyuz) under its shroud',
    sources: ['https://en.wikipedia.org/wiki/Soyuz-U'],
    stages: [
      S('Strap-ons ×4', 'RD-117', 4, 'per-booster', { boosterCount: 4, vernierNozzles: 8 }),
      S('Core (Blok A)', 'RD-118', 1, 'quad', { vernierNozzles: 4 }),
      S('Blok I', 'RD-0110', 1, 'quad'),
    ],
  },
  vulcan: {
    name: 'Vulcan Centaur (VC2S)',
    agency: 'United Launch Alliance',
    propellant: 'LOX / LNG first stage, LOX / LH2 Centaur V, solid strap-ons',
    sources: ['https://en.wikipedia.org/wiki/Vulcan_Centaur'],
    stages: [
      S('GEM 63XL strap-ons ×2', 'GEM 63XL solid motor', 2, 'per-booster', { boosterCount: 2 }),
      S('Booster stage', 'BE-4', 2, 'pair', { prop: 'LOX / LNG' }),
      S('Centaur V', 'RL10C-X', 2, 'pair', { prop: 'LOX / LH2' }),
    ],
  },
};
