import { describe, it, expect } from 'vitest';
import { solveLambert } from './lambert';

const MU_SUN = 4 * Math.PI ** 2;
const AU_PER_YR_TO_KMS = 4.7404;

// Near-opposition geometry: Mars at 165° from Earth's launch direction.
// At this angle, the Hohmann-like minimum-energy transfer has TOF ~250 days,
// so any TOF below that is comfortably feasible on the short-way bisection.
const r1: [number, number] = [1.0, 0];
const r2: [number, number] = [1.524 * Math.cos(2.88), 1.524 * Math.sin(2.88)];

describe('solveLambert', () => {
  it('finds a solution for a typical Earth-Mars transfer (220 day TOF, Mars at 165°)', () => {
    const tof = 220 / 365.25;
    const result = solveLambert(r1, r2, tof, MU_SUN);
    expect(result).not.toBeNull();
    expect(result!.a).toBeGreaterThan(1.0); // transfer ellipse encloses Earth orbit
    expect(result!.a).toBeLessThan(2.5);
    // Departure speed > Earth circular speed (29.78 km/s)
    expect(result!.v1 * AU_PER_YR_TO_KMS).toBeGreaterThan(29);
    expect(result!.v1 * AU_PER_YR_TO_KMS).toBeLessThan(45);
    // Arrival speed reasonable (<35 km/s)
    expect(result!.v2 * AU_PER_YR_TO_KMS).toBeLessThan(35);
  });

  it('returns null when TOF is below the parabolic minimum', () => {
    // Same direction, very short TOF — physically infeasible
    const r2Aligned: [number, number] = [1.524, 0];
    expect(solveLambert(r1, r2Aligned, 1 / 365.25, MU_SUN)).toBeNull();
  });

  it('returns null when TOF exceeds the maximum achievable on short-way Lambert', () => {
    // Same near-opposition geometry, but 600-day TOF is slower than the
    // minimum-energy ellipse can produce (max ~250 days at this angle).
    const tof = 600 / 365.25;
    expect(solveLambert(r1, r2, tof, MU_SUN)).toBeNull();
  });

  it('result satisfies vis-viva at both endpoints (a, v1, v2 self-consistent)', () => {
    const tof = 220 / 365.25;
    const r = solveLambert(r1, r2, tof, MU_SUN);
    expect(r).not.toBeNull();
    const r1mag = Math.hypot(r1[0], r1[1]);
    const r2mag = Math.hypot(r2[0], r2[1]);
    const v1Check = Math.sqrt(MU_SUN * (2 / r1mag - 1 / r!.a));
    const v2Check = Math.sqrt(MU_SUN * (2 / r2mag - 1 / r!.a));
    expect(r!.v1).toBeCloseTo(v1Check, 6);
    expect(r!.v2).toBeCloseTo(v2Check, 6);
  });
});
