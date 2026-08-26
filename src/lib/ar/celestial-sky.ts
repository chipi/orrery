// AR night-sky content beyond the Solar System (RFC-041): constellation figures
// and bright named stars, placed on the SAME real sky as the planets. The data
// (constellation-lines.json, named-stars.json) is already in the HYG equatorial
// frame (x = vernal equinox, y = 90° RA, z = north celestial pole), so a vertex's
// direction converts straight to the observer's horizontal frame and then to the
// AR render's ENU direction — reusing the exact pipeline the planets use, no new
// astronomy. Kept out of sky-scene.ts so the coordinate maths are unit-testable.

import { equatorialToHorizontal } from '../astronomy/horizontal';
import { skyDirectionENU, skyPosition } from '../astronomy';

// Stars/constellations are effectively at infinity; a huge distance makes the
// topocentric-parallax term in equatorialToHorizontal vanish (as it should).
const FAR_AU = 1e12;

/**
 * Equatorial cartesian (any magnitude; HYG frame) → the AR render's ENU direction
 * `[East, Up, −North]` for an observer at `latRad`/`lonRad` (east-positive) at
 * Julian Day `jd`. Only the direction of `(x,y,z)` matters — it is normalised, so
 * the display-sphere radius the data was baked at is irrelevant.
 */
export function equatorialXyzToSkyDir(
  x: number,
  y: number,
  z: number,
  jd: number,
  latRad: number,
  lonRad: number,
): [number, number, number] {
  const r = Math.hypot(x, y, z) || 1;
  const raRad = Math.atan2(y, x);
  const decRad = Math.asin(Math.max(-1, Math.min(1, z / r)));
  return skyDirectionENU(
    equatorialToHorizontal({ raRad, decRad, distanceAu: FAR_AU }, jd, latRad, lonRad),
  );
}

/** A Sun horizon event — where the Sun crosses the horizon today (#488). `dir`
 *  is the render-frame ENU unit direction at the crossing (alt ≈ 0), so a marker
 *  placed at `dir·R` sits right on the horizon ring at the rise/set azimuth. */
export interface SunHorizonEvent {
  kind: 'sunrise' | 'sunset';
  /** Azimuth of the crossing, radians (0 = north, clockwise). */
  azRad: number;
  dir: [number, number, number];
}

/**
 * Find today's sunrise + sunset azimuths for an observer, by scanning the Sun's
 * altitude across a 24 h window centred on `date` and refining each horizon
 * crossing by bisection. Returns at most one of each kind (the nearest in the
 * window); empty in polar day/night when the Sun never crosses the horizon.
 */
export function sunRiseSetEvents(
  date: Date,
  latDeg: number,
  lonDeg: number,
): SunHorizonEvent[] {
  const STEP_MIN = 10;
  const HALF_WINDOW_MIN = 12 * 60;
  const t0 = date.getTime() - HALF_WINDOW_MIN * 60_000;
  const altAt = (ms: number): number =>
    skyPosition('sun', new Date(ms), latDeg, lonDeg).altRad;

  const events: SunHorizonEvent[] = [];
  let prevMs = t0;
  let prevAlt = altAt(t0);
  const steps = (2 * HALF_WINDOW_MIN) / STEP_MIN;
  for (let i = 1; i <= steps; i++) {
    const ms = t0 + i * STEP_MIN * 60_000;
    const alt = altAt(ms);
    if (prevAlt === 0 || Math.sign(alt) !== Math.sign(prevAlt)) {
      const rising = alt > prevAlt;
      const kind = rising ? 'sunrise' : 'sunset';
      if (!events.some((e) => e.kind === kind)) {
        // Bisect the [prevMs, ms] bracket to the horizon crossing.
        let lo = prevMs;
        let hi = ms;
        let loAlt = prevAlt;
        for (let b = 0; b < 24; b++) {
          const mid = (lo + hi) / 2;
          const midAlt = altAt(mid);
          if (Math.sign(midAlt) === Math.sign(loAlt)) {
            lo = mid;
            loAlt = midAlt;
          } else {
            hi = mid;
          }
        }
        const pos = skyPosition('sun', new Date((lo + hi) / 2), latDeg, lonDeg);
        events.push({
          kind,
          azRad: pos.azRad,
          dir: skyDirectionENU({ altRad: 0, azRad: pos.azRad }),
        });
      }
    }
    prevMs = ms;
    prevAlt = alt;
    if (events.length === 2) break;
  }
  return events;
}

/** One constellation figure: `con` code + a flat `vertices` list in HYG equatorial
 *  cartesian, in THREE.LineSegments layout (every 2 points = one drawn segment). */
export interface ConstellationFigure {
  con: string;
  vertices: number[];
}

/** A bright named star (subset of named-stars.json needed for the AR sky). */
export interface BrightStar {
  id: string;
  proper: string;
  mag: number;
  x: number;
  y: number;
  z: number;
}

/** Fetch the constellation figure lines (static/data/universe). Mirrors the
 *  neighborhood loader but self-contained so the AR chunk doesn't pull the whole
 *  neighborhood scene. Resolves to [] on any failure (the layer just stays empty). */
export async function loadConstellationFigures(
  base = '',
  fetchFn: typeof fetch = fetch,
): Promise<ConstellationFigure[]> {
  try {
    const doc = (await (
      await fetchFn(`${base}/data/universe/constellation-lines.json`)
    ).json()) as {
      constellations?: ConstellationFigure[];
    };
    return doc.constellations ?? [];
  } catch {
    return [];
  }
}

/** A deep-sky object (nebula / galaxy / cluster) for the AR sky (#488). */
export interface DeepSkyObject {
  id: string;
  name: string;
  category: string;
  mag: number;
  x: number;
  y: number;
  z: number;
}

/** Fetch the deep-sky objects (static/data/universe/deep-sky-objects.json).
 *  Drops the `star` category (we already have the bright-star layer) + any entry
 *  without a usable position. Resolves to [] on failure. */
export async function loadDeepSky(
  base = '',
  fetchFn: typeof fetch = fetch,
): Promise<DeepSkyObject[]> {
  try {
    const doc = (await (
      await fetchFn(`${base}/data/universe/deep-sky-objects.json`)
    ).json()) as { objects?: Partial<DeepSkyObject>[] };
    return (doc.objects ?? [])
      .filter(
        (o): o is DeepSkyObject =>
          o.category !== 'star' &&
          typeof o.x === 'number' &&
          typeof o.y === 'number' &&
          typeof o.z === 'number',
      )
      .map((o) => ({
        id: String(o.id ?? ''),
        name: String(o.name ?? o.id ?? ''),
        category: String(o.category ?? 'other'),
        mag: typeof o.mag === 'number' ? o.mag : 6,
        x: o.x,
        y: o.y,
        z: o.z,
      }));
  } catch {
    return [];
  }
}

/** Fetch the bright named stars (static/data/universe/named-stars.json). Keeps
 *  only what the sky renderer needs; resolves to [] on failure. */
export async function loadBrightStars(
  base = '',
  fetchFn: typeof fetch = fetch,
): Promise<BrightStar[]> {
  try {
    const doc = (await (await fetchFn(`${base}/data/universe/named-stars.json`)).json()) as {
      stars?: Partial<BrightStar>[];
    };
    const raw = doc.stars ?? [];
    return raw
      .filter(
        (s): s is BrightStar =>
          typeof s.x === 'number' &&
          typeof s.y === 'number' &&
          typeof s.z === 'number' &&
          typeof s.mag === 'number',
      )
      .map((s) => ({
        id: String(s.id ?? s.proper ?? ''),
        proper: String(s.proper ?? ''),
        mag: s.mag,
        x: s.x,
        y: s.y,
        z: s.z,
      }));
  } catch {
    return [];
  }
}
