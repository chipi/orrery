// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  CATCH_CLOSE_S,
  INSET_HOLD_S,
  INSET_LEAD_S,
  createLandingInset,
  insetPlacement,
  insetWindow,
  landingPose,
  type Landing,
} from './landing-inset';

const psyche: Landing = {
  part: 'strapOns',
  outcome: 'landed',
  site: 'landing-zone',
  siteNames: ['LZ-1', 'LZ-2'],
  landingBurnS: 480,
  touchdownS: 497,
};
const catchL: Landing = {
  part: 'booster',
  outcome: 'caught',
  site: 'tower',
  landingBurnS: 395,
  touchdownS: 420,
};

describe('booster-landing inset pose (0.9.11 F2)', () => {
  it('opens before the landing burn and closes after touchdown', () => {
    expect(insetWindow(psyche)).toEqual([480 - INSET_LEAD_S, 497 + INSET_HOLD_S]);
    expect(landingPose(470, psyche).visible).toBe(false);
    expect(landingPose(473, psyche).visible).toBe(true);
    expect(landingPose(501, psyche).visible).toBe(true);
    expect(landingPose(502, psyche).visible).toBe(false);
  });

  it('falls, slows through the burn to rest on the deck at touchdown', () => {
    const h = [472, 480, 488, 494, 497, 500].map((t) => landingPose(t, psyche).height);
    for (let i = 1; i < h.length; i++) expect(h[i]).toBeLessThanOrEqual(h[i - 1]);
    expect(h[4]).toBe(0);
    // Continuous at the burn's start: no jump in height.
    expect(landingPose(479.999, psyche).height).toBeCloseTo(landingPose(480, psyche).height, 2);
  });

  it('the plume burns only from the landing burn to touchdown', () => {
    expect(landingPose(479, psyche).burning).toBe(false);
    expect(landingPose(480, psyche).burning).toBe(true);
    expect(landingPose(496.9, psyche).burning).toBe(true);
    expect(landingPose(497, psyche).burning).toBe(false);
  });

  it('legs swing out in the last seconds; a caught booster has none, the arms close', () => {
    expect(landingPose(485, psyche).legs).toBe(0);
    expect(landingPose(496, psyche).legs).toBe(1);
    expect(landingPose(494.5, psyche).legs).toBeGreaterThan(0);
    expect(landingPose(410, catchL).legs).toBe(0);
    expect(landingPose(420 - CATCH_CLOSE_S - 0.1, catchL).arms).toBe(0);
    expect(landingPose(420, catchL).arms).toBe(1);
    expect(landingPose(420, psyche).arms).toBe(0);
  });

  it('fits the free band under the flight plan, or is skipped when there is no room', () => {
    expect(insetPlacement(500, 716, 280)).toEqual({ top: 516, width: 280, height: 200 });
    const tight = insetPlacement(560, 716, 280)!;
    expect(tight.height).toBe(156);
    expect(tight.top + tight.height).toBe(716);
    expect(tight.width).toBeCloseTo((156 * 7) / 5, 6);
    expect(insetPlacement(650, 716, 280)).toBeNull(); // < INSET_MIN_H
  });

  it('builds for each recoverable vehicle and its site, and poses without throwing', () => {
    const cases: [string, number, Landing][] = [
      ['falcon-heavy', 2, psyche],
      ['falcon-9', 0, { ...psyche, part: 'booster', site: 'droneship', siteNames: ['OCISLY'] }],
      ['new-glenn', 0, { ...psyche, part: 'booster', site: 'droneship' }],
      ['starship', 0, catchL],
    ];
    for (const [id, n, l] of cases) {
      const inset = createLandingInset(id, n, l);
      expect(inset.update(l.touchdownS - 2, 1.4)).toBe(true);
      expect(inset.update(l.touchdownS + 60, 1.4)).toBe(false);
      inset.dispose();
    }
  });
});
