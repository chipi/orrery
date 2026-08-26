/**
 * Moon-as-seen-from-Earth: phase, optical libration, and the observer-dependent
 * disk orientation (#48 — /moon "view from my location").
 *
 * Builds on the existing geocentric ephemeris (geocentricMoon / geocentricSun)
 * and the alt/az pipeline (skyPosition). Three location/time facts drive the
 * view:
 *   - PHASE — the terminator: which fraction is lit + waxing/waning (time).
 *   - LIBRATION — the sub-Earth selenographic point, the ±~7° wobble that decides
 *     exactly which near-side edge you can peek around (time; optical part only —
 *     the physical libration is ~0.02° and dropped).
 *   - DISK ORIENTATION — from a given latitude the Moon appears rotated (the
 *     "upside-down from the tropics" effect): bright-limb angle minus the
 *     parallactic angle (location + time).
 * Accuracy tracks the underlying Schlyter Moon model (~1–2′), which is far finer
 * than this view needs.
 */
import { julianDay, centuriesSinceJ2000, gmstRad, DEG } from './time';
import { geocentricMoon } from './moon';
import { geocentricSun } from './planets';
import { skyPosition } from './index';

const RAD = 180 / Math.PI;
const norm360 = (d: number): number => ((d % 360) + 360) % 360;
/** Wrap to (−180, 180], sign-safe for any magnitude. */
const wrap180 = (d: number): number => (((d % 360) + 540) % 360) - 180;

export type MoonPhaseName =
  | 'new'
  | 'waxing-crescent'
  | 'first-quarter'
  | 'waxing-gibbous'
  | 'full'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'waning-crescent';

export interface MoonPhase {
  /** Fraction of the disk lit, 0 (new) → 1 (full). */
  illuminatedFraction: number;
  /** Sun–Moon–Earth angle, degrees [0,180]. 0 = full, 180 = new. */
  phaseAngleDeg: number;
  /** Moon−Sun ecliptic-longitude difference, degrees [0,360). 0=new, 90=first
   *  quarter, 180=full, 270=last quarter — the canonical "age" angle. */
  ageDeg: number;
  /** True from new → full (lit fraction growing). */
  waxing: boolean;
  phaseName: MoonPhaseName;
}

export interface MoonLibration {
  /** Optical libration in longitude, degrees (selenographic lon of sub-Earth
   *  point). Positive = the Moon's east (Mare Crisium) limb tips toward us. */
  lonDeg: number;
  /** Optical libration in latitude, degrees. Positive = north pole tips toward
   *  us (south-limb features come into view). */
  latDeg: number;
}

/** Illumination + phase of the Moon at `date`. */
export function moonPhase(date: Date): MoonPhase {
  const jd = julianDay(date);
  const m = geocentricMoon(jd);
  const s = geocentricSun(jd);
  const dMoon = m.distanceAu;
  const rSun = Math.hypot(s.x, s.y, s.z);

  // Elongation (Moon–Sun separation seen from Earth) and phase angle at the Moon.
  const dot = m.pos.x * s.x + m.pos.y * s.y + m.pos.z * s.z;
  const cosElong = Math.min(1, Math.max(-1, dot / (dMoon * rSun)));
  const elong = Math.acos(cosElong); // radians
  const phaseAngle = Math.atan2(rSun * Math.sin(elong), dMoon - rSun * cosElong); // Meeus 48.3
  const illuminatedFraction = (1 + Math.cos(phaseAngle)) / 2;

  // Age from the ecliptic-longitude lead of the Moon over the Sun.
  const lonMoon = Math.atan2(m.pos.y, m.pos.x) * RAD;
  const lonSun = Math.atan2(s.y, s.x) * RAD;
  const ageDeg = norm360(lonMoon - lonSun);

  return {
    illuminatedFraction,
    phaseAngleDeg: phaseAngle * RAD,
    ageDeg,
    waxing: ageDeg < 180,
    phaseName: phaseNameForAge(ageDeg),
  };
}

function phaseNameForAge(age: number): MoonPhaseName {
  if (age < 22.5 || age >= 337.5) return 'new';
  if (age < 67.5) return 'waxing-crescent';
  if (age < 112.5) return 'first-quarter';
  if (age < 157.5) return 'waxing-gibbous';
  if (age < 202.5) return 'full';
  if (age < 247.5) return 'waning-gibbous';
  if (age < 292.5) return 'last-quarter';
  return 'waning-crescent';
}

// Inclination of the mean lunar equator to the ecliptic (Meeus ch. 53).
const MEAN_LUNAR_INCL_DEG = 1.54242;

/**
 * Optical libration (Meeus 53.1) — the sub-Earth selenographic point. Takes the
 * Moon's apparent ecliptic longitude/latitude and the node/argument-of-latitude
 * so it can be unit-tested against Meeus's worked example independent of which
 * ephemeris supplied them.
 */
export function opticalLibration(
  lambdaDeg: number,
  betaDeg: number,
  omegaDeg: number,
  argLatDeg: number,
): MoonLibration {
  const I = MEAN_LUNAR_INCL_DEG * DEG;
  const beta = betaDeg * DEG;
  const W = (lambdaDeg - omegaDeg) * DEG;
  const sinW = Math.sin(W);
  const cosW = Math.cos(W);
  const cosB = Math.cos(beta);
  const sinB = Math.sin(beta);

  const A = Math.atan2(sinW * cosB * Math.cos(I) - sinB * Math.sin(I), cosW * cosB);
  const lon = wrap180(A * RAD - argLatDeg);
  const sinBPrime = -sinW * cosB * Math.sin(I) - sinB * Math.cos(I);
  const lat = Math.asin(Math.min(1, Math.max(-1, sinBPrime))) * RAD;
  return { lonDeg: lon, latDeg: lat };
}

// Mean ascending node (Ω) and argument of latitude (F) of the Moon at `t`
// Julian centuries (Meeus 47.7 / 22) — the body-frame reference the libration
// projection uses.
function nodeAndArgLat(t: number): { omega: number; argLat: number } {
  return {
    omega: norm360(125.04452 - 1934.136261 * t + 0.0020708 * t * t),
    argLat: norm360(93.272095 + 483202.0175233 * t - 0.0036539 * t * t),
  };
}

/** Optical libration of the Moon at `date` (drives the sub-Earth orientation). */
export function moonLibration(date: Date): MoonLibration {
  const jd = julianDay(date);
  const m = geocentricMoon(jd);
  const r = m.distanceAu;
  const lambda = norm360(Math.atan2(m.pos.y, m.pos.x) * RAD);
  const beta = Math.asin(Math.min(1, Math.max(-1, m.pos.z / r))) * RAD;
  const { omega, argLat } = nodeAndArgLat(centuriesSinceJ2000(jd));
  return opticalLibration(lambda, beta, omega, argLat);
}

/**
 * Sub-solar selenographic point — where the Sun is overhead on the Moon, in the
 * SAME selenographic frame as the sub-Earth libration. Projecting the Sun→Moon
 * direction through the identical body-frame rotation means the angular gap
 * between this point and the sub-Earth point is exactly the phase angle, so
 * lighting the globe from here produces the correct terminator (#48).
 */
export function subSolarPoint(date: Date): MoonLibration {
  const jd = julianDay(date);
  const m = geocentricMoon(jd);
  const s = geocentricSun(jd);
  // Sun→Moon direction (ecliptic): the point facing it is lit.
  const vx = m.pos.x - s.x;
  const vy = m.pos.y - s.y;
  const vz = m.pos.z - s.z;
  const r = Math.hypot(vx, vy, vz);
  const lambdaH = norm360(Math.atan2(vy, vx) * RAD);
  const betaH = Math.asin(Math.min(1, Math.max(-1, vz / r))) * RAD;
  const { omega, argLat } = nodeAndArgLat(centuriesSinceJ2000(jd));
  return opticalLibration(lambdaH, betaH, omega, argLat);
}

export interface MoonObserverView {
  phase: MoonPhase;
  libration: MoonLibration;
  /** Sub-solar selenographic point — aim the globe's sun light here for the
   *  correct terminator (same frame as `libration`). */
  subSolar: MoonLibration;
  /** Moon altitude above the horizon, degrees (negative = below). */
  altitudeDeg: number;
  /** Moon azimuth from true north, degrees. */
  azimuthDeg: number;
  aboveHorizon: boolean;
  /** Position angle of the sunlit limb's midpoint, measured N→E, degrees
   *  (Meeus 48.5). */
  brightLimbAngleDeg: number;
  /** Parallactic angle at the Moon (rotation of the celestial N from the local
   *  vertical), degrees. */
  parallacticAngleDeg: number;
  /** How the sunlit limb is oriented relative to straight-up in the observer's
   *  sky (brightLimb − parallactic), degrees. This is the location effect: it
   *  flips ~180° between the far north and the deep south. */
  limbToZenithDeg: number;
}

/** Everything the /moon observer view needs for `date` at `latDeg`/`lonDeg`. */
export function moonObserverView(date: Date, latDeg: number, lonDeg: number): MoonObserverView {
  const phase = moonPhase(date);
  const libration = moonLibration(date);
  const subSolar = subSolarPoint(date);
  const moon = skyPosition('moon', date, latDeg, lonDeg);
  const sun = skyPosition('sun', date, latDeg, lonDeg);

  // Bright-limb position angle (Meeus 48.5), from the equatorial coords.
  const aMoon = moon.raHours * 15 * DEG;
  const aSun = sun.raHours * 15 * DEG;
  const dMoon = moon.decDeg * DEG;
  const dSun = sun.decDeg * DEG;
  const brightLimb = Math.atan2(
    Math.cos(dSun) * Math.sin(aSun - aMoon),
    Math.sin(dSun) * Math.cos(dMoon) - Math.cos(dSun) * Math.sin(dMoon) * Math.cos(aSun - aMoon),
  );

  // Parallactic angle q at the Moon: H = local hour angle = LST − RA.
  const jd = julianDay(date);
  const lst = gmstRad(jd) + lonDeg * DEG;
  const H = lst - aMoon;
  const phi = latDeg * DEG;
  const q = Math.atan2(
    Math.sin(H),
    Math.tan(phi) * Math.cos(dMoon) - Math.sin(dMoon) * Math.cos(H),
  );

  const wrap = (deg: number): number => ((deg % 360) + 360) % 360;
  return {
    phase,
    libration,
    subSolar,
    altitudeDeg: moon.altRad * RAD,
    azimuthDeg: wrap(moon.azRad * RAD),
    aboveHorizon: moon.aboveHorizon,
    brightLimbAngleDeg: wrap(brightLimb * RAD),
    parallacticAngleDeg: q * RAD,
    limbToZenithDeg: wrap((brightLimb - q) * RAD),
  };
}
