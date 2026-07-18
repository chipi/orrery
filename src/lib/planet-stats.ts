/**
 * Body-level physical stats for the Tactical-Scan HUD (PRD-023 Slice E.4,
 * amended 2026-07-08 to span /explore + the surface routes, #382).
 *
 * Single source of truth for the "gravity / atmosphere / temp / wind /
 * rotation" scan. `/explore` reads it at planet focus; `/moon`, `/mars`,
 * and `/earth` (via SurfaceScene) read it for their own body so the same
 * facts read identically whether you fly to a world or stand on it.
 *
 * Values are real: surface gravity in g, atmospheric pressure in bar
 * (0 for airless bodies; gas giants use the 1-bar level by convention),
 * sidereal rotation in hours, mean diameter in km, escape velocity in
 * km/s. `atmoComposition` stays English — chemistry symbols are universal
 * (matches the rest of the scan's label convention).
 */

export type SurfaceKind = 'rocky' | 'rocky-liquid' | 'rocky-ice' | 'gas-giant' | 'ice-giant';
export type RadiationLevel = 'shielded' | 'moderate' | 'high' | 'extreme';

export type PlanetStats = {
  diameterKm: number;
  diameterRatioEarth: number;
  surfaceGravityG: number;
  /** Surface atmospheric pressure in bar. 0 for airless bodies; gas
   *  giants use the 1-bar pressure level by convention. */
  atmoBar: number;
  atmoComposition: string;
  /** Mean surface temperature in kelvin (1-bar level for gas giants). */
  surfaceTempK: number;
  /** Maximum sustained surface wind in m/s. 0 for airless bodies. */
  maxWindMs: number;
  /** Escape velocity at the equator in km/s. */
  escapeKms: number;
  surfaceKind: SurfaceKind;
  /** Radiation category — informs spacecraft approach decisions. */
  radiation: RadiationLevel;
};

export const PLANET_STATS: Record<string, PlanetStats> = {
  mercury: {
    diameterKm: 4880,
    diameterRatioEarth: 0.38,
    surfaceGravityG: 0.38,
    atmoBar: 0,
    atmoComposition: 'Na · K · O · H exosphere (trace)',
    surfaceTempK: 440,
    maxWindMs: 0,
    escapeKms: 4.3,
    surfaceKind: 'rocky',
    radiation: 'extreme',
  },
  venus: {
    diameterKm: 12104,
    diameterRatioEarth: 0.95,
    surfaceGravityG: 0.91,
    atmoBar: 92,
    atmoComposition: 'CO₂ 96.5% · N₂ 3.5% · H₂SO₄ cloud deck',
    surfaceTempK: 737,
    maxWindMs: 1,
    escapeKms: 10.4,
    surfaceKind: 'rocky',
    radiation: 'shielded',
  },
  earth: {
    diameterKm: 12742,
    diameterRatioEarth: 1.0,
    surfaceGravityG: 1.0,
    atmoBar: 1.0,
    atmoComposition: 'N₂ 78% · O₂ 21% · Ar 0.9%',
    surfaceTempK: 288,
    maxWindMs: 50,
    escapeKms: 11.2,
    surfaceKind: 'rocky-liquid',
    radiation: 'shielded',
  },
  // The Moon is a satellite (absent from /explore's PLANET_STATS, which
  // is planet-keyed); it gets a full entry here so the /moon surface
  // route can run the same scan. Temp is the equatorial mean — the
  // surface swings ~100 K (night) to ~390 K (noon) with no atmosphere
  // to buffer it. Radiation is 'high': no global field, no air.
  moon: {
    diameterKm: 3474,
    diameterRatioEarth: 0.273,
    surfaceGravityG: 0.165,
    atmoBar: 0,
    atmoComposition: 'He · Ar · Na exosphere (trace)',
    surfaceTempK: 250,
    maxWindMs: 0,
    escapeKms: 2.38,
    surfaceKind: 'rocky',
    radiation: 'high',
  },
  mars: {
    diameterKm: 6779,
    diameterRatioEarth: 0.53,
    surfaceGravityG: 0.38,
    atmoBar: 0.006,
    atmoComposition: 'CO₂ 95% · N₂ 2.8% · Ar 2%',
    surfaceTempK: 210,
    maxWindMs: 30,
    escapeKms: 5.0,
    surfaceKind: 'rocky',
    radiation: 'high',
  },
  jupiter: {
    diameterKm: 139820,
    diameterRatioEarth: 10.97,
    surfaceGravityG: 2.53,
    atmoBar: 1,
    atmoComposition: 'H₂ 90% · He 10% · NH₃/H₂O/CH₄ clouds',
    surfaceTempK: 165,
    maxWindMs: 100,
    escapeKms: 59.5,
    surfaceKind: 'gas-giant',
    radiation: 'extreme',
  },
  saturn: {
    diameterKm: 116460,
    diameterRatioEarth: 9.14,
    surfaceGravityG: 1.07,
    atmoBar: 1,
    atmoComposition: 'H₂ 96% · He 3% · CH₄/NH₃ clouds',
    surfaceTempK: 134,
    maxWindMs: 500,
    escapeKms: 35.5,
    surfaceKind: 'gas-giant',
    radiation: 'high',
  },
  uranus: {
    diameterKm: 50724,
    diameterRatioEarth: 3.98,
    surfaceGravityG: 0.89,
    atmoBar: 1,
    atmoComposition: 'H₂ 83% · He 15% · CH₄ 2.3%',
    surfaceTempK: 76,
    maxWindMs: 250,
    escapeKms: 21.3,
    surfaceKind: 'ice-giant',
    radiation: 'moderate',
  },
  neptune: {
    diameterKm: 49244,
    diameterRatioEarth: 3.86,
    surfaceGravityG: 1.14,
    atmoBar: 1,
    atmoComposition: 'H₂ 80% · He 19% · CH₄ 1.5%',
    surfaceTempK: 72,
    maxWindMs: 580,
    escapeKms: 23.5,
    surfaceKind: 'ice-giant',
    radiation: 'moderate',
  },
  pluto: {
    diameterKm: 2376,
    diameterRatioEarth: 0.19,
    surfaceGravityG: 0.06,
    atmoBar: 1e-6,
    atmoComposition: 'N₂ + CH₄ + CO (~10 μbar, sublimates)',
    surfaceTempK: 44,
    maxWindMs: 0,
    escapeKms: 1.2,
    surfaceKind: 'rocky-ice',
    radiation: 'shielded',
  },
};

/** Light-time to a body from the Sun and (coarse mean) from Earth, in
 *  minutes. `fromEarthMin` is null when unknown; 0 for Earth itself
 *  (the scan suppresses the Earth-distance clause when it isn't > 0). */
export type LightTime = { fromSunMin: number; fromEarthMin: number | null };

/** Light-time of 1 AU in minutes (IAU 2012). */
export const LIGHT_MINUTES_PER_AU = 8.317;
const KM_PER_LIGHT_MINUTE = 299_792.458 * 60;

/**
 * Light-time from semi-major axes (AU). Earth-distance is the coarse
 * mean |a_body − a_earth| — the real value swings through the synodic
 * period, but this matches /explore's constant-r orbit visualisation so
 * the two routes agree.
 */
export function auLightTime(aAu: number, earthAu = 1): LightTime {
  return {
    fromSunMin: aAu * LIGHT_MINUTES_PER_AU,
    fromEarthMin: Math.abs(aAu - earthAu) * LIGHT_MINUTES_PER_AU,
  };
}

/**
 * Light-time for a body whose Earth separation is better expressed as a
 * fixed distance than as |Δa| — the Moon, whose heliocentric semi-major
 * axis is ~1 AU (so |Δa| ≈ 0) but which sits 384 400 km from Earth.
 */
export function kmEarthLightTime(fromSunAu: number, earthKm: number): LightTime {
  return {
    fromSunMin: fromSunAu * LIGHT_MINUTES_PER_AU,
    fromEarthMin: earthKm / KM_PER_LIGHT_MINUTE,
  };
}

/**
 * Per-body kinematics the surface routes need for the scan but that
 * aren't in `PlanetStats` (rotation lives in planets.json for planets;
 * the Moon isn't a planet, so it's centralised here). `rotationHours`
 * is sidereal; negative would mean retrograde (none of the three are).
 */
export interface BodyKinematics {
  rotationHours: number;
  lightTime: LightTime;
}

export const SURFACE_BODY_KINEMATICS: Record<'moon' | 'mars' | 'earth' | 'venus', BodyKinematics> =
  {
    earth: { rotationHours: 23.93, lightTime: auLightTime(1.0) },
    // Tidally locked: sidereal rotation = orbital period, 27.32 d.
    moon: { rotationHours: 655.7, lightTime: kmEarthLightTime(1.0, 384_400) },
    mars: { rotationHours: 24.62, lightTime: auLightTime(1.524) },
    // Venus rotates retrograde, 243 Earth days — the slowest in the solar system.
    venus: { rotationHours: 5832.5, lightTime: auLightTime(0.723) },
  };

/**
 * Per-body display palette, anchored to the surface-route chip tint
 * (Mars red / Earth blue / Moon silver — see each route's `bodyTintCss`).
 * Shared by the atmosphere-voice waveform + the instrument tiles (#385)
 * so every HUD visual reads as belonging to *this* body.
 */
export interface BodyPalette {
  core: string;
  bright: string;
  mid: string;
  deep: string;
  /** "r,g,b" triple for rgba() glows. */
  glowRGB: string;
}

export const BODY_PALETTE: Record<string, BodyPalette> = {
  mars: {
    core: '#fff1e6',
    bright: '#ff9a4d',
    mid: '#ff6a2e',
    deep: '#c8371a',
    glowRGB: '255,122,60',
  },
  earth: {
    core: '#ecffff',
    bright: '#7fe0ff',
    mid: '#3aa0ff',
    deep: '#2b6cff',
    glowRGB: '90,190,255',
  },
  moon: {
    core: '#ffffff',
    bright: '#e6ebf5',
    mid: '#c1c6d4',
    deep: '#9298aa',
    glowRGB: '205,213,233',
  },
};
