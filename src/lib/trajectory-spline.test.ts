import { describe, it, expect } from 'vitest';
import {
  parseWaypointDateToMet,
  buildSplineFromTrajectoryWaypoints,
  type TrajectoryWaypoint,
} from './trajectory-spline';

describe('parseWaypointDateToMet', () => {
  it('YYYY-MM-DD returns exact day delta', () => {
    expect(parseWaypointDateToMet('1997-10-15', '1997-10-15')).toBe(0);
    expect(parseWaypointDateToMet('1997-10-16', '1997-10-15')).toBe(1);
    expect(parseWaypointDateToMet('1998-04-26', '1997-10-15')).toBe(193);
  });
  it('YYYY-MM coalesces to mid-month', () => {
    expect(parseWaypointDateToMet('1998-01', '1997-10-15')).toBe(92); // 31+30+15+15 ≈ 92
  });
  it('Bad input returns NaN', () => {
    expect(parseWaypointDateToMet('not-a-date', '1997-10-15')).toBeNaN();
  });
});

describe('buildSplineFromTrajectoryWaypoints — Cassini', () => {
  const CASSINI_WAYPOINTS: TrajectoryWaypoint[] = [
    { date: '1997-10-15', label: 'Launch', x: 1.0, y: 0.0, z: 0.0 },
    { date: '1998-01', x: 0.95, y: -0.3, z: 0.0 },
    { date: '1998-04-26', label: 'Venus #1', x: 0.72, y: -0.05, z: 0.0 },
    { date: '1998-12', x: 1.4, y: 0.7, z: 0.0 },
    { date: '1999-06-24', label: 'Venus #2', x: 0.72, y: 0.05, z: 0.0 },
    { date: '1999-08-18', label: 'Earth', x: 1.0, y: 0.0, z: 0.0 },
    { date: '2000-04', x: 2.5, y: 1.5, z: 0.05 },
    { date: '2000-12-30', label: 'Jupiter', x: 5.2, y: 2.6, z: 0.1 },
    { date: '2004-07-01', label: 'Saturn orbit insertion', x: 8.6, y: 4.0, z: 0.35 },
  ];

  it('produces 97 sample points', () => {
    const samples = buildSplineFromTrajectoryWaypoints(CASSINI_WAYPOINTS, '1997-10-15', 97);
    expect(samples).not.toBeNull();
    expect(samples!.length).toBe(97);
  });
  it('first sample sits at Launch (1, 0, 0) MET 0', () => {
    const samples = buildSplineFromTrajectoryWaypoints(CASSINI_WAYPOINTS, '1997-10-15', 97)!;
    expect(samples[0].x).toBeCloseTo(1.0, 2);
    expect(samples[0].y).toBeCloseTo(0.0, 2);
    expect(samples[0].met_days).toBeCloseTo(0, 0);
  });
  it('last sample sits at Saturn SOI (8.6, 4.0, 0.35)', () => {
    const samples = buildSplineFromTrajectoryWaypoints(CASSINI_WAYPOINTS, '1997-10-15', 97)!;
    const last = samples[samples.length - 1];
    expect(last.x).toBeCloseTo(8.6, 2);
    expect(last.y).toBeCloseTo(4.0, 2);
    expect(last.z).toBeCloseTo(0.35, 2);
  });
  it('passes near Venus at the Venus #1 MET', () => {
    const samples = buildSplineFromTrajectoryWaypoints(CASSINI_WAYPOINTS, '1997-10-15', 200)!;
    const venusMet = parseWaypointDateToMet('1998-04-26', '1997-10-15');
    const nearVenus = samples.find((p) => Math.abs(p.met_days - venusMet) < 10)!;
    expect(nearVenus.x).toBeCloseTo(0.72, 1);
    expect(Math.abs(nearVenus.y)).toBeLessThan(0.2);
  });
  it('passes near Jupiter at the Jupiter MET', () => {
    const samples = buildSplineFromTrajectoryWaypoints(CASSINI_WAYPOINTS, '1997-10-15', 200)!;
    const jupMet = parseWaypointDateToMet('2000-12-30', '1997-10-15');
    const nearJup = samples.find((p) => Math.abs(p.met_days - jupMet) < 30)!;
    expect(nearJup.x).toBeCloseTo(5.2, 0);
    expect(nearJup.y).toBeCloseTo(2.6, 0);
  });
  it('returns null on insufficient waypoints', () => {
    expect(buildSplineFromTrajectoryWaypoints([], '1997-10-15', 97)).toBeNull();
    expect(
      buildSplineFromTrajectoryWaypoints(
        [{ date: '1997-10-15', x: 1, y: 0, z: 0 }],
        '1997-10-15',
        97,
      ),
    ).toBeNull();
  });
});
