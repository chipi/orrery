/**
 * Powered-descent Δv — the first-principles landing model (M3 "land on the Moon").
 *
 * To soft-land from orbit you do two things, and both cost Δv: cancel the orbital
 * speed you're carrying, and hold yourself up against gravity through the braking
 * burn. The honest first-order sum:
 *   Δv = v_orbit + g·t_burn
 * — a constant-g gravity-loss model with no atmosphere or aerodynamic braking (true
 * for the airless Moon; the honesty line names the assumptions). The full entry-
 * descent-landing integrator (`physics/descent/`) is the /fly sim's machinery; this
 * is the teaching rung.
 *
 * Pure; g is passed in (m/s²) so it lands on any body (the location model supplies it).
 */

/**
 * Powered-descent Δv to soft-land from orbit (km/s).
 * @param vOrbitKms  orbital speed to cancel at the start of descent (km/s)
 * @param gMs2       surface gravity (m/s²)
 * @param burnTimeS  powered-descent (braking) duration (s)
 */
export function poweredDescentDvKms(vOrbitKms: number, gMs2: number, burnTimeS: number): number {
  return vOrbitKms + (gMs2 * burnTimeS) / 1000;
}
