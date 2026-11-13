/**
 * Orbit regime -> radius in scene units, for the four scenes that carry the orbit ruler (UXD-024).
 * Radii come from the functions that place the objects (`altToSurfaceScene` on /earth, the
 * lunar/Martian ring formula in `surface-markers.ts`, `PLANETS[].orbitR` and the belt constants on
 * /explore), never a second formula, so a highlighted band sits exactly where its residents ride.
 * Pure: no three.js objects, so it is unit-tested without a renderer.
 */
import { altToSurfaceScene } from '$lib/scale';
import { PLANETS } from '$lib/explore-scene';
import type { OrbitRegime } from '$types/orbit-regime';

export type RulerScene = 'earth' | 'moon' | 'mars' | 'explore';

/** band: annulus + edge lines; ring: one altitude; marker: a point (rings on its residents);
 *  shell: a Hill sphere (three great circles). */
export type ShapeKind = 'band' | 'ring' | 'marker' | 'shell';

export interface RegimeShape {
  kind: ShapeKind;
  inner: number;
  /** Equal to `inner` for everything but a band. */
  outer: number;
  /** Beyond the scene's real scale: drawn dashed (/explore SCATTERED, HELIOPAUSE, OORT). */
  schematic?: boolean;
}

/** The /moon and /mars orbit-ring radius for an altitude (log-compressed around a 30 u body). */
export function surfaceOrbitRadius(planetRadius: number, altKm: number): number {
  return planetRadius + 4 + Math.log10(1 + altKm / 50) * 5;
}

// /explore scene units. The belts are compressed bands between the planets' orbits.
export const ASTEROID_BELT_R = [195, 237] as const;
export const KUIPER_BELT_R = [460, 620] as const;
/** The Sun's selection-ring radius: 1.25 sun radii (SUN_RADIUS 18 in explore-scene.ts). */
export const SUN_RING_R = 18 * 1.25;
// Beyond the scene: schematic radii past the Kuiper belt (Kuiper ends at 620, far camera 1,400).
const SCATTERED_R = [620, 720] as const;
const HELIOPAUSE_R = 800;
const OORT_R = 1000;

const orbitR = (id: string): number => {
  const p = PLANETS.find((x) => x.id === id);
  if (!p) throw new Error(`orbit-regime-geometry: no planet ${id}`);
  return p.orbitR;
};

function exploreShape(id: string): RegimeShape | null {
  const band = (inner: number, outer: number, schematic?: boolean): RegimeShape => ({
    kind: 'band',
    inner,
    outer,
    schematic,
  });
  const ring = (r: number, schematic?: boolean): RegimeShape => ({
    kind: 'ring',
    inner: r,
    outer: r,
    schematic,
  });
  switch (id) {
    case 'SUN':
      return ring(SUN_RING_R);
    case 'TERRESTRIAL':
      return band(orbitR('mercury'), orbitR('mars'));
    case 'BELT':
      return band(ASTEROID_BELT_R[0], ASTEROID_BELT_R[1]);
    case 'GIANTS':
      return band(orbitR('jupiter'), orbitR('neptune'));
    case 'KUIPER':
      return band(KUIPER_BELT_R[0], KUIPER_BELT_R[1]);
    case 'SCATTERED':
      return band(SCATTERED_R[0], SCATTERED_R[1], true);
    case 'HELIOPAUSE':
      return ring(HELIOPAUSE_R, true);
    case 'OORT':
      return ring(OORT_R, true);
    default:
      return null;
  }
}

export interface RegimeGeometryCtx {
  /** The planet's scene radius (30 on the three Worlds). */
  planetRadius?: number;
  /** /earth: where the Moon ghost rides (`buildMoonGhost().moonR`); the MOON regime is a ring there. */
  moonR?: number;
}

export function regimeShape(
  scene: RulerScene,
  regime: Pick<OrbitRegime, 'id' | 'altitude_km' | 'distance_au'>,
  ctx: RegimeGeometryCtx = {},
): RegimeShape | null {
  if (scene === 'explore') return exploreShape(regime.id);
  const pr = ctx.planetRadius ?? 30;
  const alt = regime.altitude_km;
  if (alt == null) return null;
  const at = (km: number) =>
    scene === 'earth' ? altToSurfaceScene(pr, km) : surfaceOrbitRadius(pr, km);
  // /earth's MOON regime is the Moon ghost's own orbit; its log-scale radius would sit inside it.
  if (scene === 'earth' && regime.id === 'MOON') {
    return ctx.moonR ? { kind: 'ring', inner: ctx.moonR, outer: ctx.moonR } : null;
  }
  const kind: ShapeKind =
    regime.id === 'L2'
      ? 'marker'
      : regime.id === 'HILL'
        ? 'shell'
        : typeof alt === 'number'
          ? 'ring'
          : 'band';
  if (typeof alt === 'number') {
    const r = at(alt);
    return { kind, inner: r, outer: r };
  }
  return { kind, inner: at(alt[0]), outer: at(alt[1]) };
}
