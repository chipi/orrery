import * as THREE from 'three';
import type { HotspotAnnotation } from '$types/surface-site';

/**
 * Surface-patch quad component (PRD-014 / RFC-017 §ADR-060).
 *
 * The Tier 2 visual: a small planar disc mesh tangent to the planet
 * sphere at the site's lat/lon, hair-elevated 1 m above the surface
 * to avoid z-fighting with the planet sphere. Carries a 1 km × 1 km
 * texture sampled from LROC NAC (Moon) or HiRISE (Mars) orbital
 * mosaics, georegistered to ±50 m of the site's published lat/lon.
 *
 * Why a planar quad and not a curved patch:
 *   - Curvature mismatch over 1 km at lunar/Martian radius is ~0.3 m
 *     edge error — invisible at any zoom the user can reach.
 *   - Planar geometry simplifies texture mapping (UV [0,1] maps to
 *     the full 1 km square; the texture's central pixel IS the
 *     published site coordinate).
 *   - One disposable mesh per loaded patch, easy LRU eviction.
 *
 * Geometry placement is in the LOCAL frame of the wrapper group
 * (which is already oriented so +Y is surface-normal). So the patch
 * sits flat in the XZ plane at a tiny +Y offset.
 *
 * Texture loading is async + soft-fail: if the LROC/HiRISE source
 * image isn't on disk yet (the operator hasn't fetched it), the
 * patch renders with a neutral placeholder material so the geometry
 * + LOD swap is still verifiable. When the real texture lands, the
 * loader picks it up on next page load.
 */

/**
 * Planar-patch geometry diameter in world units. The /moon scene
 * uses moonRadius = 30 world units (≈ 58 km/u), so 0.6u ≈ 35 km of
 * "tabletop" in front of the user when they're zoomed to Tier 2 —
 * appropriate for a 1 km LROC patch rendered larger than literal-
 * scale (the patch is editorial, not survey-accurate at its visible
 * size).
 */
const PATCH_DIAMETER_WORLD_UNITS = 0.6;

/**
 * +Y offset above the planet surface to suppress z-fighting between
 * the planet sphere mesh and the patch quad. ~1 m at moon scale
 * (30u / 1737 km ≈ 0.0173u/km → 1 m ≈ 0.000017u). Use a larger
 * fudge factor (0.01u ≈ 580 m) because depth precision at the
 * scene's far distance is coarse; sub-metre offsets don't survive
 * the depth buffer at typical camera distances.
 */
const Z_FIGHT_OFFSET_Y = 0.01;

export interface HotspotPatchBuilderInput {
  /**
   * Texture URL. May be undefined if the LROC/HiRISE source image
   * for this hotspot hasn't been fetched yet — the patch will render
   * with a neutral placeholder material instead.
   */
  textureUrl?: string;
  /** Accent colour from the site's agency token, for the rim ring. */
  accentColor: string;
  /**
   * Site id, attached to the mesh's userData so click-handling resolves
   * cleanly when the user taps the patch.
   */
  siteId: string;
  /**
   * Annotation array for this site (S5 #113). Each annotation is
   * rendered as a small dot sprite at its lat_offset_m / lon_offset_m
   * relative to the site's published centre. Empty / undefined =
   * patch renders without annotation dots (the v0.7 ship default
   * for sites whose annotation arrays haven't been authored yet).
   */
  annotations?: HotspotAnnotation[];
}

/**
 * Build a Tier 2 surface-patch group for one hotspot. Returns a
 * THREE.Group containing:
 *   - The patch quad mesh (textured if textureUrl is provided).
 *   - A thin rim ring around the perimeter (accent colour) so the
 *     boundary of the surveyed area reads clearly against the moon
 *     base texture.
 */
export function buildHotspotSurfacePatch(input: HotspotPatchBuilderInput): THREE.Group {
  const g = new THREE.Group();
  g.userData = { siteId: input.siteId };

  const radius = PATCH_DIAMETER_WORLD_UNITS / 2;
  const geom = new THREE.CircleGeometry(radius, 64);
  // Lay the disc flat: rotate so its normal aligns with the wrapper
  // group's local +Y (which is surface-normal after the wrapper's
  // quaternion has aligned it to the planet surface).
  geom.rotateX(-Math.PI / 2);

  const material = createPatchMaterial(input.textureUrl);
  const mesh = new THREE.Mesh(geom, material);
  mesh.position.y = Z_FIGHT_OFFSET_Y;
  mesh.userData = { siteId: input.siteId };
  g.add(mesh);

  // Rim ring — thin torus around the patch perimeter.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.005, 6, 64),
    new THREE.MeshBasicMaterial({
      color: input.accentColor,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = Z_FIGHT_OFFSET_Y + 0.001;
  g.add(ring);

  // Annotation dot sprites (S5 #113). Rendered at each annotation's
  // lat_offset_m / lon_offset_m in metres from the site centre,
  // converted to local patch coordinates. lat_offset_m maps to +Z
  // (north), lon_offset_m maps to +X (east).
  if (input.annotations && input.annotations.length > 0) {
    addAnnotationDots(g, input.annotations, input.siteId, input.accentColor);
  }

  return g;
}

/**
 * Render small dot sprites at each annotation's local offset. The
 * dot has a halo (semi-transparent rim) + a solid core. Click hits
 * propagate via userData.annotationId; the route's existing pick
 * handler reads this to surface the annotation in the detail panel.
 *
 * Metre-to-world-unit conversion: the patch represents a 1 km × 1 km
 * area mapped to the PATCH_DIAMETER_WORLD_UNITS disc. So
 * 1 metre = PATCH_DIAMETER_WORLD_UNITS / 1000 world units.
 */
function addAnnotationDots(
  g: THREE.Group,
  annotations: HotspotAnnotation[],
  siteId: string,
  accentColor: string,
): void {
  const PATCH_M = 1000;
  const M_TO_U = PATCH_DIAMETER_WORLD_UNITS / PATCH_M;
  const radius = PATCH_DIAMETER_WORLD_UNITS / 2;
  for (const a of annotations) {
    const x = a.lon_offset_m * M_TO_U;
    const z = -a.lat_offset_m * M_TO_U; // +lat = -Z (north up on the patch)
    // Skip annotations outside the patch boundary.
    if (Math.sqrt(x * x + z * z) > radius * 1.05) continue;
    const dot = new THREE.Mesh(
      new THREE.CircleGeometry(0.012, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      }),
    );
    dot.rotation.x = -Math.PI / 2;
    dot.position.set(x, Z_FIGHT_OFFSET_Y + 0.003, z);
    dot.userData = { siteId, annotationId: a.id };
    g.add(dot);
    // Halo ring around the dot in the accent colour.
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.013, 0.018, 16),
      new THREE.MeshBasicMaterial({
        color: accentColor,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(x, Z_FIGHT_OFFSET_Y + 0.0025, z);
    halo.userData = { siteId, annotationId: a.id };
    g.add(halo);
  }
}

function createPatchMaterial(textureUrl: string | undefined): THREE.MeshStandardMaterial {
  if (!textureUrl) {
    // Placeholder: neutral grey patch with subtle agency-independent
    // surface texture. Renders while the operator fetches the real
    // LROC/HiRISE image — geometry + LOD swap still verifiable.
    return new THREE.MeshStandardMaterial({
      color: 0x9a9a90,
      metalness: 0.0,
      roughness: 0.95,
      emissive: 0x111111,
      emissiveIntensity: 0.05,
    });
  }
  // Async texture load — material starts blank, fills in when the
  // file arrives. Three.js handles the swap; no re-render needed.
  const loader = new THREE.TextureLoader();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.95,
    map: null,
  });
  loader.load(
    textureUrl,
    (tex) => {
      // Three.js r128 colour space API (PRD-019 §S1 will upgrade to
      // r140+ where this becomes tex.colorSpace = SRGBColorSpace).
      tex.encoding = THREE.sRGBEncoding;
      // Patch textures are 1:1 already (per RFC-022 §6.1 variant set);
      // disable wrapping so an undersize source doesn't tile.
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      mat.map = tex;
      mat.needsUpdate = true;
    },
    undefined,
    () => {
      // Soft-fail: keep the placeholder colour. The console error
      // from TextureLoader is sufficient for the operator.
    },
  );
  return mat;
}
