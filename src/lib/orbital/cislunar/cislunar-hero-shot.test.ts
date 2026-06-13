/**
 * Contract tests for the cislunar hero-shot composition module.
 *
 * Mirrors the shape of `flyby-camera-plan.test.ts` — pin the
 * MOON_COMPOSITION defaults, the per-event lead-days bias, the
 * planCislunarHeroShot math, and the active-hero detector window.
 */
import { describe, it, expect } from 'vitest';
import {
  CISLUNAR_HERO_LEAD_DAYS,
  HERO_APPROACH_DAYS,
  HERO_DEPART_DAYS,
  MOON_COMPOSITION,
  findActiveCislunarHero,
  planCislunarHeroShot,
  type CislunarHeroContext,
} from './cislunar-hero-shot';
import { R_MOON_KM } from './cislunar-geometry';

describe('MOON_COMPOSITION defaults', () => {
  it('has the expected hero-shot tuning', () => {
    expect(MOON_COMPOSITION.camRMultiplier).toBe(4.0);
    expect(MOON_COMPOSITION.sideAngleRad).toBeCloseTo((85 * Math.PI) / 180, 5);
    expect(MOON_COMPOSITION.pitchRad).toBeCloseTo((15 * Math.PI) / 180, 5);
    expect(MOON_COMPOSITION.targetBias).toBe(0);
  });
});

describe('CISLUNAR_HERO_LEAD_DAYS', () => {
  it('covers all four hero event types', () => {
    expect(CISLUNAR_HERO_LEAD_DAYS.loi).toBe(0);
    expect(CISLUNAR_HERO_LEAD_DAYS.tei).toBe(0);
    expect(CISLUNAR_HERO_LEAD_DAYS.descent_start).toBe(0.1);
    expect(CISLUNAR_HERO_LEAD_DAYS.ascent).toBe(-0.1);
  });
});

describe('planCislunarHeroShot', () => {
  // Canonical setup: Moon at +x of the Earth-Moon line; ship
  // approaching from -z (Earth side). LOI at peakMet = 3.13d.
  const moonPos = { x: 384_400, y: 0, z: 0 };
  // Linear approach from -z to +z at 1 km/d (toy units — the math
  // only cares about direction, not magnitude).
  const shipPosAtMet = (met: number): { x: number; y: number; z: number } => ({
    x: 384_400 - 100,
    y: 0,
    z: -100 + met * 30, // moving in +z over time
  });

  const baseCtx: CislunarHeroContext = {
    eventType: 'loi',
    moonPos,
    shipPosAtMet,
    peakMet: 3.13,
  };

  it('returns the iconic MET (peakMet − leadDays) for the event type', () => {
    const plan = planCislunarHeroShot({ ...baseCtx, eventType: 'loi' });
    expect(plan?.iconicMet).toBe(3.13);
    const planAscent = planCislunarHeroShot({ ...baseCtx, eventType: 'ascent', peakMet: 4.34 });
    expect(planAscent?.iconicMet).toBe(4.34 - (-0.1));
  });

  it('positions the camera ~camRMultiplier × R_MOON_KM from the Moon centre', () => {
    const plan = planCislunarHeroShot(baseCtx);
    expect(plan).not.toBeNull();
    const dx = plan!.cameraPos.x - moonPos.x;
    const dy = plan!.cameraPos.y - moonPos.y;
    const dz = plan!.cameraPos.z - moonPos.z;
    const dist = Math.hypot(dx, dy, dz);
    expect(dist).toBeCloseTo(R_MOON_KM * MOON_COMPOSITION.camRMultiplier, 0);
  });

  it('places camera ABOVE the orbital plane at the configured pitch', () => {
    const plan = planCislunarHeroShot(baseCtx);
    expect(plan!.cameraPos.y).toBeGreaterThan(0);
    const camDist = R_MOON_KM * MOON_COMPOSITION.camRMultiplier;
    expect(plan!.cameraPos.y).toBeCloseTo(Math.sin(MOON_COMPOSITION.pitchRad) * camDist, 0);
  });

  it('with targetBias=0 looks straight at the Moon centre', () => {
    const plan = planCislunarHeroShot(baseCtx);
    expect(plan!.cameraTarget.x).toBeCloseTo(moonPos.x, 0);
    expect(plan!.cameraTarget.y).toBeCloseTo(moonPos.y, 0);
    expect(plan!.cameraTarget.z).toBeCloseTo(moonPos.z, 0);
  });

  it('with targetBias=1 looks directly at the ship', () => {
    const plan = planCislunarHeroShot({
      ...baseCtx,
      composition: { ...MOON_COMPOSITION, targetBias: 1 },
    });
    const shipExpected = shipPosAtMet(baseCtx.peakMet);
    expect(plan!.cameraTarget.x).toBeCloseTo(shipExpected.x, 0);
    expect(plan!.cameraTarget.z).toBeCloseTo(shipExpected.z, 0);
  });

  it('returns null when shipPosAtMet has no data at the iconic moment', () => {
    const plan = planCislunarHeroShot({
      ...baseCtx,
      shipPosAtMet: () => null,
    });
    expect(plan).toBeNull();
  });

  it('returns null when the ship has no prior sample for velocity', () => {
    // shipPosAtMet returns data at the iconic moment but not 0.05d earlier
    const plan = planCislunarHeroShot({
      ...baseCtx,
      shipPosAtMet: (met) =>
        met >= baseCtx.peakMet ? shipPosAtMet(met) : null,
    });
    expect(plan).toBeNull();
  });
});

describe('findActiveCislunarHero', () => {
  const depDay = 100;
  const events = [
    { met_days: 0, type: 'launch' },
    { met_days: 0.117, type: 'tli_or_tmi' },
    { met_days: 3.13, type: 'loi' },
    { met_days: 4.25, type: 'descent_start' },
    { met_days: 4.34, type: 'ascent' },
    { met_days: 6.5, type: 'tei' },
    { met_days: 8.13, type: 'earth_return' },
  ];

  it('returns the LOI event when sim is inside its hero window', () => {
    const active = findActiveCislunarHero(events, depDay + 3.13, depDay);
    expect(active).toEqual({ met: 3.13, type: 'loi' });
  });

  it('engages the hero window HERO_APPROACH_DAYS before the event', () => {
    const active = findActiveCislunarHero(
      events,
      depDay + 3.13 - HERO_APPROACH_DAYS + 0.01,
      depDay,
    );
    expect(active?.type).toBe('loi');
  });

  it('disengages after HERO_DEPART_DAYS past the event', () => {
    const active = findActiveCislunarHero(
      events,
      depDay + 3.13 + HERO_DEPART_DAYS + 0.01,
      depDay,
    );
    expect(active).toBeNull();
  });

  it('returns null for non-hero event types (launch / tli / earth_return)', () => {
    const launchActive = findActiveCislunarHero([{ met_days: 0, type: 'launch' }], depDay, depDay);
    expect(launchActive).toBeNull();
  });

  it('returns the FIRST matching event when multiple are in scan order', () => {
    // Two events very close together — array order wins (matches the
    // helio behavior of findActiveFlybyMet).
    const back2back = [
      { met_days: 4.25, type: 'descent_start' },
      { met_days: 4.26, type: 'ascent' },
    ];
    const active = findActiveCislunarHero(back2back, depDay + 4.255, depDay);
    expect(active?.type).toBe('descent_start');
  });
});
