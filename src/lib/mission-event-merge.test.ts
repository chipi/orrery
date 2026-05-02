import { describe, it, expect } from 'vitest';
import { mergeFlightEvents } from './mission-event-merge';
import type { FlightTimelineEvent, MissionEvent } from '$types/mission';

describe('mergeFlightEvents (v0.1.13)', () => {
  it('returns [] when both inputs are empty', () => {
    expect(mergeFlightEvents([], [])).toEqual([]);
    expect(mergeFlightEvents(undefined, undefined)).toEqual([]);
  });

  it('passes editorial events through unchanged when structural is empty', () => {
    const editorial: MissionEvent[] = [
      { met: 0, label: 'LAUNCH', note: 'Atlas V lifts off', type: 'nominal' },
      { met: 254, label: 'EDL', note: 'Seven minutes of terror', type: 'nominal' },
    ];
    expect(mergeFlightEvents(editorial, [])).toEqual(editorial);
  });

  it('emits structural events with default labels when editorial is empty', () => {
    const structural: FlightTimelineEvent[] = [
      { met_days: 0, type: 'launch' },
      { met_days: 30, type: 'tcm' },
      { met_days: 188, type: 'arrival' },
    ];
    const out = mergeFlightEvents([], structural);
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ met: 0, label: 'LAUNCH', type: 'nominal' });
    expect(out[1]).toMatchObject({ met: 30, label: 'TRAJECTORY CORRECTION', type: 'info' });
    expect(out[2]).toMatchObject({ met: 188, label: 'ARRIVAL' });
  });

  it('drops structural events that collide with editorial within tolerance', () => {
    const editorial: MissionEvent[] = [
      { met: 0, label: 'LAUNCH', note: 'Lift-off', type: 'nominal' },
    ];
    const structural: FlightTimelineEvent[] = [
      // Within COLLISION_TOLERANCE_DAYS of editorial event — dropped
      { met_days: 0.005, type: 'launch' },
      { met_days: 30, type: 'tcm' },
    ];
    const out = mergeFlightEvents(editorial, structural);
    expect(out).toHaveLength(2);
    expect(out[0].label).toBe('LAUNCH');
    expect(out[0].note).toBe('Lift-off');
    expect(out[1].label).toBe('TRAJECTORY CORRECTION');
  });

  it('output is sorted by met ascending', () => {
    const editorial: MissionEvent[] = [{ met: 254, label: 'EDL', note: '', type: 'nominal' }];
    const structural: FlightTimelineEvent[] = [
      { met_days: 0, type: 'launch' },
      { met_days: 30, type: 'tcm' },
      { met_days: 100, type: 'tcm' },
    ];
    const out = mergeFlightEvents(editorial, structural);
    const mets = out.map((e) => e.met);
    expect(mets).toEqual([0, 30, 100, 254]);
  });

  it('flags anomaly events as warning type', () => {
    const out = mergeFlightEvents([], [{ met_days: 188.01, type: 'anomaly' }]);
    expect(out[0].type).toBe('warning');
  });

  it('respects label-map override (i18n / locale labels)', () => {
    const out = mergeFlightEvents([], [{ met_days: 30, type: 'tcm' }], {
      tcm: { label: 'CORRECCIÓN', note: '', type: 'info' },
    });
    expect(out[0].label).toBe('CORRECCIÓN');
  });
});
