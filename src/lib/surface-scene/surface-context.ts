/**
 * Context layer — a sharp, TRUE-SCALE piece of the globe around a landing site.
 *
 * The globe texture is ~2.7 km/px (Moon) / ~5 km/px (Mars) at 4K; the stylised
 * regional / detail / route patches above it are ~5 m/px but magnified ~20×
 * (#309), so between them nothing sharp covers the hundreds of km you see from
 * route-view altitude. This module drapes a ~150–200 m/px crop of a global
 * mosaic (LRO WAC on the Moon, a Mars mosaic on Mars) over the sphere at its
 * real latitude/longitude, as a spherical cap just above the planet surface.
 *
 * The crop is a lat/lon box in simple-cylindrical projection, the same as the
 * globe texture, so UVs are a linear map of lat/lon and the cap meets the globe
 * without a seam. Vertices come from latLonToUnitSphere — the frame the site
 * markers use — so the cap sits exactly under them. A soft alpha edge fades it
 * into the globe. The stylised patches keep drawing on top.
 */
import * as THREE from 'three';
import { latLonToUnitSphere } from '$lib/moon-projection';
import { streamedUrl } from '$lib/asset-url';
import { featherMask } from '$lib/three/feather-mask';

export { contextBounds, type ContextBounds } from './context-bounds';
import type { ContextBounds } from './context-bounds';

/** Above the planet sphere, below the stylised patches (which sit at +0.05+). */
export const CONTEXT_SHELL_OFFSET = 0.02;

/** Cap geometry over a lat/lon box: (segments+1)² vertices on a sphere of `radius`. */
export function contextCapGeometry(
  b: ContextBounds,
  radius: number,
  segments = 48,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= segments; j++) {
    const v = j / segments;
    const lat = b.lat_min + (b.lat_max - b.lat_min) * v;
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const lon = b.lon_min + (b.lon_max - b.lon_min) * u;
      const p = latLonToUnitSphere(lat, lon);
      pos.push(p.x * radius, p.y * radius, p.z * radius);
      uv.push(u, v);
    }
  }
  const row = segments + 1;
  for (let j = 0; j < segments; j++) {
    for (let i = 0; i < segments; i++) {
      const a = j * row + i;
      // Counter-clockwise seen from outside the sphere.
      idx.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * The context cap for one site. Lit like the globe (MeshPhongMaterial) so it
 * shares the day/night terminator; starts transparent and the scene ramps
 * `material.opacity` by camera distance. Texture load is async and dropped if
 * the cap is disposed first (#363 pattern).
 */
export function buildContextCap(input: {
  siteId: string;
  textureUrl: string;
  bounds: ContextBounds;
  planetRadius: number;
}): THREE.Mesh {
  const geom = contextCapGeometry(input.bounds, input.planetRadius + CONTEXT_SHELL_OFFSET);
  // Same material + shininess as the planet sphere (SurfaceScene planetMaterial)
  // so the cap shades exactly like the globe it sits on; a MeshStandard cap
  // read as a darker square under the same lights.
  const mat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    shininess: 4,
    transparent: true,
    opacity: 0,
    alphaMap: featherMask(),
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  let disposed = false;
  const baseDispose = mat.dispose.bind(mat);
  mat.dispose = () => {
    disposed = true;
    mat.map?.dispose();
    baseDispose();
  };
  new THREE.TextureLoader().load(streamedUrl(input.textureUrl), (tex) => {
    if (disposed) {
      tex.dispose();
      return;
    }
    // No colorSpace, like the planet map and the patches: the cap must decode
    // its pixels the same way as the globe it blends into.
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.anisotropy = 8;
    mat.map = tex;
    mat.needsUpdate = true;
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.userData = { siteId: input.siteId, layer: 'context' };
  mesh.renderOrder = -1;
  return mesh;
}

/**
 * Opacity of the context cap for a camera distance `camR` (scene units from the
 * planet centre; the planet radius is 30). Fades in from far away (the globe is
 * fine there) and stays on all the way down (the regional/detail patches draw
 * over it; the flat-patch view replaces the scene).
 */
export function contextOpacity(camR: number, fadeStart = 90, fadeEnd = 60): number {
  if (camR >= fadeStart) return 0;
  if (camR <= fadeEnd) return 1;
  return 1 - (camR - fadeEnd) / (fadeStart - fadeEnd);
}
