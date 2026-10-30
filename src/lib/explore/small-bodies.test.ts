import { describe, expect, it } from 'vitest';
import { auToPx } from '$lib/scale';
import { SMALL_BODIES, sampleOrbitPoints, smallBodyById, smallBodyPosition } from './small-bodies';

const dist = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

const closed = SMALL_BODIES.filter((b) => b.type !== 'interstellar');
const interstellar = SMALL_BODIES.filter((b) => b.type === 'interstellar');

describe('small bodies', () => {
  it('loads the catalogue and indexes it by id', () => {
    expect(SMALL_BODIES.length).toBeGreaterThan(0);
    expect(closed.length).toBeGreaterThan(0);
    expect(interstellar.length).toBeGreaterThan(0);
    for (const b of SMALL_BODIES) expect(smallBodyById.get(b.id)).toBe(b);
  });

  it('a closed orbit samples to a ring that closes on itself', () => {
    for (const b of closed) {
      const pts = sampleOrbitPoints(b, 360);
      expect(pts).toHaveLength(361);
      expect(dist(pts[0]!, pts[360]!)).toBeLessThan(1e-6 * auToPx(b.a) + 1e-9);
    }
  });

  it('an interstellar trajectory samples to an open curve', () => {
    for (const b of interstellar) {
      const pts = sampleOrbitPoints(b, 200);
      expect(pts).toHaveLength(201);
      const span = Math.max(...pts.map((p) => dist(p, pts[0]!)));
      expect(dist(pts[0]!, pts[200]!)).toBeGreaterThan(0.1 * span);
    }
  });

  // The body has to sit on the ring the scene draws, at any time.
  it('a closed-orbit body sits on its sampled ring at any time', () => {
    for (const b of closed) {
      const ring = sampleOrbitPoints(b, 4000);
      const scale = auToPx(b.a);
      for (const simT of [0, 0.37, 3.7, 41]) {
        const p = smallBodyPosition(b, simT);
        const nearest = Math.min(...ring.map((r) => dist(r, p)));
        expect(nearest).toBeLessThan(0.005 * scale);
      }
    }
  });

  it('an interstellar body is pinned at perihelion (the middle of its curve)', () => {
    for (const b of interstellar) {
      const steps = 200;
      const ring = sampleOrbitPoints(b, steps);
      const p0 = smallBodyPosition(b, 0);
      expect(smallBodyPosition(b, 5)).toEqual(p0);
      expect(dist(p0, ring[steps / 2]!)).toBeLessThan(1e-6 * Math.abs(auToPx(b.a)) + 1e-9);
    }
  });
});
