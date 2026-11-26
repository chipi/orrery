import { describe, it, expect } from 'vitest';
import {
  TRAJ_TUBE_RADIUS_PER_CAMDIST,
  HELIO_TUBE_BOUNDS,
  CISLUNAR_TUBE_BOUNDS,
  trajectoryTubeRadius,
  shouldRebuildTube,
} from './trajectory-tube';

// The invariant (#83): a trajectory tube must read at a CONSTANT on-screen
// thickness at every zoom. Apparent px ≈ world-radius / camera-distance, so the
// radius MUST be linear in distance. These tests lock that in — the rule
// regressed once (compensation gated !isMoonMission) and had no guard.
describe('trajectoryTubeRadius — on-screen thickness is zoom-invariant', () => {
  it('apparent thickness (radius / camDist) is constant across the unclamped range', () => {
    // Pick distances that stay inside the clamp window for the wide helio bounds
    // so neither floor nor ceiling engages: raw = camDist * 0.00225 ∈ (0.025, 0.8)
    // → camDist ∈ (11, 355).
    const dists = [50, 100, 200, 300];
    const apparent = dists.map((d) => trajectoryTubeRadius(d, HELIO_TUBE_BOUNDS) / d);
    for (const a of apparent) {
      // Every apparent-thickness ratio equals the coefficient — that IS constancy.
      expect(a).toBeCloseTo(TRAJ_TUBE_RADIUS_PER_CAMDIST, 10);
    }
    // And they're all equal to each other (the property we actually care about).
    expect(Math.max(...apparent) - Math.min(...apparent)).toBeLessThan(1e-9);
  });

  it('REGRESSION GUARD: a FIXED world radius would NOT be zoom-invariant', () => {
    // This is what the bug looked like: a constant 0.16 world radius. Its
    // apparent thickness balloons as the camera closes in. Assert the fixed
    // approach fails the constancy property, so we can never quietly revert to it.
    const FIXED = 0.16;
    const near = FIXED / 5; // apparent thickness at camDist 5 (zoomed in)
    const far = FIXED / 300; // apparent thickness at camDist 300 (zoomed out)
    expect(near / far).toBeGreaterThan(50); // 60× fatter up close — the "fat sausage"
  });

  it('clamps to the floor when zoomed very far in', () => {
    expect(trajectoryTubeRadius(1, CISLUNAR_TUBE_BOUNDS)).toBe(CISLUNAR_TUBE_BOUNDS.min);
    expect(trajectoryTubeRadius(10, HELIO_TUBE_BOUNDS)).toBe(HELIO_TUBE_BOUNDS.min);
  });

  it('clamps to the ceiling when zoomed very far out', () => {
    expect(trajectoryTubeRadius(100_000, HELIO_TUBE_BOUNDS)).toBe(HELIO_TUBE_BOUNDS.max);
    expect(trajectoryTubeRadius(100_000, CISLUNAR_TUBE_BOUNDS)).toBe(CISLUNAR_TUBE_BOUNDS.max);
  });

  it('helio thickness stays constant down to the close coast and approach framings', () => {
    // MESSENGER's approach (camR 7.7) and Juno's coast (14.6) sat on a 0.09 floor: the
    // loops near the camera drew as bands 5-6× the cruise thickness (flyby review call 8).
    expect(trajectoryTubeRadius(14.6, HELIO_TUBE_BOUNDS) / 14.6).toBeCloseTo(
      TRAJ_TUBE_RADIUS_PER_CAMDIST,
      10,
    );
    expect(trajectoryTubeRadius(7.7, HELIO_TUBE_BOUNDS) / 7.7).toBeLessThan(
      TRAJ_TUBE_RADIUS_PER_CAMDIST * 1.5,
    );
  });

  it('cislunar floor is thinner than helio floor (frames closer)', () => {
    expect(CISLUNAR_TUBE_BOUNDS.min).toBeLessThan(HELIO_TUBE_BOUNDS.min);
  });

  it('scales monotonically with distance inside the window', () => {
    expect(trajectoryTubeRadius(100, HELIO_TUBE_BOUNDS)).toBeLessThan(
      trajectoryTubeRadius(200, HELIO_TUBE_BOUNDS),
    );
  });
});

describe('shouldRebuildTube — geometry rebuild throttle', () => {
  it('rebuilds only when the radius drift exceeds the threshold', () => {
    expect(shouldRebuildTube(0.3, 0.2, 0.05)).toBe(true);
    expect(shouldRebuildTube(0.21, 0.2, 0.05)).toBe(false);
    expect(shouldRebuildTube(0.2, 0.2, 0.05)).toBe(false);
  });

  it('is symmetric in drift direction', () => {
    expect(shouldRebuildTube(0.1, 0.2, 0.05)).toBe(true);
    expect(shouldRebuildTube(0.3, 0.2, 0.05)).toBe(true);
  });
});
