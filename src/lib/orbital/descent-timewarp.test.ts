import { describe, it, expect } from 'vitest';
import {
  ENTRY_TIMELINE_FRAC,
  terminalStartTime,
  warpDescentTime,
  unwarpDescentTime,
} from './descent-timewarp';

const DUR = 351;
const TB = 213; // curiosity-like: ballistic entry ends ~60% into trajectory time

describe('terminalStartTime', () => {
  it('returns the first non-ballistic state time', () => {
    const states = [
      { t: 0, phaseKind: 'ballistic_entry' },
      { t: 100, phaseKind: 'ballistic_entry' },
      { t: 213, phaseKind: 'parachute' },
      { t: 300, phaseKind: 'powered_retro' },
    ];
    expect(terminalStartTime(states, DUR)).toBe(213);
  });

  it('falls back to 0.9·duration when every state is ballistic', () => {
    const states = [
      { t: 0, phaseKind: 'ballistic_entry' },
      { t: 100, phaseKind: 'ballistic_entry' },
    ];
    expect(terminalStartTime(states, DUR)).toBeCloseTo(DUR * 0.9);
  });
});

describe('warp/unwarp are exact inverses', () => {
  it('round-trips across the whole timeline', () => {
    for (let raw = 0; raw <= DUR; raw += 7) {
      const traj = warpDescentTime(raw, DUR, TB);
      expect(unwarpDescentTime(traj, DUR, TB)).toBeCloseTo(raw, 4);
    }
  });

  it('maps the knee: entryFrac·dur (raw) ↔ terminalStartT (traj)', () => {
    const knee = ENTRY_TIMELINE_FRAC * DUR;
    expect(warpDescentTime(knee, DUR, TB)).toBeCloseTo(TB, 4);
    expect(unwarpDescentTime(TB, DUR, TB)).toBeCloseTo(knee, 4);
  });

  it('endpoints are fixed', () => {
    expect(warpDescentTime(0, DUR, TB)).toBe(0);
    expect(warpDescentTime(DUR, DUR, TB)).toBeCloseTo(DUR, 4);
  });
});

describe('warp expands the terminal', () => {
  it('the terminal EDL owns (1-entryFrac) of the scrubber', () => {
    // Entry (traj 0..TB) compresses into the first entryFrac of the scrubber;
    // the terminal (traj TB..dur) expands to own the remaining (1-entryFrac).
    const rawAtTerminalStart = unwarpDescentTime(TB, DUR, TB);
    expect(rawAtTerminalStart / DUR).toBeCloseTo(ENTRY_TIMELINE_FRAC, 4);
    const terminalScrubberShare = (DUR - rawAtTerminalStart) / DUR;
    expect(terminalScrubberShare).toBeCloseTo(1 - ENTRY_TIMELINE_FRAC, 4);
    // Real terminal is only ~39% of trajectory time — the warp gives it 55%.
    expect(terminalScrubberShare).toBeGreaterThan((DUR - TB) / DUR);
  });
});

describe('degenerate durations', () => {
  it('returns the input when duration ≤ 0', () => {
    expect(warpDescentTime(5, 0, 0)).toBe(5);
    expect(unwarpDescentTime(5, 0, 0)).toBe(5);
  });
});
