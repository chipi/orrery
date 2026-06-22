/**
 * Match a numeric altitude (km above surface) to its containing orbital
 * regime from a regimes list (#354 /earth, #355 /moon, #356 /mars).
 *
 * Used by:
 *   - /earth, /moon, /mars +page.svelte: drive the OrbitRuler band
 *     highlight from the currently selected orbiter.
 *   - EarthObjectPanel + SurfaceScene's inline orbiter panel: surface a
 *     regime chip on the panel's chip row that opens the regime panel
 *     when clicked (2026-06-22 user direction — "tag orbiters back to
 *     orbit panels with some chip at top").
 */
import type { OrbitRegime } from '$types/orbit-regime';

export function regimeForAltitude(
  altKm: number | undefined,
  regimes: OrbitRegime[],
): OrbitRegime | null {
  if (altKm == null) return null;
  for (const r of regimes) {
    const a = r.altitude_km;
    if (a == null) continue; // skip distance_au-only regimes
    if (typeof a === 'number') {
      // Single-altitude regimes (GEO, MOON L2, …) — tolerance 50 km so
      // exact-altitude orbits (GEO at 35,786 km) still resolve under
      // small data-source rounding.
      if (Math.abs(altKm - a) < 50) return r;
    } else if (altKm >= a[0] && altKm <= a[1]) {
      return r;
    }
  }
  return null;
}

/** Match by an explicit regime code (`selected.regime` on EarthObject). */
export function regimeById(id: string | undefined, regimes: OrbitRegime[]): OrbitRegime | null {
  if (!id) return null;
  return regimes.find((r) => r.id === id) ?? null;
}
