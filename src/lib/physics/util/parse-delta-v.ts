/**
 * Best-effort numeric parse of a `Mission.delta_v` string field.
 *
 * The mission JSON schema enforces the format
 * `^~?\\d+(\\.\\d+)?\\s*km/s(\\s*\\([^)]+\\))?$` (see
 * `static/data/schemas/mission.schema.json`), so any string we see at
 * runtime is one of: "~6.1 km/s", "6.1 km/s", "~13 km/s", "~6 km/s
 * (round trip)", etc. Matched data passes through cleanly.
 *
 * Pass through `fallback` for the value to use when:
 *   - the string is missing entirely (some legacy paths pre-validation)
 *   - the regex still doesn't match (defence in depth — the schema
 *     should have caught it, but this helper is the last line)
 *
 * Returns a positive finite number on success, the fallback otherwise.
 */
export function parseDeltaV(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const match = raw.match(/[0-9]+(?:\.[0-9]+)?/);
  if (!match) return fallback;
  const value = parseFloat(match[0]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
