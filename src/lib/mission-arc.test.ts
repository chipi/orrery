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

  // ─── Multi-destination support (v0.1.6 / ADR-026) ─────────────────

  it('outer-planet (Jupiter): arc starts at Earth, ends at Jupiter orbit', () => {
    const R_JUP = 5.20336; // planets.json
    const arcJ = outboundArc({ x: R_EARTH_AU, z: 0 }, 200, R_JUP);
    expect(Math.hypot(arcJ[0].x, arcJ[0].z)).toBeCloseTo(R_EARTH_AU, 4);
    expect(Math.hypot(arcJ[arcJ.length - 1].x, arcJ[arcJ.length - 1].z)).toBeCloseTo(R_JUP, 3);
  });

  it('inner-planet (Mercury): signed eccentricity flips perihelion to Mercury, aphelion to Earth', () => {
    const R_MER = 0.3871; // planets.json
    const arcM = outboundArc({ x: R_EARTH_AU, z: 0 }, 200, R_MER);
    // ν=0 at Earth (aphelion of the inner-planet transfer ellipse).
    expect(Math.hypot(arcM[0].x, arcM[0].z)).toBeCloseTo(R_EARTH_AU, 4);
    // ν=π at Mercury (perihelion).
    expect(Math.hypot(arcM[arcM.length - 1].x, arcM[arcM.length - 1].z)).toBeCloseTo(R_MER, 3);
  });

  it('inner-planet (Venus): signed eccentricity arc starts at Earth, ends at Venus', () => {
    const R_VEN = 0.72333; // planets.json
    const arcV = outboundArc({ x: R_EARTH_AU, z: 0 }, 200, R_VEN);
    expect(Math.hypot(arcV[0].x, arcV[0].z)).toBeCloseTo(R_EARTH_AU, 4);
    expect(Math.hypot(arcV[arcV.length - 1].x, arcV[arcV.length - 1].z)).toBeCloseTo(R_VEN, 3);
  });

  it('inner-planet arc midpoint lies inside Earth orbit (between aphelion and perihelion)', () => {
    const R_VEN = 0.72333;
    const arcV = outboundArc({ x: R_EARTH_AU, z: 0 }, 200, R_VEN);
    const mid = arcV[100];
    const r = Math.hypot(mid.x, mid.z);
    expect(r).toBeLessThan(R_EARTH_AU);
    expect(r).toBeGreaterThan(R_VEN);
  });

  it('outer-planet arc midpoint lies outside Earth orbit (between perihelion and aphelion)', () => {
    const R_SAT = 9.53707;
    const arcS = outboundArc({ x: R_EARTH_AU, z: 0 }, 200, R_SAT);
    const mid = arcS[100];
    const r = Math.hypot(mid.x, mid.z);
    expect(r).toBeGreaterThan(R_EARTH_AU);
    expect(r).toBeLessThan(R_SAT);
  });

  it('default destA preserves backward-compat with Mars-only signature', () => {
    const arcDefault = outboundArc({ x: R_EARTH_AU, z: 0 }, 200);
    const arcMars = outboundArc({ x: R_EARTH_AU, z: 0 }, 200, R_MARS_AU);
    for (let i = 0; i < arcDefault.length; i++) {
      expect(arcDefault[i].x).toBeCloseTo(arcMars[i].x, 6);
      expect(arcDefault[i].z).toBeCloseTo(arcMars[i].z, 6);
    }
  });
});

describe('destinationPos (v0.1.6)', () => {
  it('returns a position on the destination orbit for each of the 5 destinations', () => {
    const expectedRadii: Record<string, number> = {
      mercury: 0.3871,
      venus: 0.72333,
      mars: 1.52366,
      jupiter: 5.20336,
      saturn: 9.53707,
    };
    // Use a dynamic import inside the test so the file loads its
    // dependency lazily — keeps top-of-file import block tidy.
    return import('./mission-arc').then(({ destinationPos }) => {
      for (const id of ['mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const) {
        const p = destinationPos(0, id);
        expect(Math.hypot(p.x, p.z)).toBeCloseTo(expectedRadii[id], 3);
      }
    });
  });

  it('Mars at any day matches marsPos exactly', async () => {
    const { destinationPos } = await import('./mission-arc');
    for (const day of [0, 100, 500, 1000]) {
      const a = destinationPos(day, 'mars');
      const b = marsPos(day);
      expect(a.x).toBeCloseTo(b.x, 9);
      expect(a.z).toBeCloseTo(b.z, 9);
    }
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

  it('returns a finite unit vector at every phase', () => {
    for (const day of [
      timeline.dep_day - 100, // pre-launch
      timeline.dep_day, // launch
      timeline.flyby_day - 1, // late outbound
      timeline.flyby_day + 1, // early return
      timeline.arr_day, // arrival
      timeline.arr_day + 100, // post-arrival
    ]) {
      const h = spacecraftHeading(day, timeline, out, ret);
      expect(Number.isFinite(h.x)).toBe(true);
      expect(Number.isFinite(h.z)).toBe(true);
      expect(Math.hypot(h.x, h.z)).toBeCloseTo(1, 4);
    }
  });
});

describe('spacecraftPos — edge cases (audit batch 5)', () => {
  const timeline = { dep_day: 333, flyby_day: 333 + 259, arr_day: 333 + 509 };
  const out = outboundArc({ x: R_EARTH_AU, z: 0 }, 200);
  const ret = returnArc({ x: R_MARS_AU, z: 0 }, { x: -1, z: 0 }, 200);

  it('returns a finite position at day 0 (far before launch)', () => {
    const s = spacecraftPos(0, timeline, out, ret);
    expect(s.phase).toBe('pre-launch');
    expect(Number.isFinite(s.pos.x)).toBe(true);
    expect(Number.isFinite(s.pos.z)).toBe(true);
    expect(s.progress).toBe(0);
  });

  it('returns the arrival position at day arr_day + 1000', () => {
    const s = spacecraftPos(timeline.arr_day + 1000, timeline, out, ret);
    expect(s.phase).toBe('arrived');
    expect(s.progress).toBe(1);
    // Position should be the last point on the return arc.
    expect(s.pos).toEqual(ret[ret.length - 1]);
  });

  it('handles a very short transit timeline without producing NaN', () => {
    const tiny = { dep_day: 0, flyby_day: 5, arr_day: 10 };
    const tinyOut = outboundArc({ x: R_EARTH_AU, z: 0 }, 50);
    const tinyRet = returnArc({ x: R_MARS_AU, z: 0 }, { x: -1, z: 0 }, 50);
    const s = spacecraftPos(7, tiny, tinyOut, tinyRet);
    expect(Number.isFinite(s.pos.x)).toBe(true);
    expect(Number.isFinite(s.pos.z)).toBe(true);
    expect(['outbound', 'return']).toContain(s.phase);
  });
});
