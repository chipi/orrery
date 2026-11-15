// The sky-finder rows of a deep-sky object's IN THE SKY tab (L42, UXD-049): where it is in the
// constellation figure, which named star is nearest, which months it is best placed, how high it
// climbs from the reader's latitude, and how it is seen. Pure, so each rule is unit-tested; every
// input is the object's own RA / Dec / magnitude, the 62 named stars, or the reader's latitude.
//
// FRAME TRAP: constellation-lines.json and named-stars.json are in the HYG frame (z toward the
// north celestial pole). A deep-sky object's x, y, z in deep-sky-objects.json is in the scene
// frame (y toward the pole): (x, y, z)_scene = (x, z, y)_HYG. Never hand the scene x, y, z to the
// finder; build the direction from RA / Dec with `raDecToHyg`.

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

// Mean-Sun rule: the Sun's RA is 0 h on day 79 (21 March) and advances 24 h in 365.25 days. An
// object culminates near local midnight when the Sun's RA is the object's RA plus 12 h. A
// calendar-month rule, not an ephemeris: a window can be off by a few days.
const EQUINOX_DAY = 79;
const YEAR_DAYS = 365.25;
const NON_LEAP_YEAR_START_MS = Date.UTC(2001, 0, 1);

/** The month (0 = January) in which the object stands opposite the Sun, and the window around it. */
export function bestMonths(raDeg: number): { from: number; mid: number; to: number } {
  const oppositeRa = (((raDeg + 180) % 360) + 360) % 360;
  const day = (EQUINOX_DAY + (oppositeRa / 360) * YEAR_DAYS) % YEAR_DAYS;
  const mid = new Date(NON_LEAP_YEAR_START_MS + Math.floor(day) * 86_400_000).getUTCMonth();
  return { from: (mid + 11) % 12, mid, to: (mid + 1) % 12 };
}

/** The highest altitude in degrees the object reaches from `latDeg` (negative: never rises). */
export function maxAltitude(decDeg: number, latDeg: number): number {
  return 90 - Math.abs(latDeg - decDeg);
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
