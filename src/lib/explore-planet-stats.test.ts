/**
 * Drift-catcher: the PLANET_STATS map (PRD-023 Slice E.4, extracted to
 * `$lib/planet-stats` in the #382 amendment) must cover every planet
 * rendered by /explore and carry no stale planet rows.
 *
 * The tactical-scan overlay reads `PLANET_STATS[id]`; a planet in
 * planets.json without a stats row shows a blank scan. planets.json is
 * the authoritative id source, so we assert against it directly.
 *
 * The map also carries non-planet bodies (the Moon) for the surface
 * Tactical Scan (#382) — those are listed in NON_PLANET_KEYS so the
 * "no stale entries" check ignores them rather than flagging them.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PLANET_STATS } from '$lib/physics/util/planet-stats';

interface PlanetsJson {
  planets: { name: string }[];
}

// Bodies in PLANET_STATS that are intentionally NOT in planets.json —
// satellites added for the surface Tactical Scan (#382).
const NON_PLANET_KEYS = new Set(['moon']);

function planetsJsonIds(): string[] {
  const data = JSON.parse(readFileSync('static/data/planets.json', 'utf8')) as PlanetsJson;
  return data.planets.map((p) => p.name.toLowerCase());
}

describe('PRD-023 Slice E.4 — PLANET_STATS coverage', () => {
  it('covers every planet name in planets.json', () => {
    const missing = planetsJsonIds().filter((id) => !(id in PLANET_STATS));
    expect(
      missing,
      `PLANET_STATS missing entries for: ${missing.join(', ')}. Add them to $lib/planet-stats.`,
    ).toEqual([]);
  });

  it('has no stale planet entries removed from planets.json', () => {
    const ids = new Set(planetsJsonIds());
    const stale = Object.keys(PLANET_STATS).filter(
      (id) => !ids.has(id) && !NON_PLANET_KEYS.has(id),
    );
    expect(stale, `PLANET_STATS has stale entries: ${stale.join(', ')}`).toEqual([]);
  });
});
