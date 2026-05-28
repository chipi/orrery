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
import type {
  CislunarPhase,
  CislunarPhaseType,
  CislunarTrajectory,
  Vec3Km,
} from './cislunar-geometry';
import type { ScienceTabId } from '$types/science';

export interface ScienceRef {
  tab: ScienceTabId;
  slug: string;
}

// Re-export the canonical union from src/types/mission.ts (matches the
// mission.schema.json enum) so cislunar-events and the rest of the
// app agree on the same set of event types. The science-ref map only
// has entries for the cislunar-relevant subset; unmapped types
// (anomaly, edl_or_oi when used for Mars) get scienceRefsFor → [].
export type { FlightEventType } from '$types/mission';
import type { FlightEventType } from '$types/mission';

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

/**
 * Interpolate the ECI km position at a given MET by walking the
 * trajectory's flattened phases timeline. Returns null when MET is
 * outside the trajectory's span or no points are available.
 *
 * Used internally by phaseMarkerKmPositions; exposed for /fly to
 * place sub-event markers later if needed (mid-phase pings).
 */
export function eciKmAtMet(metDays: number, trajectory: CislunarTrajectory): Vec3Km | null {
  // Flatten phases to (met, point) pairs once; assume phases are sorted
  // by start_met_days (renderer enforces this implicitly).
  const samples: Array<{ met: number; pt: Vec3Km }> = [];
  for (const phase of trajectory.phases) {
    const { start_met_days, end_met_days, points } = phase;
    if (points.length === 0) continue;
    const span = end_met_days - start_met_days;
    for (let i = 0; i < points.length; i++) {
      const tFrac = points.length === 1 ? 0 : i / (points.length - 1);
      samples.push({ met: start_met_days + tFrac * span, pt: points[i] });
    }
  }
  if (samples.length === 0) return null;
  if (metDays <= samples[0].met) return samples[0].pt;
  if (metDays >= samples[samples.length - 1].met) return samples[samples.length - 1].pt;
  // Binary search for the bracket.
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].met <= metDays) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const span = b.met - a.met;
  if (span < 1e-9) return a.pt;
  const t = (metDays - a.met) / span;
  return {
    x: a.pt.x + (b.pt.x - a.pt.x) * t,
    y: a.pt.y + (b.pt.y - a.pt.y) * t,
    z: a.pt.z + (b.pt.z - a.pt.z) * t,
  };
}

/**
 * Materialised phase-marker descriptor: ECI position + science cross-
 * link + the raw event. Computed ONCE per trajectory change (derived
 * state), then the per-frame render path only needs to project to
 * screen — no per-frame interpolation through phase points.
 */
export interface PhaseMarker {
  event: FlightEvent;
  posKm: Vec3Km;
  scienceRef: ScienceRef | null;
}

/**
 * Build phase markers for /fly's overlay. Events without met_days,
 * with MET outside the trajectory span, or with no positional
 * interpolation are skipped (deliberately — silently drops events
 * that have no anchored position rather than rendering a stale dot
 * at the origin).
 */
export function phaseMarkerKmPositions(
  events: readonly FlightEvent[] | undefined,
  trajectory: CislunarTrajectory | null | undefined,
): PhaseMarker[] {
  if (!events || !trajectory) return [];
  const out: PhaseMarker[] = [];
  for (const e of events) {
    if (typeof e.met_days !== 'number') continue;
    const posKm = eciKmAtMet(e.met_days, trajectory);
    if (!posKm) continue;
    out.push({
      event: e,
      posKm,
      scienceRef: primaryScienceRefFor({ eventType: e.type }),
    });
  }
  return out;
}
