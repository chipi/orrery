/**
 * Greenwich Mean Sidereal Time (GMST) approximation for orienting a
 * static Earth backdrop "as it looks right now" at page load.
 *
 * Used by /iss and /tiangong (issue #317) so the Earth sphere behind
 * the station shows the correct hemisphere relative to the current
 * UTC time — page reload at 09:00 UTC sees Europe facing the camera,
 * reload at 21:00 UTC sees the Americas.
 *
 * No external dependencies. ~1° accuracy — plenty for a visual
 * backdrop where the actual scientific reading is "Earth rotates."
 *
 * Formula source: Vallado, "Fundamentals of Astrodynamics and
 * Applications" 4e (eq 3-44) — first-order GMST approximation
 * (omitting nutation + EoE terms below the 1° threshold).
 */

const J2000_EPOCH_MS = Date.UTC(2000, 0, 1, 12, 0, 0); // 2000-01-01T12:00:00 UTC
const MS_PER_DAY = 86_400_000;

/**
 * Return GMST in radians for the given UTC time (defaults to now).
 * Range: [0, 2π). Multiply by 12/π to get GMST in hours.
 */
export function gmstRadians(now: Date = new Date()): number {
  const daysSinceJ2000 = (now.getTime() - J2000_EPOCH_MS) / MS_PER_DAY;
  // GMST in hours, mod 24
  const gmstHours = (18.697374558 + 24.06570982441908 * daysSinceJ2000) % 24;
  const positiveHours = gmstHours < 0 ? gmstHours + 24 : gmstHours;
  // Hours → radians (24h = 2π)
  return (positiveHours * Math.PI) / 12;
}
