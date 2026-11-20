// The sky-finder rows of a deep-sky object's IN THE SKY tab (L42, UXD-049): where it is in the
// constellation figure, which named star is nearest, which months it is best placed, how high it
// climbs from the reader's latitude, and how it is seen. Pure, so each rule is unit-tested; every
// input is the object's own RA / Dec / magnitude, the 62 named stars, the JPL Horizons Sun table
// (static/data/universe/sun-ephemeris.json) or the reader's latitude.
//
// FRAME TRAP: constellation-lines.json and named-stars.json are in the HYG frame (z toward the
// north celestial pole). A deep-sky object's x, y, z in deep-sky-objects.json is in the scene
// frame (y toward the pole): (x, y, z)_scene = (x, z, y)_HYG. Never hand the scene x, y, z to the
// finder; build the direction from RA / Dec with `raDecToHyg`.

import { precessEquatorialJ2000ToDate } from '../physics/ephemeris/horizontal';
import { julianDay } from '../physics/ephemeris/time';

export type Vec3 = readonly [number, number, number];

const DEG = Math.PI / 180;

/** The unit direction of an RA / Dec (degrees) in the HYG frame. */
export function raDecToHyg(raDeg: number, decDeg: number): Vec3 {
  const a = raDeg * DEG;
  const d = decDeg * DEG;
  return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
}

/** The angle in degrees between two directions (any length, not zero). */
export function angularSeparationDeg(a: Vec3, b: Vec3): number {
  const la = Math.hypot(a[0], a[1], a[2]);
  const lb = Math.hypot(b[0], b[1], b[2]);
  if (la === 0 || lb === 0) return NaN;
  const c = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb);
  return Math.acos(Math.max(-1, Math.min(1, c))) / DEG;
}

/** The named star nearest to `dir` (HYG frame), or null when none lies within `maxDeg`. */
export function nearestNamedStar<T extends { x: number; y: number; z: number }>(
  dir: Vec3,
  stars: readonly T[],
  maxDeg = 15,
): { star: T; sepDeg: number } | null {
  let best: { star: T; sepDeg: number } | null = null;
  for (const star of stars) {
    const sepDeg = angularSeparationDeg(dir, [star.x, star.y, star.z]);
    if (Number.isFinite(sepDeg) && (best === null || sepDeg < best.sepDeg)) best = { star, sepDeg };
  }
  return best && best.sepDeg <= maxDeg ? best : null;
}

// WELL PLACED, from the JPL Horizons Sun (static/data/universe/sun-ephemeris.json, UXD-049): on a
// night the object scores the hours in which it stands at least minAltDeg above the horizon
// (apparent altitude, refraction included) while the Sun is more than 18 degrees below it
// (astronomical darkness); a month is well placed when its nights average minHours of them. The
// latitude is the reader's. Night by night the Sun's own RA / Dec of that date is read from the
// table; the object is the catalogue's J2000 position precessed to the table's mid-year (a shift
// of up to 0.4 degree in RA and 0.15 degree in Dec).
export const WELL_PLACED = { minAltDeg: 20, sunBelowDeg: -18, minHours: 4 } as const;

/** The Sun's apparent RA / Dec (degrees, of date), one entry per day from 1 January 2026, 00:00 UT. */
export interface SunEphemeris {
  ra_deg: readonly number[];
  dec_deg: readonly number[];
}

const EPHEMERIS_EPOCH_JD = julianDay(new Date(Date.UTC(2026, 6, 2)));
const NIGHT_SAMPLES = 144; // one every 10 minutes of solar time
const MONTH_OF_DAY = Array.from({ length: 366 }, (_, i) =>
  new Date(Date.UTC(2026, 0, 1 + i)).getUTCMonth(),
);

/** An RA / Dec (degrees, J2000) precessed to the equator and equinox of the ephemeris year. */
export function toDate(raDeg: number, decDeg: number): { ra: number; dec: number } {
  const [x, y, z] = raDecToHyg(raDeg, decDeg);
  const p = precessEquatorialJ2000ToDate({ x, y, z }, EPHEMERIS_EPOCH_JD);
  return {
    ra: (((Math.atan2(p.y, p.x) / DEG) % 360) + 360) % 360,
    dec: Math.asin(Math.max(-1, Math.min(1, p.z / Math.hypot(p.x, p.y, p.z)))) / DEG,
  };
}

/**
 * The refraction in degrees at a true altitude (Saemundsson 1986, Meeus 16.4: 1010 hPa, 10 C),
 * 0 near the zenith and for a body well below the horizon (it is not seen there anyway).
 */
export function refractionDeg(trueAltDeg: number): number {
  if (!Number.isFinite(trueAltDeg) || trueAltDeg < -1) return 0;
  const arcmin = 1.02 / Math.tan((trueAltDeg + 10.3 / (trueAltDeg + 5.11)) * DEG);
  return Math.max(0, arcmin) / 60;
}

/**
 * Per day of the table, the hours that night in which the object (an RA / Dec of date) stands
 * at least 20 degrees up while the Sun is below -18 degrees. The night is sampled every ten
 * minutes of solar time around the Sun's own position of that day.
 */
export function nightHours(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  sun: SunEphemeris,
): number[] {
  const sinLat = Math.sin(latDeg * DEG);
  const cosLat = Math.cos(latDeg * DEG);
  const sinDec = Math.sin(decDeg * DEG);
  const cosDec = Math.cos(decDeg * DEG);
  const sinDark = Math.sin(WELL_PLACED.sunBelowDeg * DEG);
  const sinUp = Math.sin((WELL_PLACED.minAltDeg - refractionDeg(WELL_PLACED.minAltDeg)) * DEG);
  const hoursPerSample = 24 / NIGHT_SAMPLES;
  return sun.ra_deg.map((raSun, d) => {
    const decSun = sun.dec_deg[d] * DEG;
    const sinSunBase = sinLat * Math.sin(decSun);
    const cosSun = cosLat * Math.cos(decSun);
    let n = 0;
    for (let k = 0; k < NIGHT_SAMPLES; k++) {
      const hSun = ((k + 0.5) / NIGHT_SAMPLES) * 2 * Math.PI;
      if (sinSunBase + cosSun * Math.cos(hSun) >= sinDark) continue;
      const hObj = hSun + (raSun - raDeg) * DEG;
      if (sinLat * sinDec + cosLat * cosDec * Math.cos(hObj) >= sinUp) n++;
    }
    return n * hoursPerSample;
  });
}

/** The average of `nightHours` over each month of the year (January first). */
export function monthlyNightHours(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  sun: SunEphemeris,
): number[] {
  const sum = new Array<number>(12).fill(0);
  const days = new Array<number>(12).fill(0);
  nightHours(raDeg, decDeg, latDeg, sun).forEach((h, d) => {
    sum[MONTH_OF_DAY[d]] += h;
    days[MONTH_OF_DAY[d]]++;
  });
  return sum.map((s, m) => (days[m] ? s / days[m] : 0));
}

export type MonthWindow = { from: number; mid: number; to: number };

/**
 * The window of well-placed months in twelve monthly averages of dark hours above 20 degrees:
 * the month with the most, and the run of months around it that average at least four. Null
 * when no month reaches four hours.
 */
export function windowOfMonthlyHours(hours: readonly number[]): MonthWindow | null {
  let mid = 0;
  for (let m = 1; m < 12; m++) if (hours[m] > hours[mid]) mid = m;
  if (hours[mid] < WELL_PLACED.minHours) return null;
  if (hours.every((h) => h >= WELL_PLACED.minHours)) return { from: 0, mid, to: 11 };
  let from = mid;
  let to = mid;
  for (let i = 0; i < 11 && hours[(from + 11) % 12] >= WELL_PLACED.minHours; i++) {
    from = (from + 11) % 12;
  }
  for (let i = 0; i < 11 && hours[(to + 1) % 12] >= WELL_PLACED.minHours; i++) {
    if ((to + 1) % 12 === from) break;
    to = (to + 1) % 12;
  }
  return { from, mid, to };
}

/**
 * The BEST MONTHS row (UXD-049; rule changed 2026-11-19, search backlog P1): the months in which
 * the object stands opposite the Sun, so it is highest around midnight: the Sun's RA on the 15th
 * of the month within `oppositionDeg` (3 h) of the object's RA + 180 degrees. Shown only where the
 * object climbs at least `minAltDeg` from the reader's latitude. The observing guides' convention;
 * the dark-hours measure above put summer objects in winter from 45 N up, where summer nights have
 * no astronomical darkness (M13 "Feb-Apr" at 52 N). `nightHours` / `windowOfMonthlyHours` stay for
 * scripts/check-sky-rows-ephemeris.ts, which validates the ephemeris and geometry against Horizons.
 */
export const BEST_MONTHS = { minAltDeg: 20, oppositionDeg: 45 } as const;
const MID_MONTH_DAY = Array.from({ length: 12 }, (_, m) =>
  Math.round((Date.UTC(2026, m, 15) - Date.UTC(2026, 0, 1)) / 86_400_000),
);

/**
 * The months (0 = January) in which the object (an RA / Dec of date) is best placed from
 * `latDeg`. Null when it never climbs `BEST_MONTHS.minAltDeg` from there.
 */
export function bestMonths(
  raDeg: number,
  decDeg: number,
  latDeg: number,
  sun: SunEphemeris,
): MonthWindow | null {
  if (maxAltitude(decDeg, latDeg) < BEST_MONTHS.minAltDeg) return null;
  const off = MID_MONTH_DAY.map((d) => {
    const x = (((sun.ra_deg[d] - raDeg - 180) % 360) + 360) % 360;
    return Math.min(x, 360 - x);
  });
  let mid = 0;
  for (let m = 1; m < 12; m++) if (off[m] < off[mid]) mid = m;
  let from = mid;
  let to = mid;
  while (off[(from + 11) % 12] <= BEST_MONTHS.oppositionDeg) from = (from + 11) % 12;
  while (off[(to + 1) % 12] <= BEST_MONTHS.oppositionDeg) to = (to + 1) % 12;
  return { from, mid, to };
}

/**
 * The highest altitude in degrees the object (a declination of date) reaches from `latDeg`, as
 * seen through the air: 90 - |latitude - dec| plus refraction (negative: never rises).
 */
export function maxAltitude(decDeg: number, latDeg: number): number {
  const geometric = 90 - Math.abs(latDeg - decDeg);
  return geometric + refractionDeg(geometric);
}

export type AltitudeBand = 'high' | 'low' | 'never';

/** high: over 60 degrees; low: under 20; never rises: 0 or less; the middle says nothing (null). */
export function altitudeBand(maxAltDeg: number): AltitudeBand | null {
  if (!Number.isFinite(maxAltDeg)) return null;
  if (maxAltDeg <= 0) return 'never';
  if (maxAltDeg > 60) return 'high';
  if (maxAltDeg < 20) return 'low';
  return null;
}

export type EyeBand = 'naked' | 'binoculars' | 'telescope';

/** A magnitude rule, not a promise: at most 6 naked eye, up to 9 binoculars, above that a telescope. */
export function eyeBand(mag: number | null | undefined): EyeBand | null {
  if (mag === null || mag === undefined || !Number.isFinite(mag)) return null;
  if (mag <= 6) return 'naked';
  if (mag <= 9) return 'binoculars';
  return 'telescope';
}

/** The merged vertices of every figure entry of a constellation code (Serpens has two parts). */
export function figureVertices(
  all: readonly { con: string; vertices: number[] }[],
  con: string,
): number[] | null {
  const parts = all.filter((c) => c.con === con);
  if (parts.length === 0) return null;
  return parts.length === 1 ? parts[0].vertices : parts.flatMap((c) => c.vertices);
}

/** "5h 35m" from a right ascension in degrees (rounded to the minute, 24 h wraps to 0). */
export function formatRa(raDeg: number): string {
  const totalMin = Math.round(((((raDeg % 360) + 360) % 360) / 15) * 60) % (24 * 60);
  return `${Math.floor(totalMin / 60)}h ${String(totalMin % 60).padStart(2, '0')}m`;
}

/** "+42°" / "−5°" from a declination in degrees, whole degrees, a true minus sign. */
export function formatDec(decDeg: number): string {
  const r = Math.round(decDeg);
  return `${r < 0 ? '−' : r > 0 ? '+' : ''}${Math.abs(r)}°`;
}
