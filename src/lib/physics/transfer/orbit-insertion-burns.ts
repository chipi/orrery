/**
 * The orbit-insertion burn each orbiter actually fired at its destination — the engine,
 * what kind of engine, and how long it burned. The arrival mirror of the launch side's
 * per-stage injection burns: resolveOrbitInsertion() names the beat from the mission's
 * Δv; this says what fired it, so the scene draws the right plume and the callout names
 * the engine. Missions not listed (planned arrivals with no published burn, ion-spiral
 * captures such as Dawn and Psyche) keep the callout without a burn.
 *
 * Engine labels are designations or thrusts — no prose — so they read the same in
 * every locale. Research notes: git show d11a0df6db6:docs/wip/2026-11-02-fly-flight-and-descent-analysis.md.
 */

export type OrbitInsertionEngineKind = 'main' | 'solid' | 'rcs';

export interface OrbitInsertionBurn {
  /** Designation ("R-4D", "Star 48B") or thrust ("400 N", "4 × 23 N"). */
  engine: string;
  kind: OrbitInsertionEngineKind;
  /** Burn duration (s); null when no source gives it. */
  durationS: number | null;
  sources: string[];
}

export const ORBIT_INSERTION_BURNS: Record<string, OrbitInsertionBurn> = {
  mariner9: {
    engine: '1340 N',
    kind: 'main',
    durationS: 923, // 15 min 23 s
    sources: [
      'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-051A',
      'https://en.wikipedia.org/wiki/Mariner_9',
    ],
  },
  // The Star 48B solid motor (89 kN); its ~83 s burn time is from a search summary only.
  magellan: {
    engine: 'Star 48B',
    kind: 'solid',
    durationS: 83,
    sources: ['https://en.wikipedia.org/wiki/Magellan_(spacecraft)'],
  },
  'mars-express': {
    engine: '400 N',
    kind: 'main',
    durationS: 37 * 60,
    sources: [
      'https://www.esa.int/Science_Exploration/Space_Science/Merry_Christmas_from_Mars',
      'https://en.wikipedia.org/wiki/Mars_Express',
    ],
  },
  messenger: {
    engine: '645 N',
    kind: 'main',
    durationS: 15 * 60,
    sources: ['https://en.wikipedia.org/wiki/MESSENGER'],
  },
  cassini: {
    engine: 'R-4D',
    kind: 'main',
    durationS: 96 * 60,
    sources: [
      'https://www.jpl.nasa.gov/news/cassini-spacecraft-at-saturns-doorstep/',
      'https://en.wikipedia.org/wiki/Cassini%E2%80%93Huygens',
    ],
  },
  juno: {
    engine: 'LEROS-1b',
    kind: 'main',
    durationS: 2102,
    sources: ['https://en.wikipedia.org/wiki/Juno_(spacecraft)'],
  },
  maven: {
    engine: '1195 N',
    kind: 'main',
    durationS: 33 * 60 + 15,
    sources: ['https://lasp.colorado.edu/maven/features-news/events/'],
  },
  mangalyaan: {
    engine: '440 N',
    kind: 'main',
    durationS: 1389, // 01:47:32 → 02:11:46 UTC
    sources: ['https://en.wikipedia.org/wiki/Mars_Orbiter_Mission'],
  },
  'hope-probe': {
    engine: '6 × 120 N',
    kind: 'main',
    durationS: 27 * 60,
    sources: [
      'https://www.ssl.berkeley.edu/wp-content/uploads/2021/02/EMM-MOI-Fast-Facts-1.pdf',
      'https://en.wikipedia.org/wiki/Emirates_Mars_Mission',
    ],
  },
  // The 2015 insertion, on four attitude thrusters: the main engine failed in the 2010 attempt.
  akatsuki: {
    engine: '4 × 23 N',
    kind: 'rcs',
    durationS: 20 * 60,
    sources: [
      'https://en.wikipedia.org/wiki/Akatsuki_(spacecraft)',
      'https://global.jaxa.jp/press/2015/12/20151207_akatsuki.html',
    ],
  },
  // Thrust and the ~40 min duration are from search summaries only.
  lro: {
    engine: '4 × 89 N',
    kind: 'main',
    durationS: 40 * 60,
    sources: ['https://svs.gsfc.nasa.gov/10445'],
  },
  chandrayaan1: {
    engine: '440 N',
    kind: 'main',
    durationS: 817,
    sources: ['https://en.wikipedia.org/wiki/Chandrayaan-1'],
  },
  clementine: {
    engine: '489 N',
    kind: 'main',
    durationS: null,
    sources: ['https://www.eoportal.org/satellite-missions/clementine'],
  },
};

/** The burn that inserted a mission into orbit, or null. */
export function orbitInsertionBurn(
  missionId: string | undefined | null,
): OrbitInsertionBurn | null {
  return (missionId && ORBIT_INSERTION_BURNS[missionId]) || null;
}
