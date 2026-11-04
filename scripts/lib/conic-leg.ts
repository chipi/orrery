/**
 * conic-leg.ts — the heliocentric conic a coasting craft flies between two positions in a
 * given time (Lambert's problem, prograde, one revolution or less), sampled as positions.
 * Used by generate-fly-trajectory.ts for the cruise between two encounters.
 *
 * Solved by bisection on the semi-latus rectum p (the p-iteration method, Bate, Mueller &
 * White §5.4), which covers transfer angles up to 360°. Every answer is checked by
 * propagating the orbit to the arrival time; a miss returns null and the caller keeps its
 * estimate.
 *
 * Units: AU and days.
 */

/** GM of the Sun, AU³/day². */
export const MU_SUN_AU3_D2 = (4 * Math.PI * Math.PI) / (365.25 * 365.25);

type V2 = { x: number; z: number };

/** Kepler's equation for an ellipse, M = E − e sin E. */
function eccAnomaly(M: number, e: number): number {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 60; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return E;
}

/** Kepler's equation for a hyperbola, M = e sinh F − F. */
function hypAnomaly(M: number, e: number): number {
  let F = Math.asinh(M / e);
  for (let i = 0; i < 80; i++) {
    const d = (e * Math.sinh(F) - F - M) / (e * Math.cosh(F) - 1);
    F -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return F;
}

/** The orbit through r1 with velocity v1 (ellipse, or hyperbola for an escaping craft), as a
 *  position function of days after r1. Null for a retrograde or parabolic orbit. */
export function ellipseFrom(r1: V2, v1: V2, mu = MU_SUN_AU3_D2): ((t: number) => V2) | null {
  const r = Math.hypot(r1.x, r1.z);
  const v2 = v1.x * v1.x + v1.z * v1.z;
  const h = r1.x * v1.z - r1.z * v1.x;
  const energy = v2 / 2 - mu / r;
  if (h <= 0 || Math.abs(energy) < 1e-12) return null;
  const a = -mu / (2 * energy);
  const rv = r1.x * v1.x + r1.z * v1.z;
  const ex = ((v2 - mu / r) * r1.x - rv * v1.x) / mu;
  const ez = ((v2 - mu / r) * r1.z - rv * v1.z) / mu;
  const e = Math.hypot(ex, ez);
  const w = Math.atan2(ez, ex);
  const nu1 = Math.atan2(r1.z, r1.x) - w;
  if (energy > 0) {
    const F1 = 2 * Math.atanh(Math.sqrt((e - 1) / (e + 1)) * Math.tan(nu1 / 2));
    const M1h = e * Math.sinh(F1) - F1;
    const nh = Math.sqrt(mu / (-a * -a * -a));
    return (t: number) => {
      const F = hypAnomaly(M1h + nh * t, e);
      const nu = 2 * Math.atan(Math.sqrt((e + 1) / (e - 1)) * Math.tanh(F / 2));
      const rr = a * (1 - e * Math.cosh(F));
      return { x: rr * Math.cos(w + nu), z: rr * Math.sin(w + nu) };
    };
  }
  const E1 =
    2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu1 / 2), Math.sqrt(1 + e) * Math.cos(nu1 / 2));
  const M1 = E1 - e * Math.sin(E1);
  const n = Math.sqrt(mu / (a * a * a));
  return (t: number) => {
    const E = eccAnomaly(M1 + n * t, e);
    const nu =
      2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    const rr = a * (1 - e * Math.cos(E));
    return { x: rr * Math.cos(w + nu), z: rr * Math.sin(w + nu) };
  };
}

/**
 * The prograde transfer from r1 to r2 taking `tof` days, sweeping the prograde angle from r1
 * to r2 (0–360°), as a position function of days after r1. Null when no single-revolution
 * ellipse fits or the check misses by more than `tolAu`.
 */
export function lambertLeg(r1: V2, r2: V2, tof: number, tolAu = 1e-4): ((t: number) => V2) | null {
  const mu = MU_SUN_AU3_D2;
  const R1 = Math.hypot(r1.x, r1.z);
  const R2 = Math.hypot(r2.x, r2.z);
  let dth = Math.atan2(r2.z, r2.x) - Math.atan2(r1.z, r1.x);
  dth = ((dth % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (dth < 1e-6 || Math.abs(dth - Math.PI) < 1e-6) return null;
  const c = Math.cos(dth);
  const k = R1 * R2 * (1 - c);
  const l = R1 + R2;
  const m = R1 * R2 * (1 + c);
  // p bounds for an ellipse: (p_i, ∞) for dth < π, (0, p_ii) for dth > π.
  const pI = k / (l + Math.sqrt(2 * m));
  const pII = k / (l - Math.sqrt(2 * m));
  const timeOf = (p: number): { t: number; v1: V2 } | null => {
    const a = (m * k * p) / ((2 * m - l * l) * p * p + 2 * k * l * p - k * k);
    if (!Number.isFinite(a) || a === 0) return null;
    const f = 1 - (R2 / p) * (1 - c);
    const g = (R1 * R2 * Math.sin(dth)) / Math.sqrt(mu * p);
    const fdot = Math.sqrt(mu / p) * Math.tan(dth / 2) * ((1 - c) / p - 1 / R1 - 1 / R2);
    const v1 = { x: (r2.x - f * r1.x) / g, z: (r2.z - f * r1.z) / g };
    if (a < 0) {
      // Hyperbolic (escape) transfer: New Horizons, the Voyagers past Jupiter.
      const coshF = 1 - (R1 / a) * (1 - f);
      if (coshF < 1) return null;
      const dF = Math.acosh(coshF);
      return { t: g + Math.sqrt((-a * -a * -a) / mu) * (Math.sinh(dF) - dF), v1 };
    }
    const cosE = 1 - (R1 / a) * (1 - f);
    const sinE = (-R1 * R2 * fdot) / Math.sqrt(mu * a);
    let dE = Math.atan2(sinE, cosE);
    if (dE < 0) dE += 2 * Math.PI;
    const t = g + Math.sqrt((a * a * a) / mu) * (dE - Math.sin(dE));
    return { t, v1: { x: (r2.x - f * r1.x) / g, z: (r2.z - f * r1.z) / g } };
  };
  // p as a function of s: log-spaced in the distance from the ellipse bound, so transfers
  // near 180° (whose p sits within 1 % of the bound) are still bracketed.
  const pAt = (u: number) => (dth < Math.PI ? pI * (1 + 10 ** u) : pII * (1 - 10 ** u));
  const uLo = -10;
  const uHi = dth < Math.PI ? 4 : -1e-7;
  const N = 600;
  let prev: { u: number; d: number } | null = null;
  let bracket: [number, number] | null = null;
  for (let i = 0; i <= N; i++) {
    const u = uLo + ((uHi - uLo) * i) / N;
    const r = timeOf(pAt(u));
    if (!r || !Number.isFinite(r.t)) {
      prev = null;
      continue;
    }
    const d = r.t - tof;
    if (prev && Math.sign(d) !== Math.sign(prev.d)) {
      bracket = [prev.u, u];
      break;
    }
    prev = { u, d };
  }
  if (!bracket) return null;
  let [lo, hi] = bracket;
  const dLo = timeOf(pAt(lo))!.t - tof;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const r = timeOf(pAt(mid));
    if (!r) return null;
    if (Math.sign(r.t - tof) === Math.sign(dLo)) lo = mid;
    else hi = mid;
  }
  const sol = timeOf(pAt((lo + hi) / 2));
  if (!sol) return null;
  const orbit = ellipseFrom(r1, sol.v1, mu);
  if (!orbit) return null;
  const end = orbit(tof);
  if (Math.hypot(end.x - r2.x, end.z - r2.z) > tolAu) return null;
  return orbit;
}
