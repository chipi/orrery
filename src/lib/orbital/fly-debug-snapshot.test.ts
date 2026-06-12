import { describe, it, expect } from 'vitest';
import {
  buildFlyDebugSnapshot,
  type FlyDebugInputs,
  type FlyDebugSnapshotDev,
} from './fly-debug-snapshot';
import type { FlybyPlanet } from './find-flyby-planet';

const VENUS: FlybyPlanet = { id: 'venus', size: 2.5 };

const BASE_INPUTS = (overrides?: Partial<FlyDebugInputs>): FlyDebugInputs => ({
  isDev: true,
  activeFlybyMet: 193,
  flyby: VENUS,
  spacecraftPos: { x: 1.2, z: -0.7 },
  subPhase: 'flyby-193-venus',
  simDay: -615,
  peakHoldUntil: 12000,
  peakHoldArmedForFlybyMet: 193,
  now: 10500,
  camR: 8.75,
  camTarget: { x: 6.72, y: 0, z: -57.48 },
  ...overrides,
});

describe('buildFlyDebugSnapshot', () => {
  it('production payload is just { flybyId, flybySize }', () => {
    const out = buildFlyDebugSnapshot(BASE_INPUTS({ isDev: false }));
    expect(Object.keys(out).sort()).toEqual(['flybyId', 'flybySize']);
    expect(out).toEqual({ flybyId: 'venus', flybySize: 2.5 });
  });

  it('production payload still ships when there is no active flyby', () => {
    const out = buildFlyDebugSnapshot(
      BASE_INPUTS({ isDev: false, flyby: null, activeFlybyMet: null }),
    );
    expect(out).toEqual({ flybyId: null, flybySize: null });
  });

  it('DEV payload includes the full cinematic state', () => {
    const out = buildFlyDebugSnapshot(BASE_INPUTS()) as FlyDebugSnapshotDev;
    expect(out.flybyId).toBe('venus');
    expect(out.flybySize).toBe(2.5);
    expect(out.activeFlybyMet).toBe(193);
    expect(out.scPos).toEqual({ x: 1.2, z: -0.7 });
    expect(out.subPhase).toBe('flyby-193-venus');
    expect(out.simDay).toBe(-615);
    expect(out.peakHoldUntil).toBe(12000);
    expect(out.peakHoldArmedForFlybyMet).toBe(193);
    expect(out.peakHoldRemainingMs).toBe(1500); // 12000 - 10500
    expect(out.camR).toBe(8.75);
    expect(out.camTx).toBe(6.72);
    expect(out.camTy).toBe(0);
    expect(out.camTz).toBe(-57.48);
  });

  it('peakHoldRemainingMs is clamped to 0 when the hold has expired', () => {
    const out = buildFlyDebugSnapshot(
      BASE_INPUTS({ peakHoldUntil: 5000, now: 8000 }),
    ) as FlyDebugSnapshotDev;
    expect(out.peakHoldRemainingMs).toBe(0);
  });

  it('handles a null flyby cleanly in DEV mode', () => {
    const out = buildFlyDebugSnapshot(
      BASE_INPUTS({ flyby: null, activeFlybyMet: null }),
    ) as FlyDebugSnapshotDev;
    expect(out.flybyId).toBe(null);
    expect(out.flybySize).toBe(null);
    expect(out.activeFlybyMet).toBe(null);
  });

  it('does not leak the input camTarget reference (defensive copy of fields)', () => {
    const inputs = BASE_INPUTS();
    const out = buildFlyDebugSnapshot(inputs) as FlyDebugSnapshotDev;
    inputs.camTarget.x = 999;
    expect(out.camTx).toBe(6.72); // unchanged — caller can mutate later
  });

  it('does not leak the input spacecraftPos reference', () => {
    const inputs = BASE_INPUTS();
    const out = buildFlyDebugSnapshot(inputs) as FlyDebugSnapshotDev;
    inputs.spacecraftPos.x = 999;
    expect(out.scPos).toEqual({ x: 1.2, z: -0.7 });
  });
});
