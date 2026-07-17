import { describe, it, expect } from 'vitest';
import { defaultEventLabel } from './fly-event-labels';
import type { PhaseMarker } from './orbital/cislunar/cislunar-events';

type EventType = PhaseMarker['event']['type'];

describe('defaultEventLabel', () => {
  // The closed FlightEventType union — keep in sync with the schema.
  // If a new type is added to PhaseMarker['event']['type'], this list
  // must grow with it; otherwise the per-type assertion below silently
  // covers fewer cases. The exhaustive-switch in the implementation
  // also catches new members at compile time.
  const KNOWN_TYPES: EventType[] = [
    'launch',
    'max_q',
    'meco',
    'fairing_jettison',
    'seco',
    'parking_orbit_exit',
    'tli_or_tmi',
    'tcm',
    'loi',
    'descent_start',
    'ascent',
    'tei',
    'earth_return',
    'flyby',
    'arrival',
    'anomaly',
    'edl_or_oi',
    'phasing',
    'separation',
  ];

  it.each(KNOWN_TYPES)('returns a non-empty string for %s', (type) => {
    const label = defaultEventLabel(type);
    expect(typeof label).toBe('string');
    expect(label.length).toBeGreaterThan(0);
  });

  it('falls through to the raw type string for unknown values (defensive)', () => {
    const unknown = 'totally-not-a-real-event' as EventType;
    expect(defaultEventLabel(unknown)).toBe(unknown);
  });
});
