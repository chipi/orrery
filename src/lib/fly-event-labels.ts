import * as m from '$lib/paraglide/messages';
import type { PhaseMarker } from '$lib/orbital/cislunar/cislunar-events';

/**
 * Resolve a FlightEvent.type to its localised label via paraglide
 * messages (C7 — 14-locale roll, EN placeholders pending wave23
 * translation pass). Unknown types fall through to the raw key
 * string (defensive — shouldn't happen with the schema's closed
 * FlightEventType union).
 *
 * Extracted from /fly/+page.svelte during W9 (#279).
 */
export function defaultEventLabel(type: PhaseMarker['event']['type']): string {
  switch (type) {
    case 'launch':
      return m.fly_event_launch();
    case 'max_q':
      return m.fly_event_max_q();
    case 'meco':
      return m.fly_event_meco();
    case 'fairing_jettison':
      return m.fly_event_fairing_jettison();
    case 'seco':
      return m.fly_event_seco();
    case 'parking_orbit_exit':
      return m.fly_event_parking_orbit_exit();
    case 'tli_or_tmi':
      return m.fly_event_tli_or_tmi();
    case 'tcm':
      return m.fly_event_tcm();
    case 'loi':
      return m.fly_event_loi();
    case 'descent_start':
      return m.fly_event_descent_start();
    case 'ascent':
      return m.fly_event_ascent();
    case 'tei':
      return m.fly_event_tei();
    case 'earth_return':
      return m.fly_event_earth_return();
    case 'flyby':
      return m.fly_event_flyby();
    case 'arrival':
      return m.fly_event_arrival();
    case 'anomaly':
      return m.fly_event_anomaly();
    case 'edl_or_oi':
      return m.fly_event_edl_or_oi();
    case 'phasing':
      return m.fly_event_phasing();
    case 'separation':
      return m.fly_event_separation();
    default:
      return type;
  }
}
