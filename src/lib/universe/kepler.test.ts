import { describe, it, expect } from 'vitest';
import {
  normalizeAngle,
  eccentricAnomaly,
  orbitalPlanePosition,
  meanAnomaly,
  phaseForIndex,
  sampleEllipse,
} from './kepler';

const TAU = Math.PI * 2;

describe('normalizeAngle', () => {
  it('wraps into [0, 2π)', () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(-0.1)).toBeCloseTo(TAU - 0.1, 10);
    expect(normalizeAngle(TAU + 1)).toBeCloseTo(1, 10);
  });
});

describe('eccentricAnomaly', () => {
  it('solves Kepler for a circular orbit (E = M)', () => {
    for (const M of [0.3, 1.5, 3.0, 5.5]) {
      expect(eccentricAnomaly(M, 0)).toBeCloseTo(normalizeAngle(M), 9);
    }
  });
  it('satisfies M = E − e·sin E for eccentric orbits', () => {
    for (const e of [0.1, 0.4, 0.7, 0.95]) {
      for (const M of [0.2, 1.1, 2.6, 4.9]) {
        const E = eccentricAnomaly(M, e);
        expect(E - e * Math.sin(E)).toBeCloseTo(normalizeAngle(M), 8);
      }
    }
  });
});

describe('orbitalPlanePosition', () => {
  it('places periastron on the +x axis at r = a(1−e)', () => {
    const { x, y } = orbitalPlanePosition(2, 0.5, 0); // M=0 → periastron
    expect(x).toBeCloseTo(2 * (1 - 0.5), 9);
    expect(y).toBeCloseTo(0, 9);
  });
  it('places apoastron on the −x axis at r = a(1+e)', () => {
    const { x, y } = orbitalPlanePosition(2, 0.5, Math.PI); // M=π → apoastron
    expect(x).toBeCloseTo(-2 * (1 + 0.5), 9);
    expect(y).toBeCloseTo(0, 8);
  });
  it('is a circle of radius a when e = 0', () => {
    for (const M of [0.5, 1.7, 3.9]) {
      const { x, y } = orbitalPlanePosition(3, 0, M);
      expect(Math.hypot(x, y)).toBeCloseTo(3, 9);
    }
  });
});

describe('meanAnomaly', () => {
  it('advances by 2π over one full period', () => {
    const P = 100; // days
    const yr = P / 365.25;
    expect(meanAnomaly(yr, P) - meanAnomaly(0, P)).toBeCloseTo(TAU, 9);
  });
  it('applies the phase offset', () => {
    expect(meanAnomaly(0, 10, 1.23)).toBeCloseTo(1.23, 12);
  });
});

describe('phaseForIndex', () => {
  it('is deterministic and in range', () => {
    for (let i = 0; i < 7; i++) {
      const p = phaseForIndex(i, 7);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(TAU);
      expect(phaseForIndex(i, 7)).toBe(p);
    }
  });
  it('spreads planets apart (no two equal for a small system)', () => {
    const phases = [0, 1, 2, 3].map((i) => phaseForIndex(i, 4));
    expect(new Set(phases.map((p) => p.toFixed(4))).size).toBe(4);
  });
});

describe('sampleEllipse', () => {
  it('returns segments+1 closed-loop points', () => {
    const pts = sampleEllipse(2, 0.3, 64);
    expect(pts.length).toBe(65);
    expect(pts[0][0]).toBeCloseTo(pts[64][0], 9);
    expect(pts[0][1]).toBeCloseTo(pts[64][1], 9);
  });
  it('spans periastron and apoastron on the x axis', () => {
    const pts = sampleEllipse(2, 0.5, 128);
    const xs = pts.map((p) => p[0]);
    expect(Math.max(...xs)).toBeCloseTo(2 * (1 - 0.5), 6); // +x periastron
    expect(Math.min(...xs)).toBeCloseTo(-2 * (1 + 0.5), 6); // −x apoastron
  });
});
