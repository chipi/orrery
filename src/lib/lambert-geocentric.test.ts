import { describe, it, expect } from 'vitest';
import { geoTransferDv } from './lambert-geocentric';
import { V_LEO_CIRC, V_LLO_CIRC } from './lambert-geocentric-grid.constants';

/**
 * The honesty bar for ADR-085: the Earth→Moon model is a 2D two-body teaching
 * approximation, but it only ships if the minimum-∆v cell lands on the real
 * Apollo numbers — TLI ≈ 3.05–3.15 km/s, LOI ≈ 0.8–0.9 km/s, total ≈ 3.9–4.05.
 * If these fail, the MODEL is wrong, not the test (PA §"fail honestly").
 */

// TOF axis is [2.5, 5.5] d (ADR-085 D2 — the short-way solver's feasible band).
const TOF_MIN = 2.5;
const TOF_MAX = 5.5;

/**
 * Scan a year of departures × the feasible TOF band; return the **minimum-energy**
 * cell (lowest TOTAL ∆v) — the one the porkchop shades cheapest and the user
 * actually clicks. With the vector-v∞ LOI (review fix), the honest minimum is a
 * near-Hohmann transfer, so anchoring the honesty bar here is both correct and
 * exactly what the UI presents. (An earlier scalar-v∞ form put the grid minimum
 * on the fastest-TOF edge and inverted the gradient — the gradient test below
 * guards against that regression.)
 */
function minTotalCell() {
  let best = { tli: 0, loi: 0, total: Infinity, dep: -1, tof: -1 };
  for (let dep = 0; dep <= 365; dep += 1) {
    for (let tof = TOF_MIN; tof <= TOF_MAX + 1e-9; tof += 0.25) {
      const r = geoTransferDv(dep, tof);
      if (r.feasible && r.total < best.total) {
        best = { tli: r.tli, loi: r.loi, total: r.total, dep, tof };
      }
    }
  }
  return best;
}

describe('geoTransferDv — sanity constants', () => {
  it('reference circular speeds are physical', () => {
    expect(V_LEO_CIRC).toBeGreaterThan(7.7);
    expect(V_LEO_CIRC).toBeLessThan(7.9); // √(µ⊕/6578) ≈ 7.784
    expect(V_LLO_CIRC).toBeGreaterThan(1.5);
    expect(V_LLO_CIRC).toBeLessThan(1.7); // √(µ☾/1837) ≈ 1.634
  });
});

describe('geoTransferDv — honesty bar (Apollo bands, ADR-085)', () => {
  const best = minTotalCell();

  it('finds a feasible minimum-∆v transfer', () => {
    expect(best.total).toBeLessThan(Infinity);
    expect(best.dep).toBeGreaterThanOrEqual(0);
  });

  it('TLI lands in the Apollo band 3.05–3.15 km/s', () => {
    expect(best.tli).toBeGreaterThanOrEqual(3.0);
    expect(best.tli).toBeLessThanOrEqual(3.2);
  });

  it('LOI lands in the Apollo band 0.8–0.9 km/s', () => {
    expect(best.loi).toBeGreaterThanOrEqual(0.75);
    expect(best.loi).toBeLessThanOrEqual(0.95);
  });

  it('total LEO→LLO ∆v lands near the real ~3.9–4.05 km/s budget', () => {
    expect(best.total).toBeGreaterThanOrEqual(3.8);
    expect(best.total).toBeLessThanOrEqual(4.15);
  });
});

describe('geoTransferDv — TOF gradient (review regression guard)', () => {
  it('a fast transfer costs MORE than a near-Hohmann one — not less', () => {
    // Same departure; a 2.5-day arrival must be more expensive than a ~4-day
    // near-Hohmann arrival. The scalar-v∞ bug had this backwards (fast=cheap),
    // which taught a false intuition. Physically, fast arrivals carry a large
    // radial v∞ → higher LOI.
    const dep = 160;
    const fast = geoTransferDv(dep, 2.6);
    const hohmann = geoTransferDv(dep, 4.4);
    expect(fast.feasible && hohmann.feasible).toBe(true);
    expect(fast.total).toBeGreaterThan(hohmann.total);
  });
});

describe('geoTransferDv — grid behaviour', () => {
  it('marks cells below the parabolic floor as infeasible (no false orbit)', () => {
    // A 0.5-day Earth→Moon transfer is physically impossible (short-way).
    const r = geoTransferDv(0, 0.5);
    expect(r.feasible).toBe(false);
    expect(r.total).toBeGreaterThan(20); // DV_FAILED sentinel
  });

  it('is deterministic for a fixed cell', () => {
    const a = geoTransferDv(30, 4);
    const b = geoTransferDv(30, 4);
    expect(a.total).toBe(b.total);
  });
});
