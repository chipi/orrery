/**
 * The Earth-centred Kepler arc between two points in a given time (a Lambert transfer), sampled
 * by time. The hybrid-waypoint generator draws each coast with it: the analytic coast shapes
 * (cislunar-geometry's apogee-at-the-Moon ellipses) take about five days by their own timing, so
 * squeezed into a flown three-day coast the craft dawdled at the Moon and raced past Earth.
 *
 * Wraps the kernel's planar solver (solveLambert): solve in the plane of the two points, recover
 * the departure velocity from the Lagrange coefficients, then propagate by Kepler's equation.
 * Short-way elliptic transfers only (every cislunar coast is one); null otherwise, or when the
 * propagated arc misses its own end point.
 */
import { solveLambert } from '../../src/lib/physics/transfer/lambert.ts';

export interface V3 {
  x: number;
  y: number;
  z: number;
}

const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: V3, b: V3): V3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const norm = (a: V3) => Math.hypot(a.x, a.y, a.z);
const scale = (a: V3, k: number): V3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });

/** Position (same units as r1) `dtS` seconds after leaving r1, or null if no such arc. */
export function lambertArc(r1: V3, r2: V3, tofS: number, mu: number): ((dtS: number) => V3) | null {
  const r1m = norm(r1);
  const r2m = norm(r2);
  const nRaw = cross(r1, r2);
  const nm = norm(nRaw);
  if (!(r1m > 0 && r2m > 0 && nm > 1e-9 * r1m * r2m && tofS > 0)) return null;
  const n = scale(nRaw, 1 / nm);
  const e1 = scale(r1, 1 / r1m);
  const e2 = cross(n, e1);
  const p2: [number, number] = [dot(r2, e1), dot(r2, e2)];
  const dnu = Math.atan2(p2[1], p2[0]);
  if (!(dnu > 0)) return null;

  const aMax = 50 * Math.max(r1m, r2m);
  const sol =
    solveLambert([r1m, 0], p2, tofS, mu, aMax) ??
    solveLambert([r1m, 0], p2, tofS, mu, aMax, { highPath: true });
  if (!sol || !(sol.a > 0) || !(sol.p > 0)) return null;

  // Lagrange coefficients → the departure velocity in the plane.
  const f = 1 - (r2m / sol.p) * (1 - Math.cos(dnu));
  const g = (r1m * r2m * Math.sin(dnu)) / Math.sqrt(mu * sol.p);
  const vx = (p2[0] - f * r1m) / g;
  const vy = p2[1] / g;

  // Elements of the ellipse through (r1m, 0) with velocity (vx, vy).
  const v2 = vx * vx + vy * vy;
  const rv = r1m * vx;
  const ex = ((v2 - mu / r1m) * r1m - rv * vx) / mu;
  const ey = (-rv * vy) / mu;
  const ecc = Math.hypot(ex, ey);
  const a = 1 / (2 / r1m - v2 / mu);
  if (!(a > 0) || !(ecc < 1)) return null;
  const w = Math.atan2(ey, ex);
  const nu0 = -w;
  const E0 =
    2 * Math.atan2(Math.sqrt(1 - ecc) * Math.sin(nu0 / 2), Math.sqrt(1 + ecc) * Math.cos(nu0 / 2));
  const M0 = E0 - ecc * Math.sin(E0);
  const meanMotion = Math.sqrt(mu / (a * a * a));

  const at = (dtS: number): V3 => {
    const raw = M0 + meanMotion * dtS;
    const M = raw - 2 * Math.PI * Math.round(raw / (2 * Math.PI));
    // Newton from E = M diverges at high eccentricity; from ±π it converges for every M.
    let E = ecc > 0.8 && M !== 0 ? Math.sign(M) * Math.PI : M;
    for (let k = 0; k < 100; k++) {
      const d = (E - ecc * Math.sin(E) - M) / (1 - ecc * Math.cos(E));
      E -= d;
      if (Math.abs(d) < 1e-13) break;
    }
    const nu =
      2 * Math.atan2(Math.sqrt(1 + ecc) * Math.sin(E / 2), Math.sqrt(1 - ecc) * Math.cos(E / 2));
    const r = a * (1 - ecc * Math.cos(E));
    const x = r * Math.cos(nu + w);
    const y = r * Math.sin(nu + w);
    return { x: e1.x * x + e2.x * y, y: e1.y * x + e2.y * y, z: e1.z * x + e2.z * y };
  };
  const end = at(tofS);
  const miss = Math.hypot(end.x - r2.x, end.y - r2.y, end.z - r2.z);
  return miss < 0.01 * Math.max(r1m, r2m) ? at : null;
}
