/**
 * Earth orbital-context subsystems — Moon ghost mesh + per-regime
 * orbit rings. Pulled out of EarthOrbitalScene's onMount so #290
 * Slice 4 can mount the same subsystems inside SurfaceScene gated
 * on `config.earthOrbitalLayers`.
 *
 * Moon ghost: small textured Moon sphere positioned at the real
 * Moon-orbit radius. Used as both a click target (navigate to
 * `/moon`) and as the parent anchor for moon-orbiter satellites
 * (they position relative to the moon mesh, not Earth).
 *
 * Orbit rings: one faint torus per orbital regime present in the
 * loaded EarthObject set (LEO/MEO/GEO/HEO/MOON/L2). Each ring sits
 * at one representative altitude for its regime, in the equatorial
 * plane. Inclination not modelled in v1.
 */
import * as THREE from 'three';
import { altToSurfaceScene } from '$lib/scale';

export interface MoonGhostOpts {
  /** Loader-resolved URL for the Moon's surface texture. */
  textureUrl: string;
  /** Radius of the small ghost sphere in scene units. */
  radiusUnits: number;
  /** Real Moon-orbit distance in km (defines the position). */
  distanceKm: number;
  /** Pre-configured TextureLoader (caller usually shares one). */
  textureLoader: THREE.TextureLoader;
  /** SurfaceScene planetRadius (always 30) — required to shift the
   *  log-compressed orbit math out of the planet sphere. The legacy
   *  `altToOrbitRadius` baseline placed Moon at radius 25.6 — inside
   *  the 30-unit Earth → fully occluded. (#303 follow-up.) */
  planetRadius: number;
  /**
   * Multiplier on the (Moon radius − planetRadius) gap so the Moon
   * visually clears the satellite-ring cluster. The base
   * `altToSurfaceScene` puts Moon at radius ~47 — only 5 units past
   * GEO (42) — which reads as "another satellite" rather than the
   * Moon. Real-world ratio is 60:1 (Moon 384 400 km / Earth 6371 km)
   * which is off-screen at any reasonable camera distance; default 6
   * is the compromise: lifts the gap to ~102, placing Moon at ~132
   * (~4.4× Earth's scene radius, vs the real 60×). Distinctly the
   * Moon, not a satellite. Reachable in the default camR=150 view.
   */
  distanceMultiplier?: number;
}

export interface MoonGhostHandle {
  /** The mesh — caller adds to scene + uses for raycaster + 2D draw. */
  mesh: THREE.Mesh;
  /** The scene-space radius. Cached because callers reference it for
   *  moon-orbiter positioning. */
  moonR: number;
  dispose: () => void;
}

export function buildMoonGhost(opts: MoonGhostOpts): MoonGhostHandle {
  const map = opts.textureLoader.load(opts.textureUrl);
  const geo = new THREE.SphereGeometry(opts.radiusUnits, 32, 32);
  const mat = new THREE.MeshPhongMaterial({ map, color: 0xffffff, shininess: 4 });
  const mesh = new THREE.Mesh(geo, mat);
  const moonR =
    opts.planetRadius +
    (altToSurfaceScene(opts.planetRadius, opts.distanceKm) - opts.planetRadius) *
      (opts.distanceMultiplier ?? 6);
  mesh.position.set(moonR, 0, 0);
  mesh.userData = { isMoon: true };
  return {
    mesh,
    moonR,
    dispose: () => {
      geo.dispose();
      mat.dispose();
      map.dispose();
    },
  };
}

export interface OrbitRingRegimePoint {
  regime: string;
  altitude_km: number;
}

export interface OrbitRingsOpts {
  /** Per-regime fill colour (hex int). Missing regimes fall back to grey. */
  regimeColors: Record<string, number>;
  /** Representative altitude points — one per regime. The caller usually
   *  reduces EarthObject[] to one point per regime before passing in. */
  regimes: OrbitRingRegimePoint[];
  /** Torus tube thickness in scene units. 0.04 is the canonical value. */
  tubeRadius?: number;
  /** Opacity (0..1) — default 0.35. */
  opacity?: number;
  /** See MoonGhostOpts.planetRadius. */
  planetRadius: number;
}

export interface OrbitRingsHandle {
  rings: THREE.Mesh[];
  /** Group containing all rings, for one-shot visibility toggle. */
  group: THREE.Group;
  dispose: () => void;
}

export function buildOrbitRings(opts: OrbitRingsOpts): OrbitRingsHandle {
  const tube = opts.tubeRadius ?? 0.04;
  const opacity = opts.opacity ?? 0.35;
  const rings: THREE.Mesh[] = [];
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  for (const { regime, altitude_km } of opts.regimes) {
    const r = altToSurfaceScene(opts.planetRadius, altitude_km);
    const geo = new THREE.TorusGeometry(r, tube, 6, 128);
    const mat = new THREE.MeshBasicMaterial({
      color: opts.regimeColors[regime] ?? 0x666666,
      transparent: true,
      opacity,
    });
    const ring = new THREE.Mesh(geo, mat);
    ring.rotation.x = Math.PI / 2; // equatorial
    rings.push(ring);
    geos.push(geo);
    mats.push(mat);
    group.add(ring);
  }
  return {
    rings,
    group,
    dispose: () => {
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
    },
  };
}
