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
