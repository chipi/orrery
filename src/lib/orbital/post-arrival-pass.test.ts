import { describe, it, expect } from 'vitest';
import { isPostArrivalEvent, postArrivalPass } from './post-arrival-pass';

describe('flybys after the arrival event (flyby review call 3)', () => {
  it('only events past the transit of a one-way mission', () => {
    expect(isPostArrivalEvent(4730, 3463, true)).toBe(true); // New Horizons at Arrokoth
    expect(isPostArrivalEvent(3463, 3463, true)).toBe(false); // the arrival itself
    expect(isPostArrivalEvent(200, 3463, true)).toBe(false);
    expect(isPostArrivalEvent(4730, 3463, false)).toBe(false); // a return leg has its own arc
  });

  const body = (met: number) => ({ x: 100, z: met * 0.1 }); // 100 out on +x, moving +z
  const size = 0.5;

  it('passes the body outside it, on its sunward side, along its motion', () => {
    const peak = postArrivalPass(body, size, 1000, 1000);
    const c = body(1000);
    // sunward: the camera sits on the ship's side, so it looks at the lit face (Giotto at
    // Grigg-Skjellerup was the night side against the Sun)
    expect(peak.x).toBeLessThan(c.x);
    const d = Math.hypot(peak.x - c.x, peak.y, peak.z - c.z);
    expect(d).toBeGreaterThan(size * 1.5);
    expect(d).toBeLessThan(size * 2.5);
    const before = postArrivalPass(body, size, 1000, 990);
    const after = postArrivalPass(body, size, 1000, 1010);
    // relative to the body, the ship moves along the body’s motion (+z)
    expect(after.z - body(1010).z).toBeGreaterThan(before.z - body(990).z);
    // and is closest at the peak
    const rel = (m: number) => {
      const p = postArrivalPass(body, size, 1000, m);
      const b = body(m);
      return Math.hypot(p.x - b.x, p.y, p.z - b.z);
    };
    expect(rel(1000)).toBeLessThan(rel(995));
    expect(rel(1000)).toBeLessThan(rel(1005));
  });

  it('a static body (no motion) still gets a pass', () => {
    const p0 = postArrivalPass(() => ({ x: 0, z: 50 }), size, 10, 5);
    const p1 = postArrivalPass(() => ({ x: 0, z: 50 }), size, 10, 15);
    expect(Math.hypot(p1.x - p0.x, p1.z - p0.z)).toBeGreaterThan(0);
  });
});
