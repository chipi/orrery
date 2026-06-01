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
import { altToOrbitRadius } from '$lib/scale';

export interface MoonGhostOpts {
  /** Loader-resolved URL for the Moon's surface texture. */
  textureUrl: string;
  /** Radius of the small ghost sphere in scene units. */
  radiusUnits: number;
  /** Real Moon-orbit distance in km (defines the position). */
  distanceKm: number;
  /** Pre-configured TextureLoader (caller usually shares one). */
  textureLoader: THREE.TextureLoader;
}

export interface MoonGhostHandle {
  /** The mesh — caller adds to scene + uses for raycaster + 2D draw. */
  mesh: THREE.Mesh;
  /** The scene-space radius (= altToOrbitRadius(distanceKm)). Cached
   *  because callers reference it for moon-orbiter positioning. */
  moonR: number;
  dispose: () => void;
}

export function buildMoonGhost(opts: MoonGhostOpts): MoonGhostHandle {
  const map = opts.textureLoader.load(opts.textureUrl);
  const geo = new THREE.SphereGeometry(opts.radiusUnits, 32, 32);
  const mat = new THREE.MeshPhongMaterial({ map, color: 0xffffff, shininess: 4 });
  const mesh = new THREE.Mesh(geo, mat);
  const moonR = altToOrbitRadius(opts.distanceKm);
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
    const r = altToOrbitRadius(altitude_km);
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
