/**
 * Orbital mechanics — circular velocity, vis-viva, Hohmann transfer (M2 · RFC-037
 * "reach the Moon"). The geocentric learning-kernel rungs that carry a learner from
 * "in orbit" to "at the Moon". Two-body, coplanar, impulsive burns; no plane change,
 * no finite-burn or gravity losses (the honesty line names these assumptions).
 *
 * Pure; µ is passed IN (km³/s²) so the same functions serve any primary (Earth,
 * Moon, …) — matching how `mechanics/kinematics` takes `g` rather than assuming Earth.
 *
 * `visVivaKms` here is the ONE canonical vis-viva for the kernel (µ passed in, any
 * primary). The old AU/yr-locked `transfer/orbital.visViva` was test-only dead code and
 * has been removed (M2 MINOR-1); its NASA/Curtis reference checks moved onto this fn in
 * `transfer/orbital.test.ts`. The /fly trajectory sim still carries its OWN inline vis-viva
 * in `transfer/mission-arc.ts` (AU³/yr² · AUPYR_TO_KMS) — folding THAT onto this helper is a
 * separate, deliberate /fly refactor, out of scope here.
 */

/** Circular orbital speed at radius r: v = √(µ/r). */
export function circularVelocityKms(radiusKm: number, muKm3s2: number): number {
  return Math.sqrt(muKm3s2 / radiusKm);
}

/**
 * Escape speed at radius r from a primary of µ: v = √(2µ/r) = √2·v_circular (M6
 * "leave the solar system"). Serves any primary — the Sun (µ_sun, r in km) gives the
 * ~42 km/s solar-escape speed at 1 AU that Voyager had to reach.
 */
export function escapeVelocityKms(radiusKm: number, muKm3s2: number): number {
  return Math.SQRT2 * circularVelocityKms(radiusKm, muKm3s2);
}

/** Vis-viva: speed at radius r on an orbit of semi-major axis a: v = √(µ(2/r − 1/a)). */
export function visVivaKms(rKm: number, aKm: number, muKm3s2: number): number {
  return Math.sqrt(muKm3s2 * (2 / rKm - 1 / aKm));
}

/** Orbital period T = 2π√(a³/µ) (seconds). */
export function orbitalPeriodS(aKm: number, muKm3s2: number): number {
  return 2 * Math.PI * Math.sqrt(aKm ** 3 / muKm3s2);
}

export interface HohmannResult {
  /** Semi-major axis of the transfer ellipse (km). */
  aTransferKm: number;
  /** First burn Δv at r1 — the departure burn onto the transfer ellipse (km/s). */
  dv1Kms: number;
  /** Second burn Δv at r2 — circularise into the target orbit (km/s). */
  dv2Kms: number;
  /** Total transfer Δv = |dv1| + |dv2| (km/s). */
  totalKms: number;
  /** Transfer time = half the transfer-ellipse period (s). */
  tofS: number;
}

/**
 * Hohmann two-burn transfer between coplanar circular orbits r1 → r2 (either
 * direction — `abs` handles raising or lowering).
 * @param r1Km     starting circular-orbit radius (km)
 * @param r2Km     target circular-orbit radius (km)
 * @param muKm3s2  primary's µ (km³/s²)
 */
export function hohmannTransfer(r1Km: number, r2Km: number, muKm3s2: number): HohmannResult {
  const aTransferKm = (r1Km + r2Km) / 2;
  const v1Circ = circularVelocityKms(r1Km, muKm3s2);
  const v2Circ = circularVelocityKms(r2Km, muKm3s2);
  const vDepart = visVivaKms(r1Km, aTransferKm, muKm3s2); // speed at r1 on the transfer ellipse
  const vArrive = visVivaKms(r2Km, aTransferKm, muKm3s2); // speed at r2 on the transfer ellipse
  const dv1Kms = Math.abs(vDepart - v1Circ);
  const dv2Kms = Math.abs(v2Circ - vArrive);
  return {
    aTransferKm,
    dv1Kms,
    dv2Kms,
    totalKms: dv1Kms + dv2Kms,
    tofS: 0.5 * orbitalPeriodS(aTransferKm, muKm3s2),
  };
}
