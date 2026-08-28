import { describe, it, expect } from 'vitest';
import { pegSolve, pegPitchRad, timeToApoapsisS, PEG } from './ascent-physics';
import { R_EARTH_M, MU_EARTH_M3_S2, G0 } from './ascent-physics-constants';

/**
 * Isolated PEG solver tests (#416). Proves the linear-tangent guidance closes a
 * synthetic Centaur-class low-TWR insertion to a near-circular orbit in a
 * standalone 2-body integrator — independent of the full ascent pipeline — so a
 * regression in the solver is caught at the unit level, not only via the
 * flagship end-to-end matrix.
 */

// Synthetic upper stage: RL10-class Isp (451 s), sized to a ~0.6-TWR final
// stage that closes a single continuous burn — the solver's feasible regime.
// (A true ~0.3-TWR Centaur single burn is physically infeasible without the
//  coast-to-apoapsis + relight the full integrator provides; that path is
//  validated end-to-end via the flagship orbit matrix, not this unit.)
const VE = 451 * G0; // ≈ 4423 m/s exhaust velocity
const THRUST_N = 180_000;
const M0 = 30_000; // kg at ignition → TWR ≈ 0.61
const MDOT = THRUST_N / VE; // kg/s

const circ = (r: number) => Math.sqrt(MU_EARTH_M3_S2 / r);

describe('timeToApoapsisS', () => {
  it('is 0 for a circular orbit', () => {
    const r = R_EARTH_M + 200_000;
    expect(timeToApoapsisS(r, 0, circ(r))).toBe(0);
  });
  it('is Infinity for an escape (hyperbolic) arc', () => {
    const r = R_EARTH_M + 200_000;
    expect(timeToApoapsisS(r, 0, circ(r) * 1.5)).toBe(Infinity);
  });
  it('is positive and finite while ascending on an ellipse (pre-apoapsis)', () => {
    const r = R_EARTH_M + 200_000;
    const t = timeToApoapsisS(r, 300, circ(r) * 0.98); // climbing, sub-circular
    expect(t).toBeGreaterThan(0);
    expect(Number.isFinite(t)).toBe(true);
  });
  it('descending just past periapsis gives a longer time-to-apoapsis than ascending', () => {
    const r = R_EARTH_M + 200_000;
    const vh = circ(r) * 0.98;
    expect(timeToApoapsisS(r, -300, vh)).toBeGreaterThan(timeToApoapsisS(r, 300, vh));
  });
});

describe('pegSolve — convergence', () => {
  it('returns a usable, finite solution from a cold start', () => {
    const r = R_EARTH_M + 185_000;
    const st = pegSolve(
      r,
      50,
      5500,
      THRUST_N / M0,
      VE,
      MU_EARTH_M3_S2 / (r * r),
      R_EARTH_M + 200_000,
      circ(R_EARTH_M + 200_000),
      900,
      null,
    );
    expect(st.ok).toBe(true);
    expect(Number.isFinite(st.A)).toBe(true);
    expect(Number.isFinite(st.B)).toBe(true);
    expect(st.tgo).toBeGreaterThan(0);
    expect(st.tgo).toBeLessThanOrEqual(900);
  });

  it('warm-started solution stays finite as the burn nears cutoff', () => {
    const rT = R_EARTH_M + 200_000;
    const vhT = circ(rT);
    let st = pegSolve(R_EARTH_M + 190_000, 20, 7000, THRUST_N / 20000, VE, 9.2, rT, vhT, 200, null);
    for (let i = 0; i < 5; i++) {
      st = pegSolve(R_EARTH_M + 198_000, 5, 7600, THRUST_N / 15000, VE, 9.2, rT, vhT, 40, st);
      expect(Number.isFinite(st.A) && Number.isFinite(st.B)).toBe(true);
    }
  });
});

describe('pegPitchRad', () => {
  it('is pure linear-tangent sin(pitch) = A + B·Δt', () => {
    const st = { A: 0.3, B: -0.01, tgo: 100, ok: true };
    expect(Math.sin(pegPitchRad(st, 0))).toBeCloseTo(0.3, 6);
    expect(Math.sin(pegPitchRad(st, 10))).toBeCloseTo(0.2, 6);
  });
  it('clamps |sin(pitch)| to the saturation cap', () => {
    const st = { A: 5, B: 0, tgo: 100, ok: true };
    expect(Math.sin(pegPitchRad(st, 0))).toBeCloseTo(PEG.maxSinPitch, 5);
  });
});

describe('PEG closes a synthetic low-TWR insertion (2-body)', () => {
  it('reaches a near-circular orbit at the target radius', () => {
    const rT = R_EARTH_M + 200_000;
    const vhT = circ(rT);

    // Start high, fast horizontally, sub-circular, slightly climbing.
    let x = 0;
    let y = R_EARTH_M + 200_000;
    let vx = 6000; // horizontal
    let vy = 40; // slight climb
    let m = M0;
    const dt = 0.1;
    let peg: ReturnType<typeof pegSolve> | null = null;
    let sinceSolve = 0;
    let cut = false;
    let steps = 0;

    for (; steps < 20000 && !cut; steps++) {
      const r = Math.hypot(x, y);
      const upx = x / r;
      const upy = y / r;
      const hx = upy; // +downrange horizontal
      const hy = -upx;
      const vr = vx * upx + vy * upy;
      const vh = vx * hx + vy * hy;
      const g = MU_EARTH_M3_S2 / (r * r);
      const a = THRUST_N / m;

      if (!peg || sinceSolve >= PEG.majorCycleS) {
        peg = pegSolve(r, vr, vh, a, VE, g, rT, vhT, (m - 5000) / MDOT, peg);
        sinceSolve = 0;
      }
      const pitch = pegPitchRad(peg, sinceSolve);

      // Cutoff: honest osculating-orbit gate — perigee climbed to target band.
      const energy = (vr * vr + vh * vh) / 2 - MU_EARTH_M3_S2 / r;
      if (energy < 0) {
        const sma = -MU_EARTH_M3_S2 / (2 * energy);
        const ecc = Math.sqrt(Math.max(0, 1 + (2 * energy * (r * vh) ** 2) / MU_EARTH_M3_S2 ** 2));
        const periAlt = sma * (1 - ecc) - R_EARTH_M;
        if (periAlt >= 140_000) {
          cut = true;
          break;
        }
      }

      const tdx = Math.cos(pitch) * hx + Math.sin(pitch) * upx;
      const tdy = Math.cos(pitch) * hy + Math.sin(pitch) * upy;
      const ax = (THRUST_N * tdx) / m - g * upx;
      const ay = (THRUST_N * tdy) / m - g * upy;
      vx += ax * dt;
      vy += ay * dt;
      x += vx * dt;
      y += vy * dt;
      m -= MDOT * dt;
      sinceSolve += dt;
      if (m <= 5000) break; // out of propellant
    }

    expect(cut, 'PEG should drive perigee to the target band (genuine orbit)').toBe(true);

    // Final osculating elements — near-circular at ~target radius.
    const r = Math.hypot(x, y);
    const upx = x / r;
    const upy = y / r;
    const vr = vx * upx + vy * upy;
    const vh = vx * upy + vy * -upx;
    const energy = (vr * vr + vh * vh) / 2 - MU_EARTH_M3_S2 / r;
    const sma = -MU_EARTH_M3_S2 / (2 * energy);
    const ecc = Math.sqrt(Math.max(0, 1 + (2 * energy * (r * vh) ** 2) / MU_EARTH_M3_S2 ** 2));
    expect(ecc).toBeLessThan(0.02);
    expect(sma - R_EARTH_M).toBeGreaterThan(140_000);
  });
});
