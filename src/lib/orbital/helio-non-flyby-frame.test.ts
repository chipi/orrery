import { describe, it, expect } from 'vitest';
import {
  computeHelioNonFlybyFrame,
  HELIO_CLOSEUP_R,
  HELIO_EARTH_CLOSEUP_R,
  HELIO_APPROACH_P,
  HELIO_CRUISE_P,
  FLYBY_BODY_R_MULTIPLIER,
  type HelioNonFlybyInputs,
} from './helio-non-flyby-frame';

const BASE = (overrides?: Partial<HelioNonFlybyInputs>): HelioNonFlybyInputs => ({
  phase: 'outbound',
  progress: 0.25,
  scScene: { x: 100, z: 0 },
  destScene: { x: 200, z: 0 },
  earthScene: { x: 0, z: 0 },
  epilogueActive: false,
  endAtEarth: false,
  destSize: 4.5, // Saturn-class
  inOpeningWide: false,
  rEarthAu: 1.0,
  scale3d: 60,
  ...overrides,
});

describe('computeHelioNonFlybyFrame — pre-launch', () => {
  it('opening tableau when inOpeningWide is true', () => {
    const out = computeHelioNonFlybyFrame(
      BASE({ phase: 'pre-launch', inOpeningWide: true, destScene: { x: 300, z: 0 } }),
    );
    expect(out.sub).toBe('opening');
    expect(out.centerX).toBe(0);
    expect(out.centerZ).toBe(0);
    expect(out.targetR).toBeGreaterThanOrEqual(800);
    expect(out.targetP).toBe(0.35);
  });

  it('prelaunch Earth close-up when opening is done', () => {
    const out = computeHelioNonFlybyFrame(
      BASE({ phase: 'pre-launch', inOpeningWide: false, earthScene: { x: 50, z: -10 } }),
    );
    expect(out.sub).toBe('prelaunch');
    expect(out.centerX).toBe(50);
    expect(out.centerZ).toBe(-10);
    expect(out.targetR).toBe(HELIO_EARTH_CLOSEUP_R);
    expect(out.targetP).toBe(HELIO_CRUISE_P);
  });
});

describe('computeHelioNonFlybyFrame — arrived', () => {
  it('epilogue tableau when epilogueActive is true', () => {
    const out = computeHelioNonFlybyFrame(BASE({ phase: 'arrived', epilogueActive: true }));
    expect(out.sub).toBe('epilogue');
    expect(out.centerX).toBe(0);
    expect(out.targetP).toBe(0.35);
  });

  it('round-trip end (endAtEarth = true) closes up on Earth', () => {
    const out = computeHelioNonFlybyFrame(
      BASE({ phase: 'arrived', endAtEarth: true, earthScene: { x: 12, z: -3 } }),
    );
    expect(out.sub).toBe('arrived');
    expect(out.centerX).toBe(12);
    expect(out.centerZ).toBe(-3);
    expect(out.targetR).toBe(HELIO_EARTH_CLOSEUP_R);
  });

  it('one-way arrival with destSize > 0 biases 65 % toward the ship', () => {
    const out = computeHelioNonFlybyFrame(
      BASE({
        phase: 'arrived',
        destSize: 4.8,
        destScene: { x: 1000, z: 0 },
        scScene: { x: 980, z: 5 },
      }),
    );
    expect(out.sub).toBe('arrived');
    expect(out.centerX).toBeCloseTo(1000 * 0.35 + 980 * 0.65, 5);
    expect(out.targetR).toBe(4.8 * FLYBY_BODY_R_MULTIPLIER);
    expect(out.targetP).toBe(HELIO_APPROACH_P);
  });

  it('one-way arrival with destSize 0 falls back to destination-centred closeup', () => {
    const out = computeHelioNonFlybyFrame(
      BASE({ phase: 'arrived', destSize: 0, destScene: { x: 500, z: 100 } }),
    );
    expect(out.sub).toBe('arrived');
    expect(out.centerX).toBe(500);
    expect(out.centerZ).toBe(100);
    expect(out.targetR).toBe(HELIO_CLOSEUP_R);
  });
});

describe('computeHelioNonFlybyFrame — outbound', () => {
  it('depart at progress < 0.025 tracks the spacecraft', () => {
    const out = computeHelioNonFlybyFrame(
      BASE({ phase: 'outbound', progress: 0.01, scScene: { x: 5, z: 1 } }),
    );
    expect(out.sub).toBe('depart');
    expect(out.centerX).toBe(5);
    expect(out.centerZ).toBe(1);
    expect(out.targetR).toBe(HELIO_EARTH_CLOSEUP_R);
  });

  it('cruise-out frames ship + destination at 70/30', () => {
    const out = computeHelioNonFlybyFrame(
      BASE({
        phase: 'outbound',
        progress: 0.2,
        scScene: { x: 100, z: 0 },
        destScene: { x: 300, z: 0 },
      }),
    );
    expect(out.sub).toBe('cruise-out');
    expect(out.centerX).toBeCloseTo(100 * 0.7 + 300 * 0.3, 5); // 160
    expect(out.targetP).toBe(HELIO_CRUISE_P);
  });

  it('approach at progress > 0.4 uses APPROACH_P pitch', () => {
    const out = computeHelioNonFlybyFrame(
      BASE({
        phase: 'outbound',
        progress: 0.45,
        scScene: { x: 280, z: 0 },
        destScene: { x: 300, z: 0 },
      }),
    );
    expect(out.sub).toBe('approach');
    expect(out.targetP).toBe(HELIO_APPROACH_P);
  });

  it('targetR has a floor at 140 on cruise/approach (avoid degenerate tight framing)', () => {
    const out = computeHelioNonFlybyFrame(
      BASE({
        phase: 'outbound',
        progress: 0.2,
        scScene: { x: 0, z: 0 },
        destScene: { x: 0, z: 0 },
        destSize: 0,
      }),
    );
    expect(out.targetR).toBeGreaterThanOrEqual(140);
  });
});

describe('computeHelioNonFlybyFrame — return', () => {
  it('depart-return tracks the spacecraft just past flyby', () => {
    const out = computeHelioNonFlybyFrame(
      BASE({ phase: 'return', progress: 0.51, scScene: { x: 200, z: 0 } }),
    );
    expect(out.sub).toBe('depart-return');
    expect(out.centerX).toBe(200);
    expect(out.targetR).toBe(HELIO_CLOSEUP_R);
  });

  it('cruise-back frames ship + Earth midpoint', () => {
    const out = computeHelioNonFlybyFrame(
      BASE({
        phase: 'return',
        progress: 0.7,
        scScene: { x: 100, z: 0 },
        earthScene: { x: 0, z: 0 },
      }),
    );
    expect(out.sub).toBe('cruise-back');
    expect(out.centerX).toBe(50); // midpoint
  });

  it('approach-earth at progress > 0.95 closes up on Earth', () => {
    const out = computeHelioNonFlybyFrame(
      BASE({ phase: 'return', progress: 0.97, earthScene: { x: 10, z: 5 } }),
    );
    expect(out.sub).toBe('approach-earth');
    expect(out.centerX).toBe(10);
    expect(out.targetR).toBe(HELIO_EARTH_CLOSEUP_R);
    expect(out.targetP).toBe(HELIO_APPROACH_P);
  });
});
