/**
 * Background star-field generators for 3D scenes (#42, lifted across
 * 7 routes; layered variant added for #322/#323).
 *
 * `createStarField` — single uniform-on-sphere population. /earth,
 * /moon, /mars all paint a single sparse field; this is the historical
 * helper.
 *
 * `createLayeredStarField` — cinematic 3-population variant per
 * docs/guides/fly-cinematic-shot-language.md §P1+T8. A flat single
 * population reads as "Wikipedia infographic"; three layered
 * populations with a Milky Way band read as "BBC space documentary".
 * Used by /fly, /explore, /iss, /tiangong so the cinematic look stays
 * consistent.
 *
 * Algorithm (both): rejection-free uniform sampling on a sphere via
 *   t = U(0, 2π), p = acos(2 U(0,1) - 1)
 * Each star sits at a random distance in [radius, radius+jitter]. The
 * Milky Way band squashes y by 0.18 so the points cluster around the
 * ecliptic plane, giving the soft equatorial belt the eye reads as
 * "the galaxy" without a baked cubemap.
 *
 * Points materials disable `sizeAttenuation` so stars stay 1–2 px
 * regardless of camera distance (no flicker on zoom, matches a real
 * star map).
 */
import * as THREE from 'three';

export function createStarField({
  count = 1500,
  radius = 200,
  jitter = 80,
  color = 0xdde4ff,
  size = 1.0,
  opacity = 0.55,
}: {
  count?: number;
  radius?: number;
  jitter?: number;
  color?: number;
  size?: number;
  opacity?: number;
} = {}): THREE.Points {
  const sp = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = radius + Math.random() * jitter;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    sp[i * 3] = r * Math.sin(p) * Math.cos(t);
    sp[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
    sp[i * 3 + 2] = r * Math.cos(p);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color,
      size,
      sizeAttenuation: false,
      transparent: true,
      opacity,
    }),
  );
}

export interface LayeredStarFieldOptions {
  counts: {
    /** Many small stars — the "void" texture beneath the bright sparkle. */
    dim: number;
    /** Fewer big stars — foreground sparkle. */
    bright: number;
    /** Milky Way band stars — concentrated to the ecliptic plane. */
    milkyWay: number;
  };
  /** Base shell radius. The dim layer sits here; bright + Milky Way
   *  derive their radii from this so all three are concentric-ish but
   *  don't z-fight. Pick this to match the scene's outer scale (1500
   *  for heliocentric AU scenes, ~180 for orbital-station scenes,
   *  ~3000 for /explore's wide stellar shell). */
  shellRadius?: number;
}

/** Cinematic 3-population star field with a Milky Way band. Returns a
 *  `THREE.Group` the caller adds to the scene once; teardown disposes
 *  the geometries + materials via the standard `dispose-object3d`
 *  walker. Counts come from the quality tier (`starsDim` etc.) so
 *  low-tier devices render fewer points. */
export function createLayeredStarField({
  counts,
  shellRadius = 1500,
}: LayeredStarFieldOptions): THREE.Group {
  const group = new THREE.Group();
  // Proportions taken from /fly's helio scene where the layered look
  // was first tuned — keeping the same ratios at smaller shellRadius
  // gives /iss + /tiangong the same look at orbital scale.
  group.add(
    createStarField({
      count: counts.dim,
      radius: shellRadius,
      jitter: shellRadius * (500 / 1500),
      size: 0.9,
      opacity: 0.55,
    }),
  );
  group.add(
    createStarField({
      count: counts.bright,
      radius: shellRadius * (1400 / 1500),
      jitter: shellRadius * (600 / 1500),
      size: 1.6,
      opacity: 0.95,
    }),
  );
  group.add(createMilkyWayBand(counts.milkyWay, shellRadius));
  return group;
}

function createMilkyWayBand(count: number, shellRadius: number): THREE.Points {
  const radius = shellRadius * (1450 / 1500);
  const jitter = shellRadius * (350 / 1500);
  const sp = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = radius + Math.random() * jitter;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    sp[i * 3] = r * Math.sin(p) * Math.cos(t);
    // Squash y by 0.18 so the points cluster around the equatorial
    // plane, forming a sky-spanning belt. Galactic-plane dust palette
    // (warm off-white) at slightly higher opacity than the dim layer.
    sp[i * 3 + 1] = r * Math.sin(p) * Math.sin(t) * 0.18;
    sp[i * 3 + 2] = r * Math.cos(p);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xf0e8d8,
      size: 1.2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.45,
    }),
  );
}
