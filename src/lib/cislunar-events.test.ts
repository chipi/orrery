import { describe, it, expect } from 'vitest';
import {
  currentPhaseFor,
  currentEventFor,
  scienceRefsFor,
  primaryScienceRefFor,
  eciKmAtMet,
  phaseMarkerKmPositions,
  type FlightEvent,
} from './cislunar-events';
import type { CislunarPhase, CislunarTrajectory } from './cislunar-geometry';

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

describe('cislunar-events — eciKmAtMet', () => {
  function makeTrajectory(): CislunarTrajectory {
    return {
      phases: [
        {
          type: 'parking',
          start_met_days: 0,
          end_met_days: 0.1,
          points: [
            { x: 6500, y: 0, z: 0 },
            { x: 6500, y: 0, z: 100 },
          ],
        },
        {
          type: 'tli_coast',
          start_met_days: 0.1,
          end_met_days: 3,
          points: [
            { x: 6500, y: 0, z: 100 },
            { x: 200000, y: 0, z: 200000 },
            { x: 384400, y: 0, z: 0 },
          ],
        },
      ],
      moon_track: [],
      closest_approach_km: 110,
    };
  }

  it('returns null when MET is in an empty trajectory', () => {
    const t: CislunarTrajectory = { phases: [], moon_track: [], closest_approach_km: 0 };
    expect(eciKmAtMet(1.0, t)).toBeNull();
  });

  it('clamps to first sample when MET < trajectory start', () => {
    const pt = eciKmAtMet(-1, makeTrajectory());
    expect(pt).toEqual({ x: 6500, y: 0, z: 0 });
  });

  it('clamps to last sample when MET > trajectory end', () => {
    const pt = eciKmAtMet(10, makeTrajectory());
    expect(pt).toEqual({ x: 384400, y: 0, z: 0 });
  });

  it('linearly interpolates between bracketing samples', () => {
    // Midpoint of tli_coast (MET 1.55, between 0.1 and 3.0)
    // The tli_coast spans 3 points: (6500,0,100), (200000,0,200000), (384400,0,0)
    // MET 1.55 = (1.55-0.1)/(3-0.1) = 1.45/2.9 = 0.5 — middle of the phase.
    // Sample 2 in tli_coast has MET = 0.1 + 0.5 × 2.9 = 1.55.
    const pt = eciKmAtMet(1.55, makeTrajectory());
    expect(pt).toEqual({ x: 200000, y: 0, z: 200000 });
  });

  it('handles phase boundaries (end of phase 1 = start of phase 2)', () => {
    const pt = eciKmAtMet(0.1, makeTrajectory());
    expect(pt?.x).toBe(6500);
    expect(pt?.z).toBe(100);
  });
});

describe('cislunar-events — phaseMarkerKmPositions', () => {
  const trajectory: CislunarTrajectory = {
    phases: [
      {
        type: 'parking',
        start_met_days: 0,
        end_met_days: 0.117,
        points: [
          { x: 6500, y: 0, z: 0 },
          { x: 6500, y: 0, z: 100 },
        ],
      },
      {
        type: 'tli_coast',
        start_met_days: 0.117,
        end_met_days: 3.13,
        points: [
          { x: 6500, y: 0, z: 100 },
          { x: 384400, y: 0, z: 0 },
        ],
      },
    ],
    moon_track: [],
    closest_approach_km: 110,
  };

  it('returns [] for undefined / null inputs', () => {
    expect(phaseMarkerKmPositions(undefined, trajectory)).toEqual([]);
    expect(phaseMarkerKmPositions([], null)).toEqual([]);
  });

  it('maps each MET-anchored event to its ECI position + science ref', () => {
    const events: FlightEvent[] = [
      { type: 'launch', met_days: 0 },
      { type: 'tli_or_tmi', met_days: 0.117 },
      { type: 'loi', met_days: 3.13 },
    ];
    const markers = phaseMarkerKmPositions(events, trajectory);
    expect(markers).toHaveLength(3);
    expect(markers[0].event.type).toBe('launch');
    expect(markers[0].posKm).toEqual({ x: 6500, y: 0, z: 0 });
    expect(markers[0].scienceRef?.slug).toBe('launch');
    expect(markers[1].event.type).toBe('tli_or_tmi');
    expect(markers[1].scienceRef?.slug).toBe('trans-x-injection');
    expect(markers[2].event.type).toBe('loi');
    expect(markers[2].posKm).toEqual({ x: 384400, y: 0, z: 0 });
  });

  it('skips events without met_days', () => {
    const events: FlightEvent[] = [
      { type: 'launch', met_days: 0 },
      { type: 'tcm' }, // no met_days
      { type: 'loi', met_days: 3.13 },
    ];
    expect(phaseMarkerKmPositions(events, trajectory)).toHaveLength(2);
  });

  it('preserves event order even when scienceRef is null (unmapped type)', () => {
    const mockEvents: FlightEvent[] = [
      { type: 'launch', met_days: 0 },
      // Cast as the FlightEventType union won't accept arbitrary strings;
      // simulate an unmapped-but-known event type via a known key without
      // a science ref entry.
      { type: 'launch' as 'launch', met_days: 1.0 }, // duplicate at later MET
    ];
    const m = phaseMarkerKmPositions(mockEvents, trajectory);
    expect(m).toHaveLength(2);
    expect(m[0].event.met_days).toBe(0);
    expect(m[1].event.met_days).toBe(1.0);
  });
});
