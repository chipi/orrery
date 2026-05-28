/**
 * Per-mission cislunar phase + event helpers (GH #107).
 *
 * Pure functions consumed by `/fly` and unit-tested in isolation
 * (parallel to cislunar-geometry.ts per ADR-030):
 *
 *  - `currentPhaseFor(met_days, profile)` — which cislunar phase is the
 *    spacecraft in at this MET? Returns the phase object (with
 *    start_met_days / end_met_days) or null if MET is outside any
 *    phase's range.
 *  - `currentEventFor(met_days, events)` — the most-recent event at or
 *    before this MET. Used to drive the CAPCOM panel's "current"
 *    highlight + the phase-marker reveal animation in /fly.
 *  - `scienceRefFor({ phaseType?, eventType? })` — looks up the matching
 *    /science encyclopedia entry from cislunar-phase-science-map.json
 *    to power the `?` chip on phase pills + CAPCOM event rows.
 *
 * The lookup table is intentionally **static + per-type** (not
 *  per-mission) for the first cut — Apollo 11/13/17 + Artemis II all
 * share the same conceptual phases. Per-mission overrides can layer
 * on later if e.g. Chang'e 5's LOR pattern needs its own section.
 */

import phaseScienceMap from '../../static/data/cislunar-phase-science-map.json';
import type { CislunarPhase, CislunarPhaseType, CislunarTrajectory } from './cislunar-geometry';

export interface ScienceRef {
  tab: string;
  slug: string;
}

// Event types that can appear in `flight.events[].type` per the schema.
// Mirrors the mission.schema.json enum + the cislunar additions from
// ADR-058 (parking_orbit_exit, loi, tei, descent_start, ascent).
export type FlightEventType =
  | 'launch'
  | 'parking_orbit_exit'
  | 'tli_or_tmi'
  | 'tcm'
  | 'loi'
  | 'descent_start'
  | 'ascent'
  | 'tei'
  | 'earth_return'
  | 'flyby'
  | 'arrival';

export interface FlightEvent {
  type: FlightEventType;
  met_days?: number;
  title?: string;
  label?: string;
  dv_km_s?: number;
}

interface ScienceMap {
  phase_refs: Partial<Record<CislunarPhaseType, ScienceRef[]>>;
  event_refs: Partial<Record<FlightEventType, ScienceRef[]>>;
}

const MAP = phaseScienceMap as unknown as ScienceMap;

/**
 * Which cislunar phase covers this MET? Returns the matching phase or
 * null if outside any phase's [start, end) range. Phases are assumed
 * non-overlapping (renderer enforces this implicitly — sequential
 * phases stitched end-to-end).
 */
export function currentPhaseFor(
  met_days: number,
  trajectory: Pick<CislunarTrajectory, 'phases'>,
): CislunarPhase | null {
  for (const phase of trajectory.phases) {
    if (met_days >= phase.start_met_days && met_days < phase.end_met_days) {
      return phase;
    }
  }
  // Past the last phase? Return the last one (mission "ended" but we
  // still want a meaningful phase label, not null → no chip).
  const last = trajectory.phases[trajectory.phases.length - 1];
  if (last && met_days >= last.end_met_days) return last;
  return null;
}

/**
 * Most-recent event at or before this MET. Used by the CAPCOM "current
 * event highlight" + the trajectory-marker reveal animation (markers
 * for events at MET ≤ now render bright; future events stay ghosted).
 * Events without `met_days` are skipped (legacy/editorial entries).
 */
export function currentEventFor(
  met_days: number,
  events: readonly FlightEvent[],
): FlightEvent | null {
  let best: FlightEvent | null = null;
  for (const e of events) {
    if (typeof e.met_days !== 'number') continue;
    if (e.met_days > met_days) continue;
    if (!best || (best.met_days ?? 0) < e.met_days) best = e;
  }
  return best;
}

/**
 * /science encyclopedia ref(s) for a phase OR event. First entry in the
 * returned array is the primary chip (single-click target). Empty array
 * = no ref configured for this type → no chip rendered.
 *
 * Pass `phaseType` OR `eventType`, not both — events take precedence
 * when both are passed (events are more specific).
 */
export function scienceRefsFor(args: {
  phaseType?: CislunarPhaseType;
  eventType?: FlightEventType;
}): ScienceRef[] {
  if (args.eventType) {
    return MAP.event_refs[args.eventType] ?? [];
  }
  if (args.phaseType) {
    return MAP.phase_refs[args.phaseType] ?? [];
  }
  return [];
}

/**
 * Convenience: primary (first) ref for a phase or event, or null. Most
 * UI surfaces (HUD pill, CAPCOM row) only show one chip — use this to
 * grab it without indexing the array yourself.
 */
export function primaryScienceRefFor(args: {
  phaseType?: CislunarPhaseType;
  eventType?: FlightEventType;
}): ScienceRef | null {
  const refs = scienceRefsFor(args);
  return refs.length > 0 ? refs[0] : null;
}
