/**
 * Cinematic state-machine invariant guards.
 *
 * Lock-in tests for the load-bearing properties documented in
 * `docs/reference/fly-cinematic-state-machine.md` §"Invariants the
 * arming logic depends on", §"Composition invariants", and §"Saturn-OI
 * tilt". Each test pins a behaviour that has bitten us in the past —
 * the comment over each `it` references the historical bug it guards.
 */
import { describe, it, expect } from 'vitest';
import {
  createCinematicBeatState,
  resetCinematicBeatState,
  parseFlybyMetFromSubPhase,
} from './fly-cinematic-beats';
import { planFlybyShot, PLANET_COMPOSITION } from '$lib/orbital/flyby-camera-plan';

describe('fly-cinematic invariants', () => {
  // §"Invariants the arming logic depends on" — jumpToMet must clear
  // both peakHoldUntil + peakHoldArmedForFlybyMet, otherwise a second
  // click on the same flyby button finds the prior arm still valid
  // and the freeze never re-fires.
  it('resetCinematicBeatState clears peakHoldUntil + peakHoldArmedForFlybyMet', () => {
    const state = createCinematicBeatState();
    state.peakHoldUntil = 9_999_999;
    state.peakHoldArmedForFlybyMet = 749;
    resetCinematicBeatState(state);
    expect(state.peakHoldUntil).toBe(0);
    expect(state.peakHoldArmedForFlybyMet).toBeNull();
  });

  // §"Invariants the arming logic depends on" — parseFlybyMetFromSubPhase
  // is the single authoritative source for "current flyby" inside the
  // animate loop. Returns null on non-flyby sub-phases so cinema logic
  // doesn't accidentally pick up stale activeFlybyMet from __flyDebug.
  it('parseFlybyMetFromSubPhase returns null for non-flyby sub-phases', () => {
    expect(parseFlybyMetFromSubPhase('cruise-out')).toBeNull();
    expect(parseFlybyMetFromSubPhase('approach')).toBeNull();
    expect(parseFlybyMetFromSubPhase('opening')).toBeNull();
    expect(parseFlybyMetFromSubPhase(null)).toBeNull();
    expect(parseFlybyMetFromSubPhase('')).toBeNull();
    // Returns the parsed MET for actual flyby sub-phases.
    expect(parseFlybyMetFromSubPhase('flyby-749-peak')).toBe(749);
    expect(parseFlybyMetFromSubPhase('flyby-1234.5-afterglow')).toBe(1234.5);
  });

  // §"Composition invariants" — Saturn's pitch lives in
  // PLANET_COMPOSITION.saturn.pitchRad, not as an inline `targetP = 1.25`
  // clobber in /fly. Pre-v2 the cinema loop wrote `targetP = isSaturnOI
  // ? 1.25 : targetP` inline; the override was absorbed here so the 2D
  // FlybyDebugViewer mockup and the 3D scene stay in lockstep.
  it('Saturn pitch is sourced from PLANET_COMPOSITION (NOT an inline /fly override)', () => {
    expect(PLANET_COMPOSITION.saturn.pitchRad).toBe(0.32);
    // Sanity: every entry has the four shape fields the camera plan
    // depends on, so future additions can't silently drop one.
    for (const id of Object.keys(PLANET_COMPOSITION) as Array<keyof typeof PLANET_COMPOSITION>) {
      const c = PLANET_COMPOSITION[id];
      expect(typeof c.camRMultiplier).toBe('number');
      expect(typeof c.pitchRad).toBe('number');
      expect(typeof c.sideAngleRad).toBe('number');
      expect(typeof c.iconicLeadDays).toBe('number');
      expect(typeof c.targetBias).toBe('number');
    }
  });

  // §"Composition invariants" — for `targetBias = 0` the camera target
  // is the PLANET centre, not the ship. v1 anchored on the ship; ship
  // and planet end up co-linear from the camera POV through the ±N-day
  // window around peak, so the iconic shot collapsed to "ship blends
  // into planet". v2 fixes it.
  it('planFlybyShot anchors camTarget on the planet centre when targetBias = 0', () => {
    const peakMet = 100;
    const planetPos = { x: 50, z: -20 };
    const plan = planFlybyShot({
      planetId: 'venus',
      planetPos,
      planetRadius: 6,
      shipPosAtMet: (met: number) => ({ x: peakMet - met, y: 0, z: 0 }),
      peakMet,
    });
    expect(plan).not.toBeNull();
    // Camera looks AT the planet, not at the ship.
    expect(plan!.cameraTarget.x).toBeCloseTo(planetPos.x, 5);
    expect(plan!.cameraTarget.z).toBeCloseTo(planetPos.z, 5);
  });

  // §"Saturn-OI tilt" — the 17° camera.up roll is an external
  // post-process applied at /fly's render block, NOT part of
  // planFlybyShot. No PLANET_COMPOSITION entry should encode a roll
  // axis: if a future contributor adds `rollRad: 0.3` to saturn,
  // both the inline /fly post-process AND the new field would compound
  // and double-tilt the camera. This test pins the contract.
  it('Saturn roll is NOT encoded in PLANET_COMPOSITION (external camera.up post-process only)', () => {
    const composition = PLANET_COMPOSITION.saturn as unknown as Record<string, unknown>;
    expect(composition.rollRad).toBeUndefined();
    expect(composition.cameraUpRoll).toBeUndefined();
    expect(composition.roll).toBeUndefined();
  });
});
