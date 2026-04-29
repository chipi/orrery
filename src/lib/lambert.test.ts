import { describe, it, expect } from 'vitest';
import { solveLambert, lambertTOF } from './lambert';

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

  // Round-trip: feed the returned `a` back into lambertTOF and verify it
  // reproduces the input TOF. This is the strongest physical correctness
  // check — vis-viva self-consistency only verifies the final velocity
  // calc, not the bisection's choice of `a`.
  it('round-trip: lambertTOF(solveLambert(...).a) ≈ input TOF', () => {
    const cases = [
      { tof: 200 / 365.25 }, // fast transfer
      { tof: 240 / 365.25 }, // mid
      { tof: 250 / 365.25 }, // near min-energy
    ];
    for (const { tof } of cases) {
      const r = solveLambert(r1, r2, tof, MU_SUN);
      expect(r).not.toBeNull();
      const r1mag = Math.hypot(r1[0], r1[1]);
      const r2mag = Math.hypot(r2[0], r2[1]);
      const cChord = Math.hypot(r2[0] - r1[0], r2[1] - r1[1]);
      const sSemi = (r1mag + r2mag + cChord) / 2;
      const tofRecomputed = lambertTOF(r!.a, sSemi, cChord, MU_SUN);
      expect(tofRecomputed).toBeCloseTo(tof, 4); // 4 sig fig — bisection's 52 iters
    }
  });
});

describe('solveLambert — degenerate geometries', () => {
  it('handles aligned positions (r1 ≈ r2 direction) without throwing', () => {
    const r1Local: [number, number] = [1.0, 0];
    const r2Local: [number, number] = [1.524, 0];
    // Same-direction transfers have small chord; short-way Lambert is
    // typically infeasible at this geometry. The solver should return
    // null cleanly rather than throw or NaN.
    const result = solveLambert(r1Local, r2Local, 100 / 365.25, MU_SUN);
    expect(result === null || Number.isFinite(result.a)).toBe(true);
  });

  it('handles opposite positions (r2 = -r1) without throwing', () => {
    const r1Local: [number, number] = [1.0, 0];
    const r2Local: [number, number] = [-1.524, 0];
    const result = solveLambert(r1Local, r2Local, 250 / 365.25, MU_SUN);
    if (result) {
      expect(Number.isFinite(result.a)).toBe(true);
      expect(Number.isFinite(result.v1)).toBe(true);
      expect(Number.isFinite(result.v2)).toBe(true);
    }
  });

  it('handles small angular separation (a few degrees) without NaN', () => {
    const angle = (5 * Math.PI) / 180;
    const r1Local: [number, number] = [1.0, 0];
    const r2Local: [number, number] = [1.524 * Math.cos(angle), 1.524 * Math.sin(angle)];
    const result = solveLambert(r1Local, r2Local, 100 / 365.25, MU_SUN);
    expect(result === null || Number.isFinite(result.a)).toBe(true);
  });

  it('respects mu — different mu produces a different transfer ellipse', () => {
    // Different mu must produce different `a` for the same geometry/TOF.
    // We use a 1.2× scaling so the solver remains in its feasible bisection
    // window for both — too large a multiplier shifts the parabolic minimum
    // past our test TOF and short-way Lambert returns null cleanly.
    const tof = 220 / 365.25;
    const a1 = solveLambert(r1, r2, tof, MU_SUN)?.a;
    const a2 = solveLambert(r1, r2, tof, MU_SUN * 1.2)?.a;
    expect(a1).toBeDefined();
    expect(a2).toBeDefined();
    if (a1 && a2) expect(Math.abs(a1 - a2)).toBeGreaterThan(0.01);
  });
});
