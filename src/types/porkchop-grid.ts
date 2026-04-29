import type { DestinationId } from '$lib/lambert-grid.constants';

/**
 * Pre-computed porkchop grid (v0.1.6 / ADR-026). Schema:
 * `static/data/schemas/porkchop.schema.json`. Generated at build by
 * `scripts/precompute-porkchops.ts`; consumed by `/plan` via
 * `$lib/data#getPorkchopGrid`.
 */
export type MissionType = 'LANDING' | 'FLYBY';

export interface PorkchopGrid {
  destination: DestinationId;
  /** Departure-day range [start, end] in days from epoch. */
  dep_range_days: [number, number];
  /** Transfer-time range [start, end] in days. Per-destination
   *  calibration; Mars stays [80, 520] for no-regression. */
  tof_range_days: [number, number];
  /** Grid dimensions [width, height]. Locked to [112, 100] across
   *  destinations so the mobile magnifier (ADR-023) stays valid. */
  steps: [number, number];
  /** Mission types offered for this destination. Inner planets get
   *  both; gas giants FLYBY only (ADR-026 §Mission-type semantics). */
  mission_types: MissionType[];
  /** Per-mission-type ∆v added to each cell when displayed.
   *  FLYBY is always 0; LANDING is destination-specific. */
  dv_orbit_insertion: Partial<Record<MissionType, number>>;
  /** Y-axis tick label unit. ADR-026 §Y-axis units: auto-switch to
   *  years when tof_range_days[1] > 730. */
  tof_axis_unit: 'days' | 'years';
  /** 2D grid of ∆v values, [row][col]. Row = TOF axis, col = dep axis.
   *  Values in km/s; sentinel 28 marks no-solution cells. */
  grid: number[][];
  /** Provenance + how the grid was computed. */
  credit: string;
}
