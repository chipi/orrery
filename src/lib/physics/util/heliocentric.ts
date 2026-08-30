/**
 * Heliocentric context — planets as orbits around the Sun (M4 "get to Mars").
 *
 * The location model (`location.ts`) is body-CENTRIC: it answers "orbit around THIS
 * planet". Interplanetary transfer is a different frame — everything orbits the SUN —
 * so this supplies each planet's heliocentric orbit radius + period. The transfer
 * itself reuses the frame-agnostic `hohmannTransfer(r1, r2, µ)` with the Sun's µ; the
 * kernel's frame-independence is the whole point (M2's Hohmann now serves M4 unchanged).
 *
 * Pure. Semi-major axes (AU) are the standard mean values.
 */
import { AU_TO_KM, MU_SUN_KM3_S2 } from './constants';
import { orbitalPeriodS } from '../mechanics/orbits';

/** Planet mean orbital semi-major axis (AU). */
export const HELIO_ORBIT_AU: Record<string, number> = {
  mercury: 0.387,
  venus: 0.723,
  earth: 1.0,
  mars: 1.524,
  jupiter: 5.204,
  saturn: 9.583,
};

export interface HelioModel {
  id: string;
  /** Heliocentric orbit radius (km). */
  orbitRadiusKm: number;
  /** Orbital period around the Sun (s). */
  orbitalPeriodS: number;
}

/** Resolve a planet to its heliocentric orbit, or undefined if not tabulated. */
export function helioModel(planetId: string): HelioModel | undefined {
  const au = HELIO_ORBIT_AU[planetId];
  if (au === undefined) return undefined;
  const orbitRadiusKm = au * AU_TO_KM;
  return {
    id: planetId,
    orbitRadiusKm,
    orbitalPeriodS: orbitalPeriodS(orbitRadiusKm, MU_SUN_KM3_S2),
  };
}

/**
 * Synodic period between two heliocentric orbits (s) — how often the two planets line
 * up again, i.e. how often the transfer launch window recurs. 1/S = |1/T₁ − 1/T₂|.
 */
export function synodicPeriodS(period1S: number, period2S: number): number {
  const diff = Math.abs(1 / period1S - 1 / period2S);
  return diff > 0 ? 1 / diff : Infinity;
}
