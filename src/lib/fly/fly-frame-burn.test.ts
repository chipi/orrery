import { describe, it, expect } from 'vitest';
import { findActiveBurn, burnExhaustDir, BURN_TABLE } from './fly-frame-burn';
import type { FlightTimelineEvent } from '$types/mission';

// Pure engine-plume burn logic (RFC-036 WS-B/B4). Locks the in-window burn
// selection + the exhaust-direction math.

const ev = (type: string, met: number | null): FlightTimelineEvent =>
  ({ type, met_days: met }) as FlightTimelineEvent;

describe('findActiveBurn', () => {
  it('ignores event types not in the burn table + events with no MET', () => {
    expect(findActiveBurn([ev('flyby', 10), ev('launch', null)], 10)).toBeNull();
  });

  it('selects an in-window burn and reports days-from-event', () => {
    // tcm window = default 2 days. simMet 11 → tcm@10 is 1 day away → active.
    const b = findActiveBurn([ev('tcm', 10)], 11);
    expect(b).toEqual({ type: 'tcm', met_days: 10, daysFromEvent: 1 });
  });

  it('respects the launch per-type window override (5 days, wider than default)', () => {
    // launch@0, simMet 4 → 4 days away > default 2 but ≤ launch window 5 → active.
    expect(findActiveBurn([ev('launch', 0)], 4)?.type).toBe('launch');
    // simMet 6 → 6 > 5 → out of window.
    expect(findActiveBurn([ev('launch', 0)], 6)).toBeNull();
  });

  it('picks the CLOSEST burn when several are in window', () => {
    // both tli_or_tmi@10 and tcm@13 within window of simMet 12 (2 & 1 days).
    const b = findActiveBurn([ev('tli_or_tmi', 10), ev('tcm', 13)], 12);
    expect(b?.type).toBe('tcm'); // 1 day < 2 days
  });
});

describe('burnExhaustDir', () => {
  const sc = { x: 100, z: 0 };

  it('inward: unit vector from spacecraft toward Earth', () => {
    const d = burnExhaustDir('inward', 0, 0, { x: 0, z: 0 }, sc);
    expect(d.exDx).toBeCloseTo(-1, 6); // toward origin (−x)
    expect(d.exDz).toBeCloseTo(0, 6);
  });

  it('retro: opposite the velocity (normalised)', () => {
    const d = burnExhaustDir('retro', 3, 4, { x: 0, z: 0 }, sc);
    expect(d.exDx).toBeCloseTo(-0.6, 6);
    expect(d.exDz).toBeCloseTo(-0.8, 6);
  });

  it('pro: along the velocity (normalised)', () => {
    const d = burnExhaustDir('pro', 3, 4, { x: 0, z: 0 }, sc);
    expect(d.exDx).toBeCloseTo(0.6, 6);
    expect(d.exDz).toBeCloseTo(0.8, 6);
  });

  it('retro/pro fall back to zero when velocity is ~0', () => {
    expect(burnExhaustDir('retro', 0, 0, { x: 0, z: 0 }, sc)).toEqual({ exDx: 0, exDz: 0 });
    expect(burnExhaustDir('pro', 0, 0, { x: 0, z: 0 }, sc)).toEqual({ exDx: 0, exDz: 0 });
  });
});

describe('BURN_TABLE', () => {
  it('carries the four burn types with their modes', () => {
    expect(BURN_TABLE.launch.mode).toBe('inward');
    expect(BURN_TABLE.launch.windowDays).toBe(5);
    expect(BURN_TABLE.edl_or_oi.mode).toBe('pro');
  });
});
