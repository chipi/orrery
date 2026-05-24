import { describe, it, expect } from 'vitest';
import {
  buildHistoricalMarsArcs,
  dateToSimDay,
  arcColorForStatus,
  type MarsMissionInput,
} from './historical-mars-arcs';

describe('historical-mars-arcs — date-to-sim-day + arc shape', () => {
  it('sim-day 0 = 2026-01-01', () => {
    expect(Math.abs(dateToSimDay('2026-01-01'))).toBe(0);
  });

  it('historical mission lands at negative sim-day', () => {
    expect(dateToSimDay('2020-07-23')).toBeLessThan(0);
  });

  it('builds an arc for a complete mission', () => {
    const missions: MarsMissionInput[] = [
      {
        id: 'tianwen1',
        agency: 'CNSA',
        year: 2020,
        status: 'FLOWN',
        departure_date: '2020-07-23',
        arrival_date: '2021-02-10',
      },
    ];
    const arcs = buildHistoricalMarsArcs(missions);
    expect(arcs).toHaveLength(1);
    const arc = arcs[0];
    expect(arc.id).toBe('tianwen1');
    expect(arc.points.length).toBeGreaterThan(50);
    // First point should be near Earth's orbit radius (~1 AU); last point near Mars (~1.52 AU).
    const r0 = Math.hypot(arc.points[0].x, arc.points[0].z);
    const rN = Math.hypot(arc.points.at(-1)!.x, arc.points.at(-1)!.z);
    expect(r0).toBeGreaterThan(0.95);
    expect(r0).toBeLessThan(1.05);
    expect(rN).toBeGreaterThan(1.4);
    expect(rN).toBeLessThan(1.7);
  });

  it('skips missions missing dates', () => {
    const missions: MarsMissionInput[] = [
      { id: 'planned', departure_date: null, arrival_date: null },
      { id: 'partial', departure_date: '2030-01-01', arrival_date: null },
    ];
    expect(buildHistoricalMarsArcs(missions)).toHaveLength(0);
  });

  it('arcColorForStatus picks correct tone per status', () => {
    expect(arcColorForStatus('FLOWN')[0]).toBeGreaterThan(0.8);
    expect(arcColorForStatus('FAILED')[0]).toBeGreaterThan(0.9);
    expect(arcColorForStatus('FAILED')[1]).toBeLessThan(0.7);
    expect(arcColorForStatus('PLANNED')[2]).toBeGreaterThan(0.9);
  });
});
