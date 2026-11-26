import { describe, it, expect } from 'vitest';
import {
  arcMissesBody,
  isPostArrivalEvent,
  parkedAfterArrival,
  postArrivalPass,
} from './post-arrival-pass';

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

describe('the pass as the shot samples it', () => {
  // Halley near perihelion moves ~2.4 scene units a day: the shot holds the body where it is
  // now, so a sample at the 2-day lead must sit beside that position, not where the body was.
  const fast = (met: number) => ({ x: -30 + met * 2.4, z: -60 });
  it('anchored at the current MET, samples follow the body’s current position', () => {
    const now = 446;
    const lead = postArrivalPass(fast, 0.35, 446, 444, now);
    expect(Math.hypot(lead.x - fast(now).x, lead.z - fast(now).z)).toBeLessThan(0.35 * 3);
    // unanchored (the live ship), it rides the body at that MET
    const live = postArrivalPass(fast, 0.35, 446, 444);
    expect(Math.hypot(live.x - fast(444).x, live.z - fast(444).z)).toBeLessThan(0.35 * 3);
  });
});

describe('arcMissesBody (flyby review call 5)', () => {
  it('true when the stored arc passes the body more than 3 radii away at the peak', () => {
    const body = { x: 10, z: 0 };
    expect(arcMissesBody({ x: 10.5, z: 0 }, body, 0.3)).toBe(false); // 1.7 radii
    expect(arcMissesBody({ x: 11, z: 0 }, body, 0.3)).toBe(true); // 3.3 radii
    expect(arcMissesBody(null, body, 0.3)).toBe(true);
  });
});

describe('parkedAfterArrival (Hera at Didymos, review F5)', () => {
  // Didymos 10 days after the rendezvous has moved on 20 M km (11 scene units); the arc ends
  // where it was at the peak.
  const didymos = (met: number) => ({ x: 120, z: (met - 782) * 1.1 });

  it('null through the hero window: the iconic frame keeps the arc', () => {
    expect(parkedAfterArrival(didymos, 0.4, 782, 782)).toBeNull();
    expect(parkedAfterArrival(didymos, 0.4, 782, 783)).toBeNull();
  });

  it('after it, the ship is parked beside the body where it is now, a few radii out', () => {
    const p = parkedAfterArrival(didymos, 0.4, 782, 792)!;
    const b = didymos(792);
    const d = Math.hypot(p.x - b.x, p.z - b.z);
    expect(d).toBeGreaterThan(0.4);
    expect(d).toBeLessThan(0.4 * 3);
  });
});
