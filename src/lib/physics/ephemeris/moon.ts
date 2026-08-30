/**
 * Geocentric Moon position for the sky-pointing AR mode (#393).
 *
 * Compact analytic model (Schlyter, after Brown/Meeus): mean elements + the
 * dozen largest periodic perturbations → geocentric J2000 ecliptic position,
 * good to ~1–2 arc-minutes. The Moon has no ephemeris elsewhere in the app, so
 * this is new. Distance is returned so the alt/az step can apply the Moon's
 * ~0.95° horizontal parallax (topocentric correction).
 */
import { DEG } from './time';
import type { Vec3 } from './planets';

const RAD = 180 / Math.PI;
const EARTH_RADII_TO_AU = 6378.137 / 149_597_870.7;

function sind(deg: number): number {
  return Math.sin(deg * DEG);
}
function cosd(deg: number): number {
  return Math.cos(deg * DEG);
}
function rev(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export interface MoonPos {
  /** Geocentric J2000 ecliptic rectangular position, AU. */
  pos: Vec3;
  /** Earth-centre → Moon distance, AU (for parallax). */
  distanceAu: number;
}

/** Geocentric ecliptic position of the Moon at Julian Day `jd`. */
export function geocentricMoon(jd: number): MoonPos {
  const d = jd - 2451543.5; // Schlyter's epoch (1999-12-31 00:00 UT)

  // Moon mean orbital elements.
  const N = rev(125.1228 - 0.0529538083 * d); // ascending node
  const i = 5.1454;
  const w = rev(318.0634 + 0.1643573223 * d); // arg. of perigee
  const a = 60.2666; // Earth radii
  const e = 0.0549;
  const M = rev(115.3654 + 13.0649929509 * d); // mean anomaly

  // Sun mean elements (for perturbations).
  const Ms = rev(356.047 + 0.9856002585 * d);
  const wSun = 282.9404 + 4.70935e-5 * d;
  const Ls = rev(wSun + Ms); // Sun mean longitude
  const Lm = rev(N + w + M); // Moon mean longitude
  const Dm = rev(Lm - Ls); // mean elongation
  const F = rev(Lm - N); // argument of latitude

  // Eccentric anomaly (iterated once — e is small).
  let E = M + e * RAD * sind(M) * (1 + e * cosd(M));
  E = E - (E - e * RAD * sind(E) - M) / (1 - e * cosd(E));

  // Perifocal → ecliptic (Earth radii).
  const xv = a * (cosd(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * sind(E);
  const v = rev(Math.atan2(yv, xv) * RAD);
  let r = Math.sqrt(xv * xv + yv * yv);

  let lon = rev(
    Math.atan2(
      sind(N) * cosd(v + w) + cosd(N) * sind(v + w) * cosd(i),
      cosd(N) * cosd(v + w) - sind(N) * sind(v + w) * cosd(i),
    ) * RAD,
  );
  let lat = Math.asin(sind(v + w) * sind(i)) * RAD;

  // Longitude perturbations (degrees) — Evection, Variation, Yearly eq., etc.
  lon +=
    -1.274 * sind(M - 2 * Dm) +
    0.658 * sind(2 * Dm) -
    0.186 * sind(Ms) -
    0.059 * sind(2 * M - 2 * Dm) -
    0.057 * sind(M - 2 * Dm + Ms) +
    0.053 * sind(M + 2 * Dm) +
    0.046 * sind(2 * Dm - Ms) +
    0.041 * sind(M - Ms) -
    0.035 * sind(Dm) -
    0.031 * sind(M + Ms) -
    0.015 * sind(2 * F - 2 * Dm) +
    0.011 * sind(M - 4 * Dm);
  // Latitude perturbations.
  lat +=
    -0.173 * sind(F - 2 * Dm) -
    0.055 * sind(M - F - 2 * Dm) -
    0.046 * sind(M + F - 2 * Dm) +
    0.033 * sind(F + 2 * Dm) +
    0.017 * sind(2 * M + F);
  // Distance perturbations (Earth radii).
  r += -0.58 * cosd(M - 2 * Dm) - 0.46 * cosd(2 * Dm);

  const distanceAu = r * EARTH_RADII_TO_AU;
  const cl = cosd(lat);
  return {
    pos: {
      x: distanceAu * cl * cosd(lon),
      y: distanceAu * cl * sind(lon),
      z: distanceAu * sind(lat),
    },
    distanceAu,
  };
}
