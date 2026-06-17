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
}

export const EPOCH_BANDS: readonly EpochBand[] = [
  { id: 'first-steps', label: 'First Steps', yearStart: 1957, yearEnd: 1961 },
  { id: 'space-race', label: 'Space Race', yearStart: 1961, yearEnd: 1969 },
  { id: 'lunar-era', label: 'Lunar Era', yearStart: 1969, yearEnd: 1972 },
  { id: 'first-stations', label: 'First Stations', yearStart: 1973, yearEnd: 1986 },
  { id: 'shuttle-and-mir', label: 'Shuttle & Mir', yearStart: 1981, yearEnd: 1998 },
  { id: 'iss-assembly', label: 'ISS Assembly', yearStart: 1998, yearEnd: 2011 },
  { id: 'commercial-era', label: 'Commercial Era', yearStart: 2011, yearEnd: 2024 },
  { id: 'lunar-return', label: 'Lunar Return', yearStart: 2024, yearEnd: 2030 },
  // Mars Era — starts at the first planned crewed-Mars / sample-return
  // window per missions/index.json (Starship Mars Crew NET 2031, MMX
  // 2026, etc.). Open-ended; the strip caps the rendered axis at 2040
  // but the band's semantic meaning is "this year and beyond".
  { id: 'mars-era', label: 'Mars Era', yearStart: 2030, yearEnd: 2040 },
];

export const AXIS_MIN = 1957;
export const AXIS_MAX = 2040;

/**
 * Assign a single canonical epoch to a year. First matching band wins
 * (in EPOCH_BANDS order). Returns `null` for years outside the entire
 * range. Used by /missions to count by year-range without needing to
 * tag each mission with an `epoch` field in JSON.
 */
export function epochForYear(year: number): FleetEpoch | null {
  for (const band of EPOCH_BANDS) {
    if (year >= band.yearStart && year < band.yearEnd) return band.id;
  }
  // Past the last band's end — bucket into the final band (Mars Era)
  // so a 2045 mission still counts somewhere instead of vanishing.
  if (year >= EPOCH_BANDS[EPOCH_BANDS.length - 1].yearStart) {
    return EPOCH_BANDS[EPOCH_BANDS.length - 1].id;
  }
  return null;
}
