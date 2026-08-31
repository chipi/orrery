import { describe, it, expect } from 'vitest';
import { fidelityStyle } from './figure-style';
import type { Fidelity } from '$lib/physics/spec';

// Register golden-master (Fable-5 r5 NEW-2).
// All three fidelity registers MUST be visually distinct on stroke, dasharray,
// AND registerClass. This test is the enforceable contract — no pixel baselines needed.
describe('fidelityStyle register golden-master', () => {
  const fidelities: Fidelity[] = ['computed', 'geometric', 'replayed-published'];
  const styles = fidelities.map((f) => ({ f, s: fidelityStyle(f) }));

  it('all three registers differ pairwise on stroke', () => {
    const strokes = styles.map(({ s }) => s.stroke);
    const unique = new Set(strokes);
    expect(unique.size).toBe(3);
  });

  it('all three registers differ pairwise on dasharray', () => {
    const dasharrays = styles.map(({ s }) => s.dasharray);
    const unique = new Set(dasharrays);
    expect(unique.size).toBe(3);
  });

  it('all three registers differ pairwise on registerClass', () => {
    const classes = styles.map(({ s }) => s.registerClass);
    const unique = new Set(classes);
    expect(unique.size).toBe(3);
  });

  it('computed is solid teal at full opacity', () => {
    const s = fidelityStyle('computed');
    expect(s.stroke).toBe('#4ecdc4');
    expect(s.dasharray).toBe('none');
    expect(s.opacity).toBe(1);
    expect(s.registerClass).toBe('fidelity-computed');
  });

  it('geometric is dashed and distinct from computed', () => {
    const s = fidelityStyle('geometric');
    expect(s.dasharray).not.toBe('none');
    expect(s.stroke).not.toBe('#4ecdc4');
    expect(s.registerClass).toBe('fidelity-geometric');
  });

  it('replayed-published is dotted and distinct from geometric', () => {
    const sg = fidelityStyle('geometric');
    const sr = fidelityStyle('replayed-published');
    expect(sr.dasharray).not.toBe(sg.dasharray);
    expect(sr.stroke).not.toBe(sg.stroke);
    expect(sr.registerClass).toBe('fidelity-replayed');
  });
});

import { niceTicks, fmtTick } from './figure-style';

describe('niceTicks · axis tick generation', () => {
  it('linear: round steps spanning the range', () => {
    const t = niceTicks(0, 100, 'linear');
    expect(t[0]).toBe(0);
    expect(t.at(-1)).toBeLessThanOrEqual(100);
    // steps are equal + round
    const step = t[1] - t[0];
    expect([1, 2, 5, 10, 20, 25, 50].includes(step)).toBe(true);
    expect(t.length).toBeGreaterThanOrEqual(3);
  });

  it('linear: handles a valley range crossing zero (frozen-orbit drift)', () => {
    const t = niceTicks(-0.6, 0.9, 'linear');
    expect(t.some((v) => v < 0)).toBe(true);
    expect(t.some((v) => v > 0)).toBe(true);
  });

  it('log: one tick per decade', () => {
    expect(niceTicks(1, 1000, 'log')).toEqual([1, 10, 100, 1000]);
  });

  it('degenerate + non-finite ranges do not throw', () => {
    expect(niceTicks(5, 5, 'linear')).toEqual([5]);
    expect(niceTicks(Infinity, NaN, 'linear')).toEqual([]);
  });
});

describe('fmtTick · compact tick labels', () => {
  it('drops float noise and keeps integers clean', () => {
    expect(fmtTick(0)).toBe('0');
    expect(fmtTick(42)).toBe('42');
    expect(fmtTick(0.30000000000000004)).toBe('0.3');
  });
  it('uses an exponent only for extremes (≥ 1e5)', () => {
    expect(fmtTick(35786)).toBe('35786'); // < 1e5 → stays plain
    expect(fmtTick(120000)).toContain('e'); // ≥ 1e5 → exponent
  });
});
