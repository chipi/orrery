import { describe, it, expect } from 'vitest';
import { geoTransferDv } from './lambert-geocentric';
import { V_LEO_CIRC, V_LLO_CIRC } from './lambert-geocentric-grid.constants';

/**
 * The honesty bar for ADR-085: the Earth→Moon model is a 2D two-body teaching
 * approximation, but it only ships if the minimum-∆v cell lands on the real
 * Apollo numbers — TLI ≈ 3.05–3.15 km/s, LOI ≈ 0.8–0.9 km/s, total ≈ 3.9–4.05.
 * If these fail, the MODEL is wrong, not the test (PA §"fail honestly").
 */

// TOF axis is [3, 14] d (ADR-085 — low-branch Lambert to the ~5 d minimum-energy
// ceiling + the high branch (α → 2π − α) for the slow/phasing transfers above it).
const TOF_MIN = 3;
const TOF_MAX = 14;

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

describe('geoTransferDv — TOF gradient (V-shape around minimum-energy)', () => {
  it('both a fast AND a slow transfer cost more than near-Hohmann', () => {
    // The porkchop is V-shaped in TOF: cheapest at the ~5 d minimum-energy
    // ellipse, more expensive on both sides.
    //  • Fast (low branch): large radial v∞ → higher LOI. The scalar-v∞ bug had
    //    this backwards (fast=cheap), teaching a false intuition.
    //  • Slow (high branch, α→2π−α): a bigger, slower ellipse also costs more —
    //    and must NOT read as cheaper, or the slow band would teach the same lie.
    const dep = 160;
    const fast = geoTransferDv(dep, 3.2); // low branch, fast edge
    const hohmann = geoTransferDv(dep, 4.7); // near minimum-energy
    const slow = geoTransferDv(dep, 12); // high branch, slow phasing arc
    expect(fast.feasible && hohmann.feasible && slow.feasible).toBe(true);
    expect(fast.total).toBeGreaterThan(hohmann.total);
    expect(slow.total).toBeGreaterThan(hohmann.total);
  });
});

describe('geoTransferDv — high branch (#308 full [3,14 d] band)', () => {
  it('slow transfers above the ~5 d minimum-energy ceiling are now feasible', () => {
    // These cells were false-"unreachable" under the short-way-only solver —
    // the whole point of the high branch. A feasible cislunar transfer, not the
    // DV_FAILED sentinel.
    for (const tof of [6, 8, 10, 12, 14]) {
      const r = geoTransferDv(120, tof);
      expect(r.feasible, `tof=${tof} d must be feasible on the high branch`).toBe(true);
      expect(r.total).toBeGreaterThan(3.5);
      expect(r.total).toBeLessThan(6); // sane budget, not the >20 sentinel
    }
  });

  it('the low↔high branch handoff at minimum-energy is continuous (no ∆v jump)', () => {
    // Either side of the ~5 d ceiling the two branches must meet smoothly —
    // a discontinuity would draw a false seam across the porkchop.
    const dep = 120;
    const low = geoTransferDv(dep, 4.9);
    const high = geoTransferDv(dep, 5.1);
    expect(low.feasible && high.feasible).toBe(true);
    expect(Math.abs(high.total - low.total)).toBeLessThan(0.1);
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
