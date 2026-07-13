/**
 * Time + Earth-orientation primitives for the sky-pointing AR mode (#393).
 *
 * Pure functions, no dependencies — the base of the alt/az pipeline. All angles
 * are radians unless a name ends in `Deg`. Precision target: a few arc-minutes
 * over 1900–2100, which is far finer than a phone can be pointed.
 */

const DEG = Math.PI / 180;
const J2000 = 2451545.0; // Julian Day of the J2000.0 epoch (2000-01-01 12:00 TT)

/** Julian Day (UTC) for a JS Date. (TT−UTC ≈ 69 s is negligible here.) */
export function julianDay(date: Date): number {
  return date.getTime() / 86_400_000 + 2440587.5;
}

/** Julian centuries since J2000.0. */
export function centuriesSinceJ2000(jd: number): number {
  return (jd - J2000) / 36525;
}

/** Greenwich Mean Sidereal Time, radians in [0, 2π). IAU 1982 series. */
export function gmstRad(jd: number): number {
  const d = jd - J2000;
  const t = d / 36525;
  let deg = 280.46061837 + 360.98564736629 * d + 0.000387933 * t * t - (t * t * t) / 38_710_000;
  deg = ((deg % 360) + 360) % 360;
  return deg * DEG;
}

/** Local Apparent (≈ Mean) Sidereal Time, radians. East longitude positive. */
export function lstRad(jd: number, lonRad: number): number {
  const l = gmstRad(jd) + lonRad;
  return ((l % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
}

/** Mean obliquity of the ecliptic, radians (IAU 1980). */
export function meanObliquityRad(jd: number): number {
  const t = centuriesSinceJ2000(jd);
  const deg = 23.439291 - 0.0130042 * t - 1.64e-7 * t * t + 5.04e-7 * t * t * t;
  return deg * DEG;
}

export { J2000, DEG };
