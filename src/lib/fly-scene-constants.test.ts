import { describe, it, expect } from 'vitest';
import {
  SCALE_3D,
  GRAVITY_ASSIST_CAVEAT_DESTINATIONS,
  DESTINATION_LABEL_COLORS,
  cameraDistanceFor,
} from './fly-scene-constants';
import { DESTINATIONS, type DestinationId } from './lambert-grid.constants';

describe('SCALE_3D', () => {
  it('matches the /fly heliocentric scene scale (1 AU = 80u)', () => {
    expect(SCALE_3D).toBe(80);
  });
});

describe('GRAVITY_ASSIST_CAVEAT_DESTINATIONS', () => {
  it('covers all giants + Pluto (ADR-028 direct-Hohmann caveat)', () => {
    expect(GRAVITY_ASSIST_CAVEAT_DESTINATIONS.sort()).toEqual(
      ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].sort(),
    );
  });

  it('does not include the inner system or asteroid-belt bodies', () => {
    for (const inner of [
      'mercury',
      'venus',
      'mars',
      'ceres',
      'vesta',
      'psyche',
      'bennu',
    ] as DestinationId[]) {
      expect(GRAVITY_ASSIST_CAVEAT_DESTINATIONS).not.toContain(inner);
    }
  });
});

describe('DESTINATION_LABEL_COLORS', () => {
  it('has an entry for every porkchop destination + moon', () => {
    const keys = Object.keys(DESTINATIONS) as DestinationId[];
    for (const id of keys) {
      expect(DESTINATION_LABEL_COLORS[id]).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(DESTINATION_LABEL_COLORS.moon).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('cameraDistanceFor', () => {
  it('moonMode returns the Earth+Moon framing distance regardless of destination', () => {
    expect(cameraDistanceFor('mars', true)).toBe(100);
    expect(cameraDistanceFor('jupiter', true)).toBe(100);
  });

  it('floors at 180u for inner-system destinations (Mars at 1.52 AU * 80 * 2 = 243 > 180)', () => {
    const d = cameraDistanceFor('mars', false);
    expect(d).toBeGreaterThanOrEqual(180);
  });

  it('mercury falls below 2 × orbit and hits the 180u floor', () => {
    // Mercury a ≈ 0.39 AU → 0.39 * 80 * 2 = 62.4, well under 180.
    expect(cameraDistanceFor('mercury', false)).toBe(180);
  });

  it('outer destinations scale with semi-major axis × 2', () => {
    const j = cameraDistanceFor('jupiter', false);
    const expected = DESTINATIONS.jupiter.a * SCALE_3D * 2;
    expect(j).toBeCloseTo(expected, 6);
    expect(j).toBeGreaterThan(180);
  });
});
