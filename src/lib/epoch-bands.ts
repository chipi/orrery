/**
 * Epoch bands — shared catalogue of historic spaceflight epochs (PRD-012
 * v0.2 §epochs / RFC-016 v0.2 OQ-17).
 *
 * Used by:
 *   - EpochTimelineStrip.svelte (renders the bands)
 *   - /fleet (filters entries by their explicit `epoch` field)
 *   - /missions (filters by year-range membership — missions have no
 *     `epoch` field, only `year`)
 *
 * Year ranges intentionally overlap where two strands ran concurrently
 * (Shuttle program straddles First Stations + ISS Assembly epochs).
 * For routes that need a deterministic single-band assignment per item
 * (e.g. /missions counting by year range), use `epochForYear()` —
 * "first matching band wins" in EPOCH_BANDS order.
 *
 * 2026-06-17 — extracted from EpochTimelineStrip.svelte so /missions
 * could reuse the same band catalogue without dragging in the whole
 * component's $props machinery.
 */

import type { FleetEpoch } from '$types/fleet';

export interface EpochBand {
  id: FleetEpoch;
  label: string;
  yearStart: number;
  yearEnd: number;
  /**
   * Narrative accent colour — picked to evoke each era's identity
   * (Sputnik amber, Cold War red, Apollo gold, Skylab cyan, Mir
   * purple, ISS silver, Falcon teal, Artemis amber, Mars rust). Used
   * by EpochTimelineStrip for hover + active states.
   *
   * Verified WCAG-AA against the dark page background (~#0a0a16) at
   * the 9.5 / 11 px label sizes the strip renders — every hue here
   * has L_relative ≥ 0.30 → contrast ≥ 6:1, well clear of the 4.5:1
   * AA floor for small text.
   */
  color: string;
}

export const EPOCH_BANDS: readonly EpochBand[] = [
  { id: 'first-steps', label: 'First Steps', yearStart: 1957, yearEnd: 1961, color: '#ffd54f' },
  { id: 'space-race', label: 'Space Race', yearStart: 1961, yearEnd: 1969, color: '#ff7d6e' },
  { id: 'lunar-era', label: 'Lunar Era', yearStart: 1969, yearEnd: 1972, color: '#f0a830' },
  {
    id: 'first-stations',
    label: 'First Stations',
    yearStart: 1973,
    yearEnd: 1986,
    color: '#5fc4e0',
  },
  {
    id: 'shuttle-and-mir',
    label: 'Shuttle & Mir',
    yearStart: 1981,
    yearEnd: 1998,
    color: '#b894d0',
  },
  { id: 'iss-assembly', label: 'ISS Assembly', yearStart: 1998, yearEnd: 2011, color: '#a8c0d4' },
  {
    id: 'commercial-era',
    label: 'Commercial Era',
    yearStart: 2011,
    yearEnd: 2024,
    color: '#4ecdc4',
  },
  { id: 'lunar-return', label: 'Lunar Return', yearStart: 2024, yearEnd: 2030, color: '#ffb14e' },
  // Mars Era — starts at the first planned crewed-Mars / sample-return
  // window per missions/index.json (Starship Mars Crew NET 2031, MMX
  // 2026, etc.). Open-ended; the strip caps the rendered axis at 2040
  // but the band's semantic meaning is "this year and beyond".
  { id: 'mars-era', label: 'Mars Era', yearStart: 2030, yearEnd: 2040, color: '#ff8050' },
];

export const AXIS_MIN = 1957;
export const AXIS_MAX = 2040;

/**
 * Assign a single canonical epoch to a year. First matching band wins
 * (in EPOCH_BANDS order), with INCLUSIVE end-year matching so the
 * boundary year falls into the EARLIER band — e.g. 1961 → first-steps
 * (not space-race), 1972 → lunar-era (not first-stations). This
 * mirrors /fleet's editorial assignment of boundary-year entries
 * (baikonur-31-6 / vostok in 1961 → first-steps; r-7 / sputnik
 * 1957 → first-steps; etc.) so /missions buckets the same year in
 * the same band /fleet does.
 *
 * Years outside the entire range fall back to the last band (Mars
 * Era) so a 2045 mission still counts somewhere instead of vanishing.
 *
 * (2026-06-17 user note: "on fleet 1961 is included in first filter
 * why on missions it is not — I would expect to see same on missions".)
 */
export function epochForYear(year: number): FleetEpoch | null {
  for (const band of EPOCH_BANDS) {
    if (year >= band.yearStart && year <= band.yearEnd) return band.id;
  }
  // Past the last band's end — bucket into the final band (Mars Era)
  // so a 2045 mission still counts somewhere instead of vanishing.
  if (year >= EPOCH_BANDS[EPOCH_BANDS.length - 1].yearStart) {
    return EPOCH_BANDS[EPOCH_BANDS.length - 1].id;
  }
  return null;
}
