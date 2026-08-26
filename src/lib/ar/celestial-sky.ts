// AR night-sky content beyond the Solar System (RFC-041): constellation figures
// and bright named stars, placed on the SAME real sky as the planets. The data
// (constellation-lines.json, named-stars.json) is already in the HYG equatorial
// frame (x = vernal equinox, y = 90° RA, z = north celestial pole), so a vertex's
// direction converts straight to the observer's horizontal frame and then to the
// AR render's ENU direction — reusing the exact pipeline the planets use, no new
// astronomy. Kept out of sky-scene.ts so the coordinate maths are unit-testable.

import { equatorialToHorizontal } from '../astronomy/horizontal';
import { skyDirectionENU } from '../astronomy';

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
