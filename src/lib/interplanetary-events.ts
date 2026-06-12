/**
 * Per-mission interplanetary phase + event helpers (#107 Step 6e).
 *
 * Parallels cislunar-events.ts but for Mars + outer-system missions
 * whose trajectory is heliocentric (AU coordinates, not ECI km).
 *
 * Pure functions — same shape as the cislunar counterparts so /fly can
 * dispatch on the mission's destination once (Earth-relative vs
 * Sun-relative) and pick the correct event/marker pipeline. The
 * science-map lookup is shared (cislunar-phase-science-map.json now
 * covers both phase families).
 */

import phaseScienceMap from '../../static/data/cislunar-phase-science-map.json';
import {
  helioAuAtMet,
  type InterplanetaryPhase,
  type InterplanetaryPhaseType,
  type InterplanetaryTrajectory,
  type Vec3Au,
} from './interplanetary-geometry';
import type { CislunarPhaseType } from './orbital/cislunar/cislunar-geometry';
import type { ScienceRef, FlightEvent } from './orbital/cislunar/cislunar-events';
import { primaryScienceRefFor } from './orbital/cislunar/cislunar-events';

interface ScienceMap {
  phase_refs: Partial<Record<CislunarPhaseType | InterplanetaryPhaseType, ScienceRef[]>>;
  event_refs: Record<string, ScienceRef[]>;
}
const MAP = phaseScienceMap as unknown as ScienceMap;

/** Which interplanetary phase covers this MET? Mirrors cislunar
 *  `currentPhaseFor`. */
export function currentInterplanetaryPhaseFor(
  met_days: number,
  trajectory: Pick<InterplanetaryTrajectory, 'phases'> | null | undefined,
): InterplanetaryPhase | null {
  if (!trajectory) return null;
  for (const phase of trajectory.phases) {
    if (met_days >= phase.start_met_days && met_days < phase.end_met_days) {
      return phase;
    }
  }
  // Clamp to last phase if past mission end (parity with cislunar).
  const last = trajectory.phases[trajectory.phases.length - 1];
  if (last && met_days >= last.end_met_days) return last;
  return null;
}

/** Science ref(s) for an interplanetary phase. Reuses the same
 *  cislunar-phase-science-map.json (which now covers helio phase
 *  types too, per Step 6d). */
export function interplanetaryPhaseScienceRefs(phaseType: InterplanetaryPhaseType): ScienceRef[] {
  return MAP.phase_refs[phaseType] ?? [];
}

export function primaryInterplanetaryPhaseScienceRef(
  phaseType: InterplanetaryPhaseType,
): ScienceRef | null {
  const refs = interplanetaryPhaseScienceRefs(phaseType);
  return refs.length > 0 ? refs[0] : null;
}

/**
 * Materialised phase-marker descriptor for an interplanetary mission.
 * Mirrors the cislunar PhaseMarker but with heliocentric AU position.
 */
export interface InterplanetaryPhaseMarker {
  event: FlightEvent;
  posAu: Vec3Au;
  scienceRef: ScienceRef | null;
}

/**
 * Build phase markers for /fly's overlay across an interplanetary
 * mission. Pure function; mirrors phaseMarkerKmPositions. Events
 * without met_days or with no positional interpolation are skipped.
 */
export function phaseMarkerAuPositions(
  events: readonly FlightEvent[] | undefined,
  trajectory: InterplanetaryTrajectory | null | undefined,
): InterplanetaryPhaseMarker[] {
  if (!events || !trajectory) return [];
  const out: InterplanetaryPhaseMarker[] = [];
  for (const e of events) {
    if (typeof e.met_days !== 'number') continue;
    const posAu = helioAuAtMet(e.met_days, trajectory);
    if (!posAu) continue;
    out.push({
      event: e,
      posAu,
      scienceRef: primaryScienceRefFor({ eventType: e.type }),
    });
  }
  return out;
}
