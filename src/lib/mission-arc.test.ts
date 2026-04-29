import { describe, it, expect } from 'vitest';
import {
  A_TRANSFER,
  E_TRANSFER,
  earthPos,
  marsPos,
  outboundArc,
  returnArc,
  spacecraftPos,
  spacecraftHeading,
} from './mission-arc';
import { R_EARTH_AU, R_MARS_AU } from './lambert-grid.constants';

describe('orbital constants', () => {
  it('A_TRANSFER is the average of Earth and Mars semi-major axes', () => {
    expect(A_TRANSFER).toBeCloseTo((R_EARTH_AU + R_MARS_AU) / 2, 6);
  });

  it('E_TRANSFER matches Hohmann transfer eccentricity ≈ 0.207', () => {
    expect(E_TRANSFER).toBeCloseTo(0.2076, 3);
  });
});

describe('earthPos / marsPos', () => {
  it('Earth heliocentric distance is constant at R_EARTH_AU', () => {
    for (const day of [0, 100, 365, 1000]) {
      const p = earthPos(day);
      expect(Math.hypot(p.x, p.z)).toBeCloseTo(R_EARTH_AU, 6);
    }
  });

  it('Mars heliocentric distance is constant at R_MARS_AU', () => {
    for (const day of [0, 100, 365, 1000]) {
      const p = marsPos(day);
      expect(Math.hypot(p.x, p.z)).toBeCloseTo(R_MARS_AU, 6);
    }
  });

  it('Earth returns close to its starting position after one sidereal year', () => {
    // T from planets.json is 365.256 days; using 365.25 gives ~0.001
    // rad of residual, hence the 3-decimal tolerance rather than 4.
    const a = earthPos(0);
    const b = earthPos(365.256);
    expect(b.x).toBeCloseTo(a.x, 4);
    expect(b.z).toBeCloseTo(a.z, 4);
  });
});

describe('outboundArc', () => {
  const depPos = { x: R_EARTH_AU, z: 0 };
  const arc = outboundArc(depPos, 200);

  it('returns steps + 1 points', () => {
    expect(arc).toHaveLength(201);
  });

  it('first point sits on Earth orbit (perihelion ν=0)', () => {
    const r = Math.hypot(arc[0].x, arc[0].z);
    expect(r).toBeCloseTo(R_EARTH_AU, 4);
  });

  it('last point sits on Mars orbit (aphelion ν=π)', () => {
    const r = Math.hypot(arc[arc.length - 1].x, arc[arc.length - 1].z);
    expect(r).toBeCloseTo(R_MARS_AU, 4);
  });

  it('midpoint sits at A_TRANSFER (ν=π/2 on the ellipse)', () => {
    // r at ν=π/2 = a(1-e²)/(1) = a*(1-e²) ≈ 0.957·a, not exactly a
    // but the semi-latus rectum.
    const mid = arc[100];
    const r = Math.hypot(mid.x, mid.z);
    const expected = A_TRANSFER * (1 - E_TRANSFER * E_TRANSFER);
    expect(r).toBeCloseTo(expected, 4);
  });

  it('rotates the perihelion direction to match the launch angle', () => {
    // Launch from x-axis: arc[0] should be at (R_EARTH, 0).
    expect(arc[0].x).toBeCloseTo(R_EARTH_AU, 4);
    expect(arc[0].z).toBeCloseTo(0, 6);
    // Launch from y-axis: arc[0] should be at (0, R_EARTH).
    const arcY = outboundArc({ x: 0, z: R_EARTH_AU }, 200);
    expect(arcY[0].x).toBeCloseTo(0, 6);
    expect(arcY[0].z).toBeCloseTo(R_EARTH_AU, 4);
  });
});

describe('returnArc', () => {
  // Use the actual ORRERY-1 geometry: Earth dep at day 333, flyby at
  // 592, return at 842. Earth at day 842 sits BEHIND Mars at day 592
  // in CCW terms (the spacecraft has to loop the long way around).
  const marsArr = marsPos(592);
  const earthRet = earthPos(842);
  const arc = returnArc(marsArr, earthRet, 200);

  it('starts at Mars position', () => {
    expect(arc[0].x).toBeCloseTo(marsArr.x, 4);
    expect(arc[0].z).toBeCloseTo(marsArr.z, 4);
  });

  it('ends at Earth arrival position', () => {
    const last = arc[arc.length - 1];
    expect(last.x).toBeCloseTo(earthRet.x, 4);
    expect(last.z).toBeCloseTo(earthRet.z, 4);
  });

  it('takes the long CCW path (>180°)', () => {
    // Sample radii at three quarters of the arc — they should swing
    // through A_TRANSFER and back toward Earth, with arc length much
    // bigger than the straight-line chord.
    let total = 0;
    for (let i = 1; i < arc.length; i++) {
      total += Math.hypot(arc[i].x - arc[i - 1].x, arc[i].z - arc[i - 1].z);
    }
    const chord = Math.hypot(earthRet.x - marsArr.x, earthRet.z - marsArr.z);
    // Free-return ORRERY-1 sweeps ~321.5°; arc length should be at
    // least 3× the chord (≈ 6.3 / 1.7 ≈ 3.7 in practice).
    expect(total).toBeGreaterThan(chord * 3);
  });

  it('midpoint radius is A_TRANSFER (cosine profile peak)', () => {
    const mid = arc[100];
    const r = Math.hypot(mid.x, mid.z);
    expect(r).toBeCloseTo(A_TRANSFER, 3);
  });
});

describe('spacecraftPos', () => {
  const timeline = { dep_day: 333, flyby_day: 333 + 259, arr_day: 333 + 509 };
  const out = outboundArc({ x: R_EARTH_AU, z: 0 }, 200);
  const ret = returnArc({ x: R_MARS_AU, z: 0 }, { x: -1, z: 0 }, 200);

  it('phase=pre-launch before dep_day', () => {
    expect(spacecraftPos(0, timeline, out, ret).phase).toBe('pre-launch');
  });

  it('phase=outbound between dep and flyby', () => {
    expect(spacecraftPos(timeline.dep_day + 100, timeline, out, ret).phase).toBe('outbound');
  });

  it('phase=return between flyby and arr', () => {
    expect(spacecraftPos(timeline.flyby_day + 100, timeline, out, ret).phase).toBe('return');
  });

  it('phase=arrived after arr_day', () => {
    expect(spacecraftPos(timeline.arr_day + 1, timeline, out, ret).phase).toBe('arrived');
  });

  it('progress goes 0 → 0.5 across outbound, 0.5 → 1 across return', () => {
    expect(spacecraftPos(timeline.dep_day, timeline, out, ret).progress).toBeCloseTo(0, 4);
    expect(spacecraftPos(timeline.flyby_day, timeline, out, ret).progress).toBeCloseTo(0.5, 4);
    expect(spacecraftPos(timeline.arr_day, timeline, out, ret).progress).toBeCloseTo(1, 4);
  });
});

describe('spacecraftHeading', () => {
  const timeline = { dep_day: 333, flyby_day: 333 + 259, arr_day: 333 + 509 };
  const out = outboundArc({ x: R_EARTH_AU, z: 0 }, 200);
  const ret = returnArc({ x: R_MARS_AU, z: 0 }, { x: -1, z: 0 }, 200);

  it('returns a unit vector', () => {
    const h = spacecraftHeading(timeline.dep_day + 50, timeline, out, ret);
    expect(Math.hypot(h.x, h.z)).toBeCloseTo(1, 6);
  });
});
