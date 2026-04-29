/**
 * Convert a calendar date string (YYYY-MM-DD) into a "simulation day"
 * — an integer day-count from a fixed epoch — so the /fly route can
 * compute an Earth/Mars phase that matches the mission's actual
 * launch window.
 *
 * Epoch: 2000-01-01. Earth/Mars phase functions (`earthPos`,
 * `marsPos` in $lib/mission-arc) are circular-orbit approximations
 * that take a day-count and return a heliocentric position. They
 * don't care which epoch you use as long as you use the same one
 * consistently. 2000-01-01 is the conventional J2000 reference and
 * keeps day-counts in a sensible range for all the historical
 * missions in the data set (1957 → present → 2030+).
 *
 * Returns `null` for unparseable input — caller falls back to the
 * scenario's hardcoded dep_day.
 */
const EPOCH_MS = Date.UTC(2000, 0, 1); // 2000-01-01T00:00:00Z
const MS_PER_DAY = 86_400_000;

export function dateToSimDay(date: string | undefined): number | null {
  if (!date) return null;
  // Accept YYYY-MM-DD; reject everything else so we don't silently
  // misparse a partial string.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return null;
  const [, y, mo, d] = m;
  const ms = Date.UTC(Number(y), Number(mo) - 1, Number(d));
  if (Number.isNaN(ms)) return null;
  return Math.round((ms - EPOCH_MS) / MS_PER_DAY);
}
