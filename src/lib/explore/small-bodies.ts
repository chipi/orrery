import { auToPx } from '$lib/scale';
import smallBodiesData from '$data/small-bodies.json';

// Small bodies: dwarf planets, comets, the one known interstellar
// visitor. Clickable on the 2D view since v0.x.x — same data drives
// the SmallBodyPanel's overview/technical/learn tabs.
export type SmallBody = {
  id: string;
  name: string;
  type: 'dwarf' | 'comet' | 'interstellar' | 'asteroid' | 'kbo';
  a: number;
  e: number;
  T: number;
  L0: number;
  incl: number;
  color: string;
  radius_km?: number;
  discovered?: string;
  mission_visited?: string | null;
  next_perihelion?: string;
  description?: string;
  wiki?: string;
  note?: string;
};
export const SMALL_BODIES: SmallBody[] = smallBodiesData.bodies as SmallBody[];
export const smallBodyById = new Map(SMALL_BODIES.map((b) => [b.id, b]));

/**
 * Sample points along a body's trajectory in heliocentric AU-pixel
 * coordinates. Closed elliptic orbits return a full ring; hyperbolic
 * (interstellar) trajectories return an open curve over the valid
 * true-anomaly interval (where 1 + e·cos ν > 0).
 *
 * Used by both 2D and 3D rendering. Pure function — `auToPx` is the
 * only side-input.
 */
export function sampleOrbitPoints(
  b: SmallBody,
  steps: number,
): { x: number; y: number; z: number }[] {
  // Build the orbit in two stages so inclination renders correctly
  // in 3D: (1) generate points in the orbit's local plane (xL, 0, zL)
  // — closed ellipse for dwarfs/comets, open hyperbola for
  // interstellar visitors. (2) tilt out of the ecliptic by `incl`
  // around the local X-axis (line of nodes is arbitrary without Ω,
  // which we don't carry — visually this still gives Pluto its
  // 17° lift, ʻOumuamua its 122° plunge, etc.). (3) rotate the
  // tilted plane about Y by L0 so the perihelion direction sits
  // where the data wants it. The 2D top-down view consumes only
  // {x, z} and ignores y, so a flat ecliptic projection still
  // works for 2D mode.
  const pts: { x: number; y: number; z: number }[] = [];
  const cosL = Math.cos(b.L0);
  const sinL = Math.sin(b.L0);
  const incRad = ((b.incl ?? 0) * Math.PI) / 180;
  const cosI = Math.cos(incRad);
  const sinI = Math.sin(incRad);
  function pushTilted(xL: number, zL: number) {
    // Tilt around local X: (xL, 0, zL) → (xL, -zL·sinI, zL·cosI)
    const yT = -zL * sinI;
    const zT = zL * cosI;
    // Rotate about world Y by L0.
    pts.push({ x: xL * cosL - zT * sinL, y: yT, z: xL * sinL + zT * cosL });
  }
  if (b.type === 'interstellar') {
    const absA = Math.abs(b.a);
    const semiLatus = absA * (b.e * b.e - 1);
    const nuMax = Math.acos(-1 / b.e) * 0.985;
    for (let i = 0; i <= steps; i++) {
      const nu = -nuMax + (2 * nuMax * i) / steps;
      const rAu = semiLatus / (1 + b.e * Math.cos(nu));
      pushTilted(Math.cos(nu) * auToPx(rAu), Math.sin(nu) * auToPx(rAu));
    }
  } else {
    const semiMajor = auToPx(b.a);
    const semiMinor = semiMajor * Math.sqrt(1 - b.e * b.e);
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      pushTilted(Math.cos(a) * semiMajor - semiMajor * b.e, Math.sin(a) * semiMinor);
    }
  }
  return pts;
}

/**
 * Body position for a given simT (years from epoch). Interstellar
 * bodies pin to perihelion (no time evolution — they passed through
 * once in 2017 and are gone). Closed orbits advance with simT.
 */
export function smallBodyPosition(b: SmallBody, simT: number): { x: number; y: number; z: number } {
  // Mirrors the same tilt-then-rotate transform as sampleOrbitPoints
  // so the body sits exactly on the rendered orbit ring in 3D. 2D
  // callers ignore y (top-down ecliptic projection).
  const cosL = Math.cos(b.L0);
  const sinL = Math.sin(b.L0);
  const incRad = ((b.incl ?? 0) * Math.PI) / 180;
  const cosI = Math.cos(incRad);
  const sinI = Math.sin(incRad);
  if (b.type === 'interstellar') {
    // Pin at perihelion (ν=0). zL=0 at perihelion under our
    // line-of-nodes-along-X convention, so y=0 here too.
    const absA = Math.abs(b.a);
    const semiLatus = absA * (b.e * b.e - 1);
    const rAu = semiLatus / (1 + b.e);
    const xL = auToPx(rAu);
    return { x: xL * cosL, y: 0, z: xL * sinL };
  }
  const semiMajor = auToPx(b.a);
  const semiMinor = semiMajor * Math.sqrt(1 - b.e * b.e);
  const Tyr = b.T / 365.25;
  const ang = b.L0 + simT * ((2 * Math.PI) / Tyr);
  const xL = Math.cos(ang) * semiMajor - semiMajor * b.e;
  const zL = Math.sin(ang) * semiMinor;
  const yT = -zL * sinI;
  const zT = zL * cosI;
  return { x: xL * cosL - zT * sinL, y: yT, z: xL * sinL + zT * cosL };
}
