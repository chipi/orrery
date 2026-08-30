/**
 * Orbit-insertion (capture) burn resolution (RFC-034 §12) — the ARRIVAL mirror
 * of the launch injection burn (injection-burn.ts). Where the injection burn
 * leaves the departure parking orbit, the orbit-insertion burn is the capture
 * burn an ORBITER fires at the destination to slow into orbit (Mars Orbit
 * Insertion, Venus OI, Saturn OI, Jupiter OI…). It is the cinematic beat /fly
 * plays at the cruise→arrival seam for missions that go into orbit rather than
 * land.
 *
 * Pure resolver: given the destination + the authored
 * `flight.arrival.orbit_insertion_dv_km_s`, it names the burn and the Δv, or
 * returns null when the mission has no capture burn (a lander, a flyby, or an
 * orbiter with no published OI Δv) so the beat is simply absent.
 */

import type { Destination } from '$types/mission';

export interface OrbitInsertionParams {
  /** Long callout wording, e.g. "MARS ORBIT INSERTION". */
  label: string;
  /** Short tag, e.g. "MOI" / "SOI" / "OI". */
  tag: string;
  /** Capture Δv (km·s⁻¹); null when known-orbiter but no Δv is published. */
  dvKms: number | null;
}

/** Per-destination capture-burn wording. Full body word avoids MOI (Mars) vs
 *  MOI (Mercury) ambiguity in the long label; the short tag stays conventional. */
const OI_BY_DEST: Partial<Record<Destination, { label: string; tag: string }>> = {
  MOON: { label: 'LUNAR ORBIT INSERTION', tag: 'LOI' },
  MARS: { label: 'MARS ORBIT INSERTION', tag: 'MOI' },
  VENUS: { label: 'VENUS ORBIT INSERTION', tag: 'VOI' },
  MERCURY: { label: 'MERCURY ORBIT INSERTION', tag: 'MOI' },
  JUPITER: { label: 'JUPITER ORBIT INSERTION', tag: 'JOI' },
  SATURN: { label: 'SATURN ORBIT INSERTION', tag: 'SOI' },
  URANUS: { label: 'URANUS ORBIT INSERTION', tag: 'UOI' },
  NEPTUNE: { label: 'NEPTUNE ORBIT INSERTION', tag: 'NOI' },
  CERES: { label: 'CERES ORBIT INSERTION', tag: 'COI' },
  VESTA: { label: 'VESTA ORBIT INSERTION', tag: 'VOI' },
};

/**
 * Resolve the orbit-insertion burn for a mission, or null when it has none.
 *
 * @param dest      the mission destination (drives the burn wording)
 * @param oiDvKms   the authored `flight.arrival.orbit_insertion_dv_km_s`
 *                  (null/undefined for landers + flybys → no beat)
 */
export function resolveOrbitInsertion(
  dest: Destination | undefined,
  oiDvKms: number | null | undefined,
): OrbitInsertionParams | null {
  // A capture burn only exists when an orbit-insertion Δv is authored — that is
  // the machine-readable "this mission goes INTO orbit" flag (landers + flybys
  // leave it null).
  if (oiDvKms == null || oiDvKms <= 0) return null;
  const w = (dest && OI_BY_DEST[dest]) ?? { label: 'ORBIT INSERTION', tag: 'OI' };
  return { label: w.label, tag: w.tag, dvKms: oiDvKms };
}
