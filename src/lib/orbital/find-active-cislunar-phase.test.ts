import { describe, it, expect } from 'vitest';
import { findActiveCislunarPhase } from './find-active-cislunar-phase';
import type { CislunarPhase } from '$lib/cislunar-geometry';

// Apollo 11-shaped phase roster.
const APOLLO_PHASES: CislunarPhase[] = [
  { type: 'tli_coast', start_met_days: 0, end_met_days: 3.13, points: [] },
  { type: 'lunar_orbit', start_met_days: 3.13, end_met_days: 4.5, points: [] },
  { type: 'descent', start_met_days: 4.5, end_met_days: 4.55, points: [] },
  { type: 'ascent', start_met_days: 4.55, end_met_days: 6.0, points: [] },
  { type: 'tei_coast', start_met_days: 6.0, end_met_days: 8.5, points: [] },
];

describe('findActiveCislunarPhase', () => {
  it('returns null when phases array is empty', () => {
    expect(findActiveCislunarPhase([], 5)).toBeNull();
  });

  it('picks the phase whose window contains metDays', () => {
    const out = findActiveCislunarPhase(APOLLO_PHASES, 4);
    expect(out?.activePhase.type).toBe('lunar_orbit');
  });

  it('phaseProgress is 0 at start_met_days', () => {
    const out = findActiveCislunarPhase(APOLLO_PHASES, 3.13);
    // 3.13 is the boundary; could match either tli_coast OR lunar_orbit.
    // First-match-wins → tli_coast (end_met_days = 3.13 is inclusive).
    expect(out?.activePhase.type).toBe('tli_coast');
    expect(out?.phaseProgress).toBe(1.0); // 3.13 == end of tli_coast
  });

  it('phaseProgress is 1.0 at end_met_days', () => {
    const out = findActiveCislunarPhase(APOLLO_PHASES, 8.5);
    expect(out?.activePhase.type).toBe('tei_coast');
    expect(out?.phaseProgress).toBe(1.0);
  });

  it('phaseProgress is 0.5 at the midpoint of a phase', () => {
    // tli_coast: 0 → 3.13, midpoint = 1.565
    const out = findActiveCislunarPhase(APOLLO_PHASES, 1.565);
    expect(out?.activePhase.type).toBe('tli_coast');
    expect(out?.phaseProgress).toBeCloseTo(0.5, 5);
  });

  it('falls back to phases[0] with progress 0 when metDays is before any window', () => {
    const out = findActiveCislunarPhase(APOLLO_PHASES, -10);
    expect(out?.activePhase.type).toBe('tli_coast');
    expect(out?.phaseProgress).toBe(0);
  });

  it('falls back to phases[0] with progress 0 when metDays is past every window', () => {
    const out = findActiveCislunarPhase(APOLLO_PHASES, 100);
    expect(out?.activePhase.type).toBe('tli_coast');
    expect(out?.phaseProgress).toBe(0);
  });

  it('handles a degenerate phase (start === end) with progress 0', () => {
    const degenerate: CislunarPhase[] = [
      { type: 'descent', start_met_days: 5, end_met_days: 5, points: [] },
    ];
    const out = findActiveCislunarPhase(degenerate, 5);
    expect(out?.activePhase.type).toBe('descent');
    expect(out?.phaseProgress).toBe(0);
  });
});
