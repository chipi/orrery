/**
 * Drift-catcher: PRD-023 Slice E.4 PLANET_STATS map must cover every
 * planet rendered by /explore.
 *
 * The tactical-scan overlay reads `focusedStats = PLANET_STATS[id]`.
 * If a new planet entry lands in PLANETS without a matching
 * PLANET_STATS row, the overlay silently shows null (no error, just
 * blank). This unit test asserts the maps stay in sync.
 *
 * The PLANETS array lives inside `src/routes/explore/+page.svelte`,
 * which isn't directly importable from a unit test. Instead we read
 * `static/data/planets.json` — that's the authoritative source of
 * planet ids, and PLANETS in /explore is required to cover it for
 * the panel to load. If planets.json gains a row, both the route's
 * inline PLANETS array AND PLANET_STATS need to learn about it; the
 * inline-array drift is caught by `src/lib/data.test.ts`, the stats
 * drift is caught here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

interface PlanetsJson {
  planets: { name: string }[];
}

// Mirror of the PLANET_STATS keys from src/routes/explore/+page.svelte.
// This file is the contract: if a planet is added to planets.json,
// update both this list AND the inline PLANET_STATS map in /explore.
const PLANET_STATS_IDS = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
];

describe('PRD-023 Slice E.4 — PLANET_STATS coverage', () => {
  it('PLANET_STATS_IDS covers every planet name in planets.json', () => {
    const data = JSON.parse(readFileSync('static/data/planets.json', 'utf8')) as PlanetsJson;
    const planetsJsonIds = data.planets.map((p) => p.name.toLowerCase());
    const missing = planetsJsonIds.filter((id) => !PLANET_STATS_IDS.includes(id));
    expect(
      missing,
      `PLANET_STATS missing entries for: ${missing.join(', ')}. Add them to /explore PLANET_STATS map AND to PLANET_STATS_IDS in this test.`,
    ).toEqual([]);
  });

  it('PLANET_STATS_IDS does not contain stale entries removed from planets.json', () => {
    const data = JSON.parse(readFileSync('static/data/planets.json', 'utf8')) as PlanetsJson;
    const planetsJsonIds = new Set(data.planets.map((p) => p.name.toLowerCase()));
    const stale = PLANET_STATS_IDS.filter((id) => !planetsJsonIds.has(id));
    expect(stale, `PLANET_STATS has stale entries: ${stale.join(', ')}`).toEqual([]);
  });
});
