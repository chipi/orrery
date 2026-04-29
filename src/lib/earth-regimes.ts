import type { EarthObject } from '$types/earth-object';

/**
 * Per-regime altitude bounds derived from the loaded EarthObject set.
 *
 * `/earth` paints a horizontal regime band (LEO/MEO/GEO/HEO/MOON/L2)
 * spanning each regime's min→max altitude. Extracted here so the
 * derivation is unit-testable without spinning up a canvas.
 *
 * Altitude source preference: `altitude_km` (if present), else the
 * mandatory `earth_distance_km`. Matches the rendering code's pick.
 */
export type RegimeBound = { min: number; max: number };

export function deriveRegimeBounds(objects: readonly EarthObject[]): Map<string, RegimeBound> {
  const bounds = new Map<string, RegimeBound>();
  for (const obj of objects) {
    const a = obj.altitude_km ?? obj.earth_distance_km;
    const r = obj.regime;
    const b = bounds.get(r);
    if (!b) bounds.set(r, { min: a, max: a });
    else bounds.set(r, { min: Math.min(b.min, a), max: Math.max(b.max, a) });
  }
  return bounds;
}
