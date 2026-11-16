/**
 * Pure maths for the Earth-orbit coast view (fly-leo-coast-scene.ts): the orbit ring of an
 * eccentric orbit (OTV-7's 323 x 38,838 km) and how big the craft is on screen, with the marker
 * that keeps it findable in the wide establishing shot.
 *
 * The craft is drawn enlarged (a real craft is sub-pixel against the 6,371 km Earth); the scene
 * says so where it is drawn (`CRAFT_ENLARGEMENT`).
 */

export interface RingPoint {
  x: number;
  y: number;
  z: number;
}

const R_EARTH_KM = 6371;

/** The craft's model is scaled by this against its fitted size in the scene (see the coast scene). */
export const CRAFT_ENLARGEMENT = 460;

/** Eccentricity of the orbit with these altitudes (above the surface). */
export function eccentricity(perigeeKm: number, apogeeKm: number): number {
  const rp = R_EARTH_KM + Math.min(perigeeKm, apogeeKm);
  const ra = R_EARTH_KM + Math.max(perigeeKm, apogeeKm);
  return (ra - rp) / (ra + rp);
}

/** Kepler's equation M = E - e sin E, by Newton's method. */
export function eccentricAnomaly(meanAnomaly: number, e: number): number {
  let E = e < 0.8 ? meanAnomaly : Math.PI;
  for (let i = 0; i < 30; i++) {
    const d = (E - e * Math.sin(E) - meanAnomaly) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return E;
}

/**
 * One closed loop of the orbit in the equatorial plane (x, 0, z), perigee on +x, the focus (Earth's
 * centre) at the origin, sampled uniformly in MEAN anomaly so a craft stepping through the points
 * at a constant rate moves fast at perigee and slow at apogee, as it does. A circular orbit (equal
 * altitudes) gives the same circle as `parkingOrbit`.
 */
export function keplerRing(perigeeKm: number, apogeeKm: number, steps: number): RingPoint[] {
  const rp = R_EARTH_KM + Math.min(perigeeKm, apogeeKm);
  const ra = R_EARTH_KM + Math.max(perigeeKm, apogeeKm);
  const a = (rp + ra) / 2;
  const e = (ra - rp) / (ra + rp);
  const b = a * Math.sqrt(1 - e * e);
  const pts: RingPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const M = (2 * Math.PI * i) / steps;
    const E = eccentricAnomaly(M, e);
    pts.push({ x: a * (Math.cos(E) - e), y: 0, z: b * Math.sin(E) });
  }
  return pts;
}

/** The share of the view's height the craft spans, for a camera `distKm` away. */
export function craftScreenFraction(craftKm: number, distKm: number, fovDeg: number): number {
  const viewKm = 2 * distKm * Math.tan((fovDeg * Math.PI) / 360);
  return viewKm > 0 ? craftKm / viewKm : 0;
}

/**
 * Opacity of the craft marker: full while the craft is small in the frame (the establishing wide),
 * fading out as it grows to a readable size, so a close follow shot shows the craft alone.
 */
export function markerOpacity(fraction: number, showBelow = 0.06, goneAt = 0.16): number {
  if (fraction <= showBelow) return 1;
  if (fraction >= goneAt) return 0;
  const u = (fraction - showBelow) / (goneAt - showBelow);
  return 1 - u * u * (3 - 2 * u);
}

/** World size (km) of the marker for a constant `fraction` of the view's height. */
export function markerWorldSize(distKm: number, fovDeg: number, fraction = 0.07): number {
  return 2 * distKm * Math.tan((fovDeg * Math.PI) / 360) * fraction;
}
