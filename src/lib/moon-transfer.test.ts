import { describe, it, expect } from 'vitest';
import { interplanetaryMoonDv } from './moon-transfer';
import { MOONS, moonOrbitRadiusKm, type MoonParams } from './moon-transfer.constants';
import { DESTINATIONS } from './lambert-grid.constants';

/**
 * Honesty bar for ADR-086: the Earth→moon multi-leg model is a 2D two-body
 * teaching estimate, but it only ships if the numbers match reality — the
 * Kepler-derived orbital radii match JPL, the arrival v∞ matches known flyby
 * speeds, and the direct-capture ∆v matches the "moon capture is brutal at the
 * giants" literature.
 */

// Known JPL semi-major axes around the host (km) — the derivation must match.
const KNOWN_A_KM: Record<string, number> = {
  phobos: 9376,
  deimos: 23463,
  io: 421800,
  europa: 671100,
  ganymede: 1070400,
  callisto: 1882700,
  titan: 1221870,
  enceladus: 238040,
  triton: 354759,
};

function moon(id: string): MoonParams {
  const m = MOONS.find((x) => x.id === id);
  if (!m) throw new Error(`no moon ${id}`);
  return m;
}

/** Min-total cell over the host's dep/tof grid (the one the porkchop shades cheapest). */
function minTotal(m: MoonParams) {
  const host = DESTINATIONS[m.host as keyof typeof DESTINATIONS];
  // Host TOF bands mirror the precompute DestinationSpec ranges. Beyond a host's
  // Hohmann TOF the heliocentric leg (low-branch only, like the existing planet
  // grids) is infeasible, so the feasible band is the fast side of each range.
  const [tofStart, tofEnd] =
    m.host === 'mars'
      ? [80, 520]
      : m.host === 'jupiter'
        ? [400, 1500]
        : m.host === 'saturn'
          ? [800, 3000]
          : [10000, 20000]; // neptune
  let best = { total: Infinity, departure: 0, moi: 0, vInfHost: 0 };
  for (let dep = 0; dep <= 365; dep += 10) {
    for (let tofDays = tofStart; tofDays <= tofEnd; tofDays += (tofEnd - tofStart) / 40) {
      const r = interplanetaryMoonDv(dep, dep + tofDays, tofDays / 365.25, host, m);
      if (r.feasible && r.total < best.total) best = r;
    }
  }
  return best;
}

describe('moonOrbitRadiusKm — Kepler derivation matches JPL (≤0.1%)', () => {
  for (const m of MOONS) {
    it(`${m.id}: derived a within 0.1% of JPL`, () => {
      const derived = moonOrbitRadiusKm(m);
      const known = KNOWN_A_KM[m.id];
      expect(Math.abs(derived - known) / known).toBeLessThan(0.001);
    });
  }
});

describe('interplanetaryMoonDv — honesty bar (ADR-086)', () => {
  it('Europa direct capture is expensive but physical (~12–16 km/s total)', () => {
    // Direct Europa EOI is ~5 km/s on top of the Jupiter departure — the honest
    // upper bound that makes real missions use gravity-assist tours instead.
    const best = minTotal(moon('europa'));
    expect(best.total).toBeGreaterThan(12);
    expect(best.total).toBeLessThan(16);
    expect(best.moi).toBeGreaterThan(4); // EOI in the brutal 4–6 km/s band
    expect(best.moi).toBeLessThan(7);
  });

  it('arrival v∞ at Jupiter is in the Galileo/Europa-Clipper band (~5–7 km/s)', () => {
    const best = minTotal(moon('europa'));
    expect(best.vInfHost).toBeGreaterThan(4);
    expect(best.vInfHost).toBeLessThan(8);
  });

  it('Galilean gradient: inner moons cost more than outer (Io > Europa > Ganymede > Callisto)', () => {
    // Deeper in Jupiter's well = higher arrival speed = more expensive capture.
    const io = minTotal(moon('io')).total;
    const eu = minTotal(moon('europa')).total;
    const ga = minTotal(moon('ganymede')).total;
    const ca = minTotal(moon('callisto')).total;
    expect(io).toBeGreaterThan(eu);
    expect(eu).toBeGreaterThan(ga);
    expect(ga).toBeGreaterThan(ca);
  });

  it('Mars moons are cheap (shallow well): Phobos/Deimos total < the Galileans', () => {
    const phobos = minTotal(moon('phobos')).total;
    expect(phobos).toBeLessThan(8);
    expect(phobos).toBeGreaterThan(3); // still a real Mars-transfer + rendezvous
  });

  it('every moon yields a feasible minimum cell with a positive departure + MOI split', () => {
    for (const m of MOONS) {
      const best = minTotal(m);
      expect(best.total, `${m.id} feasible`).toBeLessThan(Infinity);
      expect(best.departure, `${m.id} departure > 0`).toBeGreaterThan(0);
      expect(best.moi, `${m.id} MOI ≥ 0`).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('interplanetaryMoonDv — vector v∞ regression guard (B1)', () => {
  const europa = moon('europa');
  const host = DESTINATIONS[europa.host as keyof typeof DESTINATIONS];
  // Same departure; vary only TOF across the Hohmann floor.
  const fast = interplanetaryMoonDv(280, 280 + 1.2 * 365.25, 1.2, host, europa);
  const nearHohmann = interplanetaryMoonDv(280, 280 + 2.4 * 365.25, 2.4, host, europa);

  it('a faster-than-Hohmann arrival does NOT collapse v∞ (was 0.24 km/s; reality ~13)', () => {
    // The scalar |vDest − v2| priced a 1.2-yr Earth→Jupiter transfer at
    // v∞ ≈ 0.24 km/s — matched speeds, diverging vectors. The vector v∞ must
    // carry the real ~13 km/s radial excess.
    expect(fast.feasible).toBe(true);
    expect(fast.vInfHost).toBeGreaterThan(10);
  });

  it('faster transfers are MORE expensive (correct TOF gradient, not inverted)', () => {
    expect(fast.feasible && nearHohmann.feasible).toBe(true);
    expect(fast.vInfHost).toBeGreaterThan(nearHohmann.vInfHost);
    expect(fast.total).toBeGreaterThan(nearHohmann.total);
  });

  it('the near-Hohmann arrival v∞ is in the Galileo/Europa-Clipper band (~5–7 km/s)', () => {
    expect(nearHohmann.vInfHost).toBeGreaterThan(4.5);
    expect(nearHohmann.vInfHost).toBeLessThan(8);
  });
});
