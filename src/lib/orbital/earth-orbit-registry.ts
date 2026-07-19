/**
 * Tier-1 Earth-orbit coast descriptors (RFC-034 §13). The middle act of a
 * crewed-capsule flight: after ascent, the capsule COASTS in low Earth orbit —
 * looping the planet for anywhere from a single revolution (Vostok 1) to 206
 * (Gemini 7) — before the deorbit burn hands off to the re-entry descent.
 *
 * The `fly-leo-coast-scene` renders `min(revolutions, LOOP_CAP)` representative
 * loops while the HUD counters carry the real `revolutions` + `coastDurationS`
 * (the hybrid rule). Suborbital hops (Mercury-Redstone) set `suborbital: true`
 * and render a single ballistic arc, no closed loop.
 *
 * A small TS registry for the MVP; migrates to per-mission JSON alongside the
 * launch/descent profiles when the full ~31-mission set lands.
 */

export interface EarthOrbitCoast {
  missionId: string;
  /** Capsule family id → capsule-models builder (e.g. 'mercury'). */
  capsuleId: string;
  apogeeKm: number;
  perigeeKm: number;
  inclinationDeg: number;
  /** Real revolutions flown (carried by the HUD "REV n / N" counter). */
  revolutions: number;
  /** Real on-orbit seconds (carried by the HUD MET/date clock). */
  coastDurationS: number;
  /** Suborbital ballistic hop — a single arc, no orbital loop. */
  suborbital?: boolean;
}

const COASTS: Record<string, EarthOrbitCoast> = {
  'friendship-7': {
    missionId: 'friendship-7',
    capsuleId: 'mercury',
    apogeeKm: 265,
    perigeeKm: 159,
    inclinationDeg: 32.5,
    revolutions: 3,
    coastDurationS: 17280, // ~4 h 48 m on orbit
  },
  'vostok-1': {
    missionId: 'vostok-1',
    capsuleId: 'vostok',
    apogeeKm: 327,
    perigeeKm: 169,
    inclinationDeg: 64.95,
    revolutions: 1, // Gagarin — a single orbit
    coastDurationS: 6480, // 108 min
  },
  apollo7: {
    missionId: 'apollo7',
    capsuleId: 'apollo-cm',
    apogeeKm: 301,
    perigeeKm: 227,
    inclinationDeg: 31.6,
    revolutions: 163, // ~11 days — the marathon end of the hybrid rule
    coastDurationS: 933000,
  },
  'aurora-7': { missionId: 'aurora-7', capsuleId: 'mercury', apogeeKm: 260, perigeeKm: 158, inclinationDeg: 32.5, revolutions: 3, coastDurationS: 17280 },
  'sigma-7': { missionId: 'sigma-7', capsuleId: 'mercury', apogeeKm: 283, perigeeKm: 160, inclinationDeg: 32.5, revolutions: 6, coastDurationS: 32400 },
  'faith-7': { missionId: 'faith-7', capsuleId: 'mercury', apogeeKm: 267, perigeeKm: 161, inclinationDeg: 32.5, revolutions: 22, coastDurationS: 122400 },
  'freedom-7': { missionId: 'freedom-7', capsuleId: 'mercury', apogeeKm: 187, perigeeKm: 187, inclinationDeg: 0, revolutions: 0, coastDurationS: 900, suborbital: true },
  'liberty-bell-7': { missionId: 'liberty-bell-7', capsuleId: 'mercury', apogeeKm: 190, perigeeKm: 190, inclinationDeg: 0, revolutions: 0, coastDurationS: 900, suborbital: true },
  gemini3: { missionId: 'gemini3', capsuleId: 'gemini', apogeeKm: 224, perigeeKm: 161, inclinationDeg: 32.6, revolutions: 3, coastDurationS: 17280 },
  gemini4: { missionId: 'gemini4', capsuleId: 'gemini', apogeeKm: 282, perigeeKm: 162, inclinationDeg: 32.5, revolutions: 62, coastDurationS: 345600 },
  gemini6a: { missionId: 'gemini6a', capsuleId: 'gemini', apogeeKm: 311, perigeeKm: 283, inclinationDeg: 28.9, revolutions: 16, coastDurationS: 92160 },
  gemini7: { missionId: 'gemini7', capsuleId: 'gemini', apogeeKm: 328, perigeeKm: 300, inclinationDeg: 28.9, revolutions: 206, coastDurationS: 1209600 },
  gemini8: { missionId: 'gemini8', capsuleId: 'gemini', apogeeKm: 272, perigeeKm: 160, inclinationDeg: 28.9, revolutions: 7, coastDurationS: 40320 },
  gemini12: { missionId: 'gemini12', capsuleId: 'gemini', apogeeKm: 270, perigeeKm: 160, inclinationDeg: 28.8, revolutions: 59, coastDurationS: 330000 },
  'vostok-2': { missionId: 'vostok-2', capsuleId: 'vostok', apogeeKm: 244, perigeeKm: 178, inclinationDeg: 64.9, revolutions: 17, coastDurationS: 90600 },
  'vostok-3': { missionId: 'vostok-3', capsuleId: 'vostok', apogeeKm: 251, perigeeKm: 183, inclinationDeg: 64.98, revolutions: 64, coastDurationS: 345600 },
  'vostok-4': { missionId: 'vostok-4', capsuleId: 'vostok', apogeeKm: 254, perigeeKm: 180, inclinationDeg: 65, revolutions: 48, coastDurationS: 259200 },
  'vostok-5': { missionId: 'vostok-5', capsuleId: 'vostok', apogeeKm: 222, perigeeKm: 175, inclinationDeg: 65, revolutions: 81, coastDurationS: 432000 },
  'vostok-6': { missionId: 'vostok-6', capsuleId: 'vostok', apogeeKm: 231, perigeeKm: 176, inclinationDeg: 65.1, revolutions: 48, coastDurationS: 259200 },
  'voskhod-1': { missionId: 'voskhod-1', capsuleId: 'voskhod', apogeeKm: 336, perigeeKm: 178, inclinationDeg: 64.7, revolutions: 16, coastDurationS: 86400 },
  'voskhod-2': { missionId: 'voskhod-2', capsuleId: 'voskhod', apogeeKm: 475, perigeeKm: 167, inclinationDeg: 64.8, revolutions: 17, coastDurationS: 90000 },
  apollo9: { missionId: 'apollo9', capsuleId: 'apollo-cm', apogeeKm: 229, perigeeKm: 189, inclinationDeg: 33.8, revolutions: 151, coastDurationS: 907200 },
  'apollo-soyuz': { missionId: 'apollo-soyuz', capsuleId: 'apollo-cm', apogeeKm: 222, perigeeKm: 217, inclinationDeg: 51.8, revolutions: 148, coastDurationS: 806400 },
  'skylab-2': { missionId: 'skylab-2', capsuleId: 'apollo-cm', apogeeKm: 434, perigeeKm: 428, inclinationDeg: 50, revolutions: 404, coastDurationS: 2246400 },
  'skylab-3': { missionId: 'skylab-3', capsuleId: 'apollo-cm', apogeeKm: 440, perigeeKm: 425, inclinationDeg: 50, revolutions: 858, coastDurationS: 5097600 },
  'skylab-4': { missionId: 'skylab-4', capsuleId: 'apollo-cm', apogeeKm: 437, perigeeKm: 422, inclinationDeg: 50, revolutions: 1214, coastDurationS: 7171200 },
  'soyuz-1': { missionId: 'soyuz-1', capsuleId: 'soyuz', apogeeKm: 223, perigeeKm: 197, inclinationDeg: 51.7, revolutions: 18, coastDurationS: 96000 },
  'soyuz-11': { missionId: 'soyuz-11', capsuleId: 'soyuz', apogeeKm: 217, perigeeKm: 185, inclinationDeg: 51.6, revolutions: 383, coastDurationS: 2160000 },
  inspiration4: { missionId: 'inspiration4', capsuleId: 'dragon', apogeeKm: 585, perigeeKm: 575, inclinationDeg: 51.6, revolutions: 47, coastDurationS: 250000 },
  'polaris-dawn': { missionId: 'polaris-dawn', capsuleId: 'dragon', apogeeKm: 1400, perigeeKm: 190, inclinationDeg: 51.7, revolutions: 75, coastDurationS: 432000 },
  'shenzhou-1': { missionId: 'shenzhou-1', capsuleId: 'shenzhou', apogeeKm: 315, perigeeKm: 195, inclinationDeg: 42.6, revolutions: 14, coastDurationS: 86400 },
};

/** The mean orbit altitude used to draw the ring. */
export function coastAltitudeKm(c: EarthOrbitCoast): number {
  return (c.apogeeKm + c.perigeeKm) / 2;
}

export function hasEarthOrbitCoast(missionId: string | undefined | null): boolean {
  return missionId != null && missionId in COASTS;
}

export function getEarthOrbitCoast(missionId: string | undefined | null): EarthOrbitCoast | null {
  return missionId != null ? (COASTS[missionId] ?? null) : null;
}
