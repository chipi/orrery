/**
 * Merge editorial overlay events with structural flight events
 * (v0.1.13 / Phase 3.1).
 *
 * The /fly CAPCOM ticker historically read only `mission.events[]`
 * (the editorial overlay — curated narrative moments like
 * "SEVEN MINUTES OF TERROR"). After issue #31, every mission also
 * carries `mission.flight.events[]` — the structural timeline with
 * `met_days` + `type` enum. This helper fuses the two so the ticker
 * shows BOTH the editorial richness AND the full event list (TCMs,
 * TLI/TMI, EDL, anomalies) for missions that have only structural
 * data (Mars 3, Luna 9/17/24, Apollo 17, etc.).
 *
 * Editorial events take precedence at MET collisions. The pure-
 * function shape lets us unit-test without touching the /fly DOM.
 */

import type { EventType, FlightEventType, FlightTimelineEvent, MissionEvent } from '$types/mission';

/** A `(label, note)` pair derived from a flight-event type. The
 *  caller looks these up via i18n; the helper emits the type-keyed
 *  enum and the consumer chooses how to label it (e.g. /fly uses
 *  the existing `mp_flight_event_*` keys via eventLabel()). */
export interface FlightEventLabels {
  /** Short uppercase label for the ticker row. */
  label: string;
  /** Editorial note — typically a one-line description; can be ''. */
  note: string;
  /** Severity-typed colour: nominal/info/warning. */
  type: EventType;
}

/** Default labels per flight-event type. The ticker UI may override
 *  via i18n; these are the English fallbacks. */
const DEFAULT_FLIGHT_LABELS: Record<FlightEventType, FlightEventLabels> = {
  launch: { label: 'LAUNCH', note: '', type: 'nominal' },
  tli_or_tmi: { label: 'TLI/TMI BURN', note: '', type: 'nominal' },
  tcm: { label: 'TRAJECTORY CORRECTION', note: '', type: 'info' },
  arrival: { label: 'ARRIVAL', note: '', type: 'nominal' },
  edl_or_oi: { label: 'EDL / ORBIT INSERTION', note: '', type: 'nominal' },
  flyby: { label: 'FLYBY', note: '', type: 'nominal' },
  earth_return: { label: 'EARTH RETURN', note: '', type: 'nominal' },
  anomaly: { label: 'ANOMALY', note: '', type: 'warning' },
};

/** MET collision tolerance in days. Editorial and structural events
 *  often record the same moment with slightly different MET values
 *  (e.g. 0.005 vs 0.01 for TLI). This dedup tolerance keeps the
 *  ticker from showing two near-identical entries. */
const COLLISION_TOLERANCE_DAYS = 0.05;

/**
 * Merge editorial + structural events into a single ordered list.
 *
 * Rules:
 *   1. Every editorial event passes through unchanged (curated copy
 *      always wins).
 *   2. A structural event is included only if no editorial event
 *      sits within `COLLISION_TOLERANCE_DAYS` of its MET.
 *   3. Output is sorted ascending by `met`.
 *   4. Structural events get default labels per type; the consumer
 *      can localise via the `labelMap` parameter.
 *
 * @param editorial — `mission.events[]` from the locale overlay (may be empty).
 * @param structural — `mission.flight.events[]` from the base record (may be empty).
 * @param labelMap — optional override of default labels (e.g. localised).
 */
export function mergeFlightEvents(
  editorial: MissionEvent[] | undefined,
  structural: FlightTimelineEvent[] | undefined,
  labelMap: Partial<Record<FlightEventType, FlightEventLabels>> = {},
): MissionEvent[] {
  const out: MissionEvent[] = [...(editorial ?? [])];
  const editorialMets = (editorial ?? []).map((e) => e.met);

  for (const sev of structural ?? []) {
    const collides = editorialMets.some(
      (em) => Math.abs(em - sev.met_days) <= COLLISION_TOLERANCE_DAYS,
    );
    if (collides) continue;
    const labels = labelMap[sev.type] ?? DEFAULT_FLIGHT_LABELS[sev.type];
    out.push({
      met: sev.met_days,
      label: labels.label,
      note: labels.note,
      type: labels.type,
    });
  }

  return out.sort((a, b) => a.met - b.met);
}
