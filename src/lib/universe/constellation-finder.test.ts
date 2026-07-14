import { describe, it, expect } from 'vitest';
import { projectConstellation } from './constellation-finder';

// Two connected segments forming an L, plus a star near one vertex.
const vertices = [
  100,
  0,
  0,
  0,
  100,
  0, // segment A→B
  0,
  100,
  0,
  0,
  0,
  100, // segment B→C
];

describe('projectConstellation', () => {
  it('returns one 2D segment per 3D segment', () => {
    const out = projectConstellation(vertices);
    expect(out.segments).toHaveLength(2);
    for (const [a, b] of out.segments) {
      for (const v of [...a, ...b]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('projects a star direction into the same normalized box', () => {
    const out = projectConstellation(vertices, [100, 5, 0]);
    expect(out.star).not.toBeNull();
    expect(out.star![0]).toBeGreaterThanOrEqual(0);
    expect(out.star![0]).toBeLessThanOrEqual(1);
    expect(out.star![1]).toBeGreaterThanOrEqual(0);
    expect(out.star![1]).toBeLessThanOrEqual(1);
  });

  it('is scale-invariant (only directions matter)', () => {
    const near = projectConstellation(vertices, [100, 5, 0]);
    const far = projectConstellation(
      vertices.map((v) => v * 7),
      [700, 35, 0],
    );
    expect(far.segments[0][0][0]).toBeCloseTo(near.segments[0][0][0], 5);
    expect(far.star![0]).toBeCloseTo(near.star![0], 5);
  });

  it('handles empty input', () => {
    const out = projectConstellation([]);
    expect(out.segments).toHaveLength(0);
    expect(out.star).toBeNull();
  });
});
