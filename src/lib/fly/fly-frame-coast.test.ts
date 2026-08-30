import { describe, it, expect } from 'vitest';
import { sampleForwardArc, integrateEarthCoastPreview } from './fly-frame-coast';
import { R_EARTH_KM } from '$lib/orbital/cislunar/cislunar-geometry';
import type { Vec2 } from '$lib/physics/transfer/mission-arc';

// Pure coast-preview geometry builders (RFC-036 WS-B/B4). Lock the forward-arc
// sampling window + the two-body Euler integrator (constants + collision cutoff).

describe('sampleForwardArc', () => {
  const arc: Vec2[] = [
    { x: 0, z: 0 },
    { x: 1, y: 2, z: 3 },
    { x: 4, z: 5 },
    { x: 6, z: 7 },
    { x: 8, z: 9 },
  ]; // 5 points

  it('samples from the current fraction to the terminus, scaled', () => {
    // t=0.5 → startIdx = floor(0.5 * 4) = 2 → samples = 5-2 = 3 points.
    const buf = sampleForwardArc(arc, 0.5, 10);
    expect(buf.length).toBe(3 * 3);
    // first sampled point = arc[2] = {4,0,5} × 10.
    expect(buf[0]).toBe(40);
    expect(buf[1]).toBe(0);
    expect(buf[2]).toBe(50);
  });

  it('t=0 samples the whole arc; carries the optional y', () => {
    const buf = sampleForwardArc(arc, 0, 1);
    expect(buf.length).toBe(5 * 3);
    expect(buf[3]).toBe(1); // arc[1].x
    expect(buf[4]).toBe(2); // arc[1].y
    expect(buf[5]).toBe(3); // arc[1].z
  });

  it('clamps t outside [0,1]', () => {
    expect(sampleForwardArc(arc, 5, 1).length).toBe(3); // clamps to 1 → startIdx 4 → 1 point
    expect(sampleForwardArc(arc, -3, 1).length).toBe(5 * 3); // clamps to 0
  });
});

describe('integrateEarthCoastPreview', () => {
  it('returns a full 201-point buffer, first point = scaled start', () => {
    const buf = integrateEarthCoastPreview({ x: 7000, y: 0, z: 0 }, { x: 0, y: 7.5, z: 0 }, 2);
    expect(buf.length).toBe(201 * 3);
    expect(buf[0]).toBe(14000); // 7000 × 2
    expect(buf[1]).toBe(0);
  });

  it('marches forward: the first step moves the point and stays above the surface', () => {
    // The preview is a coarse 600 s-step Euler march (visual, not an accurate
    // propagator). Robust properties: it actually steps (point 1 ≠ point 0) and a
    // high-altitude start is still above Earth after one step.
    const buf = integrateEarthCoastPreview({ x: 20000, y: 0, z: 0 }, { x: 0, y: 3, z: 0 }, 1);
    expect(buf[3]).not.toBe(buf[0]); // x moved (velocity carried it)
    const r1 = Math.hypot(buf[3], buf[4], buf[5]);
    expect(r1).toBeGreaterThan(R_EARTH_KM);
  });

  it('a sub-orbital (near-zero velocity) state falls to collision → trailing zeros', () => {
    const buf = integrateEarthCoastPreview({ x: 7000, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1);
    // With ~no tangential velocity it plummets straight down and collides before
    // step 200, leaving trailing zeros.
    const lastIdx = 200 * 3;
    expect(buf[lastIdx]).toBe(0);
    expect(buf[lastIdx + 1]).toBe(0);
  });
});
