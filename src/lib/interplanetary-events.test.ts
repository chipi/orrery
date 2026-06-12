import { describe, it, expect } from 'vitest';
import {
  currentInterplanetaryPhaseFor,
  interplanetaryPhaseScienceRefs,
  primaryInterplanetaryPhaseScienceRef,
  phaseMarkerAuPositions,
} from './interplanetary-events';
import type { InterplanetaryTrajectory } from './interplanetary-geometry';
import type { FlightEvent } from './orbital/cislunar/cislunar-events';

const traj: InterplanetaryTrajectory = {
  phases: [
    {
      type: 'helio_cruise',
      start_met_days: 0,
      end_met_days: 200,
      points: [
        { x: 1, y: 0, z: 0 },
        { x: 1.25, y: 0, z: 0.5 },
        { x: 1.524, y: 0, z: 0 },
      ],
    },
    {
      type: 'arrival_orbit',
      start_met_days: 200,
      end_met_days: 205,
      points: [
        { x: 1.524, y: 0, z: 0 },
        { x: 1.524, y: 0, z: 0.05 },
      ],
    },
  ],
  arrival_track: [],
  closest_approach_au: 0,
};

describe('interplanetary-events — currentInterplanetaryPhaseFor', () => {
  it('returns the active phase at a MET inside its range', () => {
    expect(currentInterplanetaryPhaseFor(100, traj)?.type).toBe('helio_cruise');
    expect(currentInterplanetaryPhaseFor(202, traj)?.type).toBe('arrival_orbit');
  });

  it('inclusive on start, exclusive on end', () => {
    expect(currentInterplanetaryPhaseFor(0, traj)?.type).toBe('helio_cruise');
    expect(currentInterplanetaryPhaseFor(200, traj)?.type).toBe('arrival_orbit');
  });

  it('returns the last phase when MET past mission end', () => {
    expect(currentInterplanetaryPhaseFor(1000, traj)?.type).toBe('arrival_orbit');
  });

  it('returns null for empty / null trajectory', () => {
    expect(currentInterplanetaryPhaseFor(50, null)).toBeNull();
    expect(currentInterplanetaryPhaseFor(50, { phases: [] })).toBeNull();
  });
});

describe('interplanetary-events — science refs', () => {
  it('returns refs for known heliocentric phase types', () => {
    const refs = interplanetaryPhaseScienceRefs('helio_cruise');
    expect(refs.length).toBeGreaterThanOrEqual(1);
    expect(refs[0]).toEqual({ tab: 'transfers', slug: 'hohmann-transfer' });
  });

  it('primaryInterplanetaryPhaseScienceRef returns null when no refs configured', () => {
    expect(primaryInterplanetaryPhaseScienceRef('mars_surface')?.slug).toBe('edl');
  });
});

describe('interplanetary-events — phaseMarkerAuPositions', () => {
  it('returns [] for null inputs', () => {
    expect(phaseMarkerAuPositions(undefined, traj)).toEqual([]);
    expect(phaseMarkerAuPositions([], null)).toEqual([]);
  });

  it('maps each MET-anchored event to an AU position + science ref', () => {
    const events: FlightEvent[] = [
      { type: 'launch', met_days: 0 },
      { type: 'tcm', met_days: 100 },
      { type: 'arrival', met_days: 200 },
    ];
    const markers = phaseMarkerAuPositions(events, traj);
    expect(markers).toHaveLength(3);
    expect(markers[0].event.type).toBe('launch');
    expect(markers[0].posAu).toEqual({ x: 1, y: 0, z: 0 });
    expect(markers[1].event.type).toBe('tcm');
    expect(markers[1].posAu).toEqual({ x: 1.25, y: 0, z: 0.5 });
    expect(markers[2].event.type).toBe('arrival');
    expect(markers[2].posAu.x).toBeCloseTo(1.524);
  });

  it('skips events without met_days', () => {
    const events: FlightEvent[] = [
      { type: 'launch', met_days: 0 },
      { type: 'tcm' }, // no met_days
      { type: 'arrival', met_days: 200 },
    ];
    expect(phaseMarkerAuPositions(events, traj)).toHaveLength(2);
  });
});
