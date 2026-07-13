/**
 * Heliocentric planet positions for the sky-pointing AR mode (#393).
 *
 * Uses NASA JPL's "Keplerian Elements for Approximate Positions of the Major
 * Planets" (Standish), valid 1800–2050 AD to ~arcminute accuracy — far finer
 * than a hand-held phone can be pointed. Returns J2000 heliocentric ecliptic
 * rectangular coordinates in AU. `earth` is the Earth–Moon barycentre row, used
 * to turn heliocentric → geocentric (planet − earth) and to get the Sun
 * (− earth).
 */
import { centuriesSinceJ2000, DEG } from './time';

export type PlanetId =
  'mercury' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';

// [a, aDot, e, eDot, I, IDot, L, LDot, longPeri(ϖ), ϖDot, longNode(Ω), ΩDot]
// a in AU (+ AU/century); angles in degrees (+ deg/century). J2000 epoch.
const ELEMENTS: Record<PlanetId, number[]> = {
  mercury: [
    0.38709927, 0.00000037, 0.20563593, 0.00001906, 7.00497902, -0.00594749, 252.2503235,
    149472.67411175, 77.45779628, 0.16047689, 48.33076593, -0.12534081,
  ],
  venus: [
    0.72333566, 0.0000039, 0.00677672, -0.00004107, 3.39467605, -0.0007889, 181.9790995,
    58517.81538729, 131.60246718, 0.00268329, 76.67984255, -0.27769418,
  ],
  earth: [
    1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166,
    35999.37244981, 102.93768193, 0.32327364, 0.0, 0.0,
  ],
  mars: [
    1.52371034, 0.00001847, 0.0933941, 0.00007882, 1.84969142, -0.00813131, -4.55343205,
    19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343,
  ],
  jupiter: [
    5.202887, -0.00011607, 0.04838624, -0.00013253, 1.30439695, -0.00183714, 34.39644051,
    3034.74612775, 14.72847983, 0.21252668, 100.47390909, 0.20469106,
  ],
  saturn: [
    9.53667594, -0.0012506, 0.05386179, -0.00050991, 2.48599187, 0.00193609, 49.95424423,
    1222.49362201, 92.59887831, -0.41897216, 113.66242448, -0.28867794,
  ],
  uranus: [
    19.18916464, -0.00196176, 0.04725744, -0.00004397, 0.77263783, -0.00242939, 313.23810451,
    428.48202785, 170.9542763, 0.40805281, 74.01692503, 0.04240589,
  ],
  neptune: [
    30.06992276, 0.00026291, 0.00859048, 0.00005105, 1.77004347, 0.00035372, -55.12002969,
    218.45945325, 44.96476227, -0.32241464, 131.78422574, -0.00508664,
  ],
};

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Solve Kepler's equation E − e·sinE = M (all radians) by Newton iteration. */
function solveKepler(mRad: number, e: number): number {
  let eAnom = mRad + e * Math.sin(mRad);
  for (let i = 0; i < 8; i++) {
    const dE = (eAnom - e * Math.sin(eAnom) - mRad) / (1 - e * Math.cos(eAnom));
    eAnom -= dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  return eAnom;
}

/** Wrap degrees to [-180, 180). */
function wrap180(deg: number): number {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

/**
 * Heliocentric J2000 ecliptic position of a planet (or the Earth–Moon
 * barycentre for `earth`), in AU, at the given Julian Day.
 */
export function heliocentric(id: PlanetId, jd: number): Vec3 {
  const t = centuriesSinceJ2000(jd);
  const el = ELEMENTS[id];
  const a = el[0] + el[1] * t;
  const e = el[2] + el[3] * t;
  const inc = (el[4] + el[5] * t) * DEG;
  const l = el[6] + el[7] * t;
  const peri = el[8] + el[9] * t; // ϖ
  const node = el[10] + el[11] * t; // Ω
  const omega = (peri - node) * DEG; // argument of perihelion ω
  const bigOmega = node * DEG;

  const mRad = wrap180(l - peri) * DEG; // mean anomaly
  const eAnom = solveKepler(mRad, e);

  // Position in the orbital plane (perifocal), AU.
  const xp = a * (Math.cos(eAnom) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(eAnom);

  // Rotate perifocal → J2000 ecliptic (ω, then I, then Ω).
  const cw = Math.cos(omega);
  const sw = Math.sin(omega);
  const cO = Math.cos(bigOmega);
  const sO = Math.sin(bigOmega);
  const ci = Math.cos(inc);
  const si = Math.sin(inc);

  return {
    x: (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp,
    y: (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp,
    z: sw * si * xp + cw * si * yp,
  };
}

/** Geocentric J2000 ecliptic position of a planet, AU (planet − earth). */
export function geocentricPlanet(id: Exclude<PlanetId, 'earth'>, jd: number): Vec3 {
  const p = heliocentric(id, jd);
  const earth = heliocentric('earth', jd);
  return { x: p.x - earth.x, y: p.y - earth.y, z: p.z - earth.z };
}

/** Geocentric J2000 ecliptic position of the Sun, AU (= − earth heliocentric). */
export function geocentricSun(jd: number): Vec3 {
  const earth = heliocentric('earth', jd);
  return { x: -earth.x, y: -earth.y, z: -earth.z };
}
