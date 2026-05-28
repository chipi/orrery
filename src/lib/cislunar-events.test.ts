import { describe, it, expect } from 'vitest';
import {
  currentPhaseFor,
  currentEventFor,
  scienceRefsFor,
  primaryScienceRefFor,
  type FlightEvent,
} from './cislunar-events';
import type { CislunarPhase } from './cislunar-geometry';

const phases: CislunarPhase[] = [
  { type: 'parking', start_met_days: 0, end_met_days: 0.1, points: [] },
  { type: 'tli_coast', start_met_days: 0.1, end_met_days: 3.13, points: [] },
  { type: 'lunar_orbit', start_met_days: 3.13, end_met_days: 6.5, points: [] },
  { type: 'tei_coast', start_met_days: 6.5, end_met_days: 8.13, points: [] },
];

const events: FlightEvent[] = [
  { type: 'launch', met_days: 0 },
  { type: 'tli_or_tmi', met_days: 0.117 },
  { type: 'tcm', met_days: 1.4 },
  { type: 'loi', met_days: 3.13 },
  { type: 'descent_start', met_days: 4.25 },
  { type: 'ascent', met_days: 4.34 },
  { type: 'tei', met_days: 6.5 },
  { type: 'earth_return', met_days: 8.13 },
];

describe('cislunar-events — currentPhaseFor', () => {
  it('returns the active phase at a MET inside its range', () => {
    expect(currentPhaseFor(0.05, { phases })?.type).toBe('parking');
    expect(currentPhaseFor(1.5, { phases })?.type).toBe('tli_coast');
    expect(currentPhaseFor(4.0, { phases })?.type).toBe('lunar_orbit');
    expect(currentPhaseFor(7.5, { phases })?.type).toBe('tei_coast');
  });

  it('treats phase boundaries as inclusive on start, exclusive on end', () => {
    expect(currentPhaseFor(0.0, { phases })?.type).toBe('parking');
    expect(currentPhaseFor(0.1, { phases })?.type).toBe('tli_coast');
    expect(currentPhaseFor(3.13, { phases })?.type).toBe('lunar_orbit');
  });

  it('returns the last phase when MET is past mission end', () => {
    expect(currentPhaseFor(10.0, { phases })?.type).toBe('tei_coast');
  });

  it('returns null for empty phase list', () => {
    expect(currentPhaseFor(5.0, { phases: [] })).toBeNull();
  });
});

describe('cislunar-events — currentEventFor', () => {
  it('returns the most recent event at or before MET', () => {
    expect(currentEventFor(0.0, events)?.type).toBe('launch');
    expect(currentEventFor(0.5, events)?.type).toBe('tli_or_tmi');
    expect(currentEventFor(2.0, events)?.type).toBe('tcm');
    expect(currentEventFor(3.13, events)?.type).toBe('loi');
    expect(currentEventFor(4.3, events)?.type).toBe('descent_start');
    expect(currentEventFor(10.0, events)?.type).toBe('earth_return');
  });

  it('returns null before the first event', () => {
    expect(currentEventFor(-1.0, events)).toBeNull();
  });

  it('skips events without met_days', () => {
    const mixed: FlightEvent[] = [
      { type: 'launch', met_days: 0 },
      { type: 'tcm' }, // no met_days
      { type: 'loi', met_days: 3.13 },
    ];
    expect(currentEventFor(2.0, mixed)?.type).toBe('launch');
  });
});

describe('cislunar-events — scienceRefsFor / primaryScienceRefFor', () => {
  it('returns the configured refs for a phase type', () => {
    const refs = scienceRefsFor({ phaseType: 'tli_coast' });
    expect(refs.length).toBeGreaterThanOrEqual(1);
    expect(refs[0]).toEqual({ tab: 'mission-phases', slug: 'trans-x-injection' });
  });

  it('returns the configured refs for an event type', () => {
    const refs = scienceRefsFor({ eventType: 'loi' });
    expect(refs.length).toBeGreaterThanOrEqual(1);
    expect(refs[0]).toEqual({ tab: 'mission-phases', slug: 'orbit-insertion' });
  });

  it('events take precedence when both are passed', () => {
    const refs = scienceRefsFor({ phaseType: 'tli_coast', eventType: 'launch' });
    expect(refs[0]).toEqual({ tab: 'mission-phases', slug: 'launch' });
  });

  it('returns [] for unmapped types (no crash)', () => {
    expect(scienceRefsFor({})).toEqual([]);
  });

  it('primaryScienceRefFor returns null when no refs configured', () => {
    expect(primaryScienceRefFor({})).toBeNull();
  });

  it('primaryScienceRefFor returns the first ref', () => {
    expect(primaryScienceRefFor({ phaseType: 'tli_coast' })).toEqual({
      tab: 'mission-phases',
      slug: 'trans-x-injection',
    });
  });
});
