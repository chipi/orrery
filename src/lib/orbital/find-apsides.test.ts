import { describe, it, expect } from 'vitest';
import { findApsidesIndices } from './find-apsides';
import type { Vec2 } from '$lib/mission-arc';

describe('findApsidesIndices', () => {
  it('returns null for fewer than 3 points', () => {
    expect(findApsidesIndices([], 0, 0)).toBeNull();
    expect(findApsidesIndices([{ x: 0, z: 0 }], 0, 0)).toBeNull();
    expect(
      findApsidesIndices(
        [
          { x: 0, z: 0 },
          { x: 1, z: 0 },
        ],
        0,
        0,
      ),
    ).toBeNull();
  });

  it('finds peri (closest) + apo (farthest) measured from the origin (heliocentric case)', () => {
    const arc: Vec2[] = [
      { x: 1.0, z: 0 }, // 1 AU
      { x: 1.5, z: 0 }, // 1.5 AU — apo
      { x: 0.5, z: 0 }, // 0.5 AU — peri
      { x: 1.2, z: 0 },
    ];
    const out = findApsidesIndices(arc, 0, 0);
    expect(out).toEqual({ periIdx: 2, apoIdx: 1 });
  });

  it('measures relative to (centreX, centreZ) for the cislunar case', () => {
    // Trajectory arcs around Earth at (1, 0). Closest point should be
    // the one nearest Earth's xz.
    const earth = { x: 1, z: 0 };
    const arc: Vec2[] = [
      { x: 1.0, z: 0.5 }, // 0.5 from Earth
      { x: 1.2, z: 0.1 }, // ~0.224 from Earth — peri
      { x: 1.0, z: 1.0 }, // 1.0 from Earth — apo
      { x: 1.0, z: 0.3 }, // 0.3 from Earth
    ];
    const out = findApsidesIndices(arc, earth.x, earth.z);
    expect(out).toEqual({ periIdx: 1, apoIdx: 2 });
  });

  it('ties go to the lowest index (matches the original animate-loop behaviour)', () => {
    const arc: Vec2[] = [
      { x: 1, z: 0 }, // distance 1 — first wins peri
      { x: 1, z: 0 }, // also distance 1 — ignored
      { x: 2, z: 0 }, // distance 2 — first wins apo
      { x: 2, z: 0 }, // also distance 2 — ignored
    ];
    const out = findApsidesIndices(arc, 0, 0);
    expect(out).toEqual({ periIdx: 0, apoIdx: 2 });
  });

  it('handles a 3-point arc (minimum supported size)', () => {
    const arc: Vec2[] = [
      { x: 2, z: 0 },
      { x: 0, z: 0 },
      { x: 3, z: 0 },
    ];
    expect(findApsidesIndices(arc, 0, 0)).toEqual({ periIdx: 1, apoIdx: 2 });
  });
});
