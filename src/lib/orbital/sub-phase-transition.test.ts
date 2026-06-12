import { describe, it, expect } from 'vitest';
import { detectSubPhaseTransition } from './sub-phase-transition';

describe('detectSubPhaseTransition', () => {
  it('returns transitioned: false when prev === next (same frame)', () => {
    const out = detectSubPhaseTransition({ prev: 'cruise-out', next: 'cruise-out' });
    expect(out).toEqual({
      transitioned: false,
      enteredFlybyCinema: false,
      exitedFlybyCinema: false,
    });
  });

  it('returns transitioned: true on first frame (prev = null)', () => {
    const out = detectSubPhaseTransition({ prev: null, next: 'launch-pad' });
    expect(out.transitioned).toBe(true);
    expect(out.enteredFlybyCinema).toBe(false);
  });

  it('flags enteredFlybyCinema when crossing INTO a flyby sub-phase', () => {
    const out = detectSubPhaseTransition({
      prev: 'cruise-out',
      next: 'flyby-193-venus',
    });
    expect(out.transitioned).toBe(true);
    expect(out.enteredFlybyCinema).toBe(true);
    expect(out.exitedFlybyCinema).toBe(false);
  });

  it('flags exitedFlybyCinema when crossing OUT of a flyby sub-phase', () => {
    const out = detectSubPhaseTransition({
      prev: 'flyby-193-venus',
      next: 'cruise-out',
    });
    expect(out.transitioned).toBe(true);
    expect(out.enteredFlybyCinema).toBe(false);
    expect(out.exitedFlybyCinema).toBe(true);
  });

  it('a flyby-to-flyby transition counts as transitioned but NEITHER enter NOR exit', () => {
    // Grand-tour mission scrub: user jumps from Cassini Venus #1 → Saturn-OI
    // while sim is paused. The detector should see the change but NOT
    // toggle the moons layer (we're staying in flyby cinema).
    const out = detectSubPhaseTransition({
      prev: 'flyby-193-venus',
      next: 'flyby-2451-saturn',
    });
    expect(out.transitioned).toBe(true);
    expect(out.enteredFlybyCinema).toBe(false);
    expect(out.exitedFlybyCinema).toBe(false);
  });

  it('handles prev = null → flyby (entered, never been anywhere else)', () => {
    const out = detectSubPhaseTransition({ prev: null, next: 'flyby-100-mercury' });
    expect(out.transitioned).toBe(true);
    expect(out.enteredFlybyCinema).toBe(true);
    expect(out.exitedFlybyCinema).toBe(false);
  });

  it('handles flyby-N-body strings with fractional METs (Apollo 13-style)', () => {
    const out = detectSubPhaseTransition({
      prev: 'cruise-out',
      next: 'flyby-3.13-earth',
    });
    expect(out.transitioned).toBe(true);
    expect(out.enteredFlybyCinema).toBe(true);
  });

  it('does NOT treat the empty string as a flyby cinema', () => {
    const out = detectSubPhaseTransition({ prev: '', next: 'cruise-out' });
    expect(out.transitioned).toBe(true);
    expect(out.enteredFlybyCinema).toBe(false);
    expect(out.exitedFlybyCinema).toBe(false);
  });

  it('does NOT match substrings like "preflyby-..." (anchored at start)', () => {
    const out = detectSubPhaseTransition({
      prev: 'cruise-out',
      next: 'preflyby-193-venus',
    });
    expect(out.transitioned).toBe(true);
    expect(out.enteredFlybyCinema).toBe(false);
  });
});
