import { describe, it, expect } from 'vitest';
import {
  findActiveFlybyMet,
  FLYBY_APPROACH_DAYS,
  FLYBY_DEPART_DAYS,
  OI_APPROACH_DAYS,
  type FlightEventLite,
} from './find-active-flyby';

// Cassini-ish event roster.
const CASSINI: FlightEventLite[] = [
  { met_days: 0, type: 'launch' },
  { met_days: 193, type: 'flyby' }, // Venus #1
  { met_days: 617, type: 'flyby' }, // Venus #2
  { met_days: 672, type: 'flyby' }, // Earth
  { met_days: 1172, type: 'flyby' }, // Jupiter
  { met_days: 2451, type: 'edl_or_oi' }, // Saturn OI
];
const DEP = 0;

describe('findActiveFlybyMet', () => {
  it('returns null outside any flyby window', () => {
    expect(findActiveFlybyMet(CASSINI, 50, DEP)).toBeNull();
    expect(findActiveFlybyMet(CASSINI, 300, DEP)).toBeNull(); // between Venus #1 + #2
  });

  it('matches inside the approach window of a flyby', () => {
    // Venus #1 is at MET 193, window starts at 193 - 60 = 133
    expect(findActiveFlybyMet(CASSINI, 140, DEP)).toBe(193);
    expect(findActiveFlybyMet(CASSINI, 193, DEP)).toBe(193);
  });

  it('matches inside the depart window of a flyby', () => {
    // Venus #1's depart window ends at 193 + 30 = 223
    expect(findActiveFlybyMet(CASSINI, 220, DEP)).toBe(193);
  });

  it('exits as soon as simDay passes the depart window', () => {
    expect(findActiveFlybyMet(CASSINI, 224, DEP)).toBeNull();
  });

  it('uses the longer OI approach window for edl_or_oi events', () => {
    // Saturn OI is at 2451, the OI window starts at 2451 - 40 = 2411
    expect(findActiveFlybyMet(CASSINI, 2400, DEP)).toBeNull();
    expect(findActiveFlybyMet(CASSINI, 2411, DEP)).toBe(2451);
    expect(findActiveFlybyMet(CASSINI, 2451, DEP)).toBe(2451);
    expect(findActiveFlybyMet(CASSINI, 2451 + FLYBY_DEPART_DAYS, DEP)).toBe(2451);
  });

  it('ignores non-flyby event types (launch, arrival, free_return, etc.)', () => {
    const events: FlightEventLite[] = [
      { met_days: 100, type: 'launch' },
      { met_days: 200, type: 'free_return' },
      { met_days: 300, type: 'orbit' },
    ];
    expect(findActiveFlybyMet(events, 100, DEP)).toBeNull();
    expect(findActiveFlybyMet(events, 200, DEP)).toBeNull();
    expect(findActiveFlybyMet(events, 300, DEP)).toBeNull();
  });

  it('skips events with missing met_days', () => {
    const events: FlightEventLite[] = [
      { met_days: null, type: 'flyby' },
      { met_days: 200, type: 'flyby' },
    ];
    expect(findActiveFlybyMet(events, 200, DEP)).toBe(200);
    expect(findActiveFlybyMet(events, 150, DEP)).toBe(200); // approach window
  });

  it('the first matching event wins (chronological order)', () => {
    // Synthetic overlap: two flybys 10 days apart, both windows match.
    const overlap: FlightEventLite[] = [
      { met_days: 100, type: 'flyby' }, // window [40, 130]
      { met_days: 110, type: 'flyby' }, // window [50, 140]
    ];
    expect(findActiveFlybyMet(overlap, 105, DEP)).toBe(100); // both overlap; first wins
  });

  it('handles a non-zero depDay (offsets the windows)', () => {
    const dep = 808; // arbitrary epoch offset
    expect(findActiveFlybyMet(CASSINI, dep + 193, dep)).toBe(193);
    expect(findActiveFlybyMet(CASSINI, dep + 50, dep)).toBeNull();
  });

  it('handles an empty event list', () => {
    expect(findActiveFlybyMet([], 100, DEP)).toBeNull();
  });

  it('exposes the constants for callers that need to size their own UI windows', () => {
    expect(FLYBY_APPROACH_DAYS).toBe(60);
    expect(FLYBY_DEPART_DAYS).toBe(30);
    expect(OI_APPROACH_DAYS).toBe(40);
  });
});
