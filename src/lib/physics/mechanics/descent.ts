/**
 * Powered-descent Δv — the first-principles landing model (M3 "land on the Moon").
 *
 * To soft-land from orbit you cancel your orbital speed with a braking burn while
 * gravity fights you. Model it as a constant-thrust burn decelerating from v_orbit to
 * rest: the engine gives a = TWR·g, gravity takes g, so the net deceleration is
 * (TWR−1)·g and the burn lasts t = v_orbit/((TWR−1)·g). The Δv the engine must deliver
 * is a·t, which reduces to
 *   Δv = v_orbit · TWR / (TWR − 1)
 * — no arbitrary burn time, and g cancels. The gravity loss is v_orbit/(TWR−1): a
 * high-thrust burn is nearly loss-free (Δv → v_orbit); as TWR → 1 the loss diverges
 * (you can't out-thrust gravity, so you never stop — you crash). Ties the descent to
 * the TWR rung the goal already computes.
 *
 * Assumes a constant-thrust vertical braking burn, no atmosphere/lift (the honesty
 * line names it). The full trajectory integrator (`physics/descent/`) is the /fly
 * sim's; this is the teaching rung. Pure.
 */

/**
 * Powered-descent Δv to soft-land from orbit (km/s). Returns Infinity for TWR ≤ 1 —
 * an engine that can't out-thrust gravity can never null the fall.
 * @param vOrbitKms  orbital speed to cancel at the start of descent (km/s)
 * @param twr        thrust-to-weight ratio of the lander in the local gravity
 */
export function poweredDescentDvKms(vOrbitKms: number, twr: number): number {
  if (twr <= 1) return Infinity;
  return (vOrbitKms * twr) / (twr - 1);
}
