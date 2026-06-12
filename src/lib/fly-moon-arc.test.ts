import { describe, it, expect } from 'vitest';
import {
  ARC_STEPS,
  MOON_FLY_RADIUS_AU,
  MOON_PERIOD_DAYS,
  moonHelioPos,
  moonHelioArc,
  buildArcs,
} from './fly-moon-arc';
import { earthPos, marsPos } from './orbital/mission-arc';

describe('fly-moon-arc constants', () => {
  it('ARC_STEPS density matches /fly +page.svelte intent (≥ 256)', () => {
    expect(ARC_STEPS).toBeGreaterThanOrEqual(256);
  });

  it('MOON_FLY_RADIUS_AU is exaggerated (not the real 0.0026 AU)', () => {
    expect(MOON_FLY_RADIUS_AU).toBeGreaterThan(0.1);
    expect(MOON_FLY_RADIUS_AU).toBeLessThan(1);
  });

  it('MOON_PERIOD_DAYS is the sidereal lunar month', () => {
    expect(MOON_PERIOD_DAYS).toBeCloseTo(27.32, 2);
  });
});

describe('moonHelioPos', () => {
  it('sits exactly MOON_FLY_RADIUS_AU from Earth at every simDay', () => {
    for (const day of [0, 100, 365.25, 1000, -50]) {
      const earth = earthPos(day);
      const moon = moonHelioPos(day);
      const dx = moon.x - earth.x;
      const dz = moon.z - earth.z;
      expect(Math.hypot(dx, dz)).toBeCloseTo(MOON_FLY_RADIUS_AU, 10);
    }
  });

  it('completes one orbit per MOON_PERIOD_DAYS (angle resets)', () => {
    const a = moonHelioPos(0);
    const b = moonHelioPos(MOON_PERIOD_DAYS);
    // After one full period the Earth has moved on; the *Moon-relative*
    // offset should be back to the same direction (cos(0), sin(0)) i.e.
    // (MOON_FLY_RADIUS_AU, 0).
    const earthA = earthPos(0);
    const earthB = earthPos(MOON_PERIOD_DAYS);
    expect(a.x - earthA.x).toBeCloseTo(MOON_FLY_RADIUS_AU, 10);
    expect(a.z - earthA.z).toBeCloseTo(0, 10);
    expect(b.x - earthB.x).toBeCloseTo(MOON_FLY_RADIUS_AU, 10);
    expect(b.z - earthB.z).toBeCloseTo(0, 10);
  });
});

describe('moonHelioArc', () => {
  it('returns steps+1 points', () => {
    const start = moonHelioPos(0);
    const end = moonHelioPos(4);
    const pts = moonHelioArc(0, 4, start, end, 12);
    expect(pts.length).toBe(13);
  });

  it('pins start and end endpoints exactly to inputs', () => {
    const start = moonHelioPos(0);
    const end = moonHelioPos(4);
    const pts = moonHelioArc(0, 4, start, end, 12);
    expect(pts[0].x).toBeCloseTo(start.x, 10);
    expect(pts[0].z).toBeCloseTo(start.z, 10);
    expect(pts[pts.length - 1].x).toBeCloseTo(end.x, 10);
    expect(pts[pts.length - 1].z).toBeCloseTo(end.z, 10);
  });

  it('intermediate points ride Earth (Earth-relative offset blends linearly)', () => {
    const start = moonHelioPos(0);
    const end = moonHelioPos(4);
    const pts = moonHelioArc(0, 4, start, end, 4);
    // Midpoint: t=0.5, offset is halfway between start-offset and end-offset.
    const mid = pts[2];
    const earthMid = earthPos(2);
    const startOff = { x: start.x - earthPos(0).x, z: start.z - earthPos(0).z };
    const endOff = { x: end.x - earthPos(4).x, z: end.z - earthPos(4).z };
    expect(mid.x - earthMid.x).toBeCloseTo((startOff.x + endOff.x) / 2, 10);
    expect(mid.z - earthMid.z).toBeCloseTo((startOff.z + endOff.z) / 2, 10);
  });
});

describe('buildArcs', () => {
  const timeline = { dep_day: 0, flyby_day: 250, arr_day: 500 };

  it('outbound endpoints sit exactly on Earth (dep) and destination (flyby)', () => {
    const { out } = buildArcs(timeline, false, 'mars');
    const earthDep = earthPos(timeline.dep_day);
    const marsArr = marsPos(timeline.flyby_day);
    expect(out[0].x).toBeCloseTo(earthDep.x, 6);
    expect(out[0].z).toBeCloseTo(earthDep.z, 6);
    expect(out[out.length - 1].x).toBeCloseTo(marsArr.x, 6);
    expect(out[out.length - 1].z).toBeCloseTo(marsArr.z, 6);
  });

  it('non-free-return: ret is empty', () => {
    const { ret } = buildArcs(timeline, false, 'mars');
    expect(ret).toEqual([]);
  });

  it('free-return Mars: ret starts at outbound terminus and ends at Earth arr', () => {
    const { out, ret } = buildArcs(timeline, true, 'mars');
    const earthRet = earthPos(timeline.arr_day);
    expect(ret[0].x).toBeCloseTo(out[out.length - 1].x, 6);
    expect(ret[0].z).toBeCloseTo(out[out.length - 1].z, 6);
    expect(ret[ret.length - 1].x).toBeCloseTo(earthRet.x, 6);
    expect(ret[ret.length - 1].z).toBeCloseTo(earthRet.z, 6);
  });

  it('arc lengths match ARC_STEPS+1', () => {
    const { out, ret } = buildArcs(timeline, true, 'mars');
    expect(out.length).toBe(ARC_STEPS + 1);
    expect(ret.length).toBe(ARC_STEPS + 1);
  });

  it('non-Mars destination dispatches to destinationPos (smoke)', () => {
    const { out } = buildArcs(timeline, false, 'venus');
    expect(out.length).toBe(ARC_STEPS + 1);
    expect(Number.isFinite(out[0].x)).toBe(true);
  });
});
