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
 * Planar-patch geometry diameter in world units. The DETAIL layer
 * (HiRISE/LROC, ~25 cm/px) needs to occupy enough of the regional
 * patch that its higher resolution is visible at the closest zoom
 * — otherwise the user just sees a small dot of detail surrounded
 * by CTX and the layer adds no perceived value. At 1.0u the detail
 * patch covers ~67 % of the regional patch's diameter (0.5 of its
 * area), so the inner detail texture dominates the view at close
 * zoom while the CTX surrounds it as context. This is editorial
 * scale (1u ≈ 113 km), not literal — the actual HiRISE crop
 * represents 512 m of ground.
 */
const PATCH_DIAMETER_WORLD_UNITS = 1.0;
/**
 * Regional patch geometry diameter (Tier 2a — Murray Lab CTX
 * mosaic, ~10 km × 10 km of ground at 5 m/px, 2048² source). 3.0u
 * world-units = 2× the detail patch diameter, giving a generous
 * ring of context around the HiRISE detail patch (1.0u — covers
 * about 1/9 of the regional patch's area). 2026-05-21 feedback:
 * the prior 1.5u value made the regional ring read as a thin
 * surround rather than a proper "you are HERE in the wider
 * landing zone" frame. polygonOffset ordering keeps the detail
 * patch on top of the regional patch.
 */
const REGIONAL_PATCH_DIAMETER_WORLD_UNITS = 3.0;

/**
 * +Y offset above the planet surface. Kept small — the actual
 * z-fight suppression is via the materials' polygonOffset (see
 * createPatchMaterial). polygonOffset shifts the geometry's
 * effective depth in the depth buffer without changing its visible
 * position, which is exactly what's needed for "decal on a surface"
 * — the standard THREE.js fix when a tiny world-space offset gets
 * lost in depth-buffer precision at typical camera distances.
 */
const Z_FIGHT_OFFSET_Y = 0.02;

export interface HotspotPatchBuilderInput {
  /**
   * Detail-layer texture URL (HiRISE for Mars, LROC NAC for Moon).
   * Maps to a tight ~10 km area centred on the lander. May be
   * undefined if the source image hasn't been fetched yet — patch
   * still renders with a neutral placeholder material.
   */
  textureUrl?: string;
  /**
   * Regional-layer texture URL (Murray Lab CTX mosaic for Mars).
   * Maps to a wider ~10 km × 10 km landing-zone context patch.
   * When set, a second disc renders BELOW the detail layer (larger
   * geometry, less-aggressive polygonOffset). Optional — sites
   * without a regional layer render only the detail patch and the
   * planet's base texture as their visual context.
   */
  regionalTextureUrl?: string;
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

  // Regional (Tier 2a — CTX mosaic) layer goes FIRST so it renders
  // first / sits under everything that follows. Larger geometry +
  // weaker polygonOffset means it loses depth fights against the
  // detail patch / rim / pin while still beating the planet sphere.
  if (input.regionalTextureUrl) {
    const regRadius = REGIONAL_PATCH_DIAMETER_WORLD_UNITS / 2;
    const regGeom = new THREE.CircleGeometry(regRadius, 96);
    regGeom.rotateX(-Math.PI / 2);
    const regMat = createPatchMaterial(input.regionalTextureUrl, {
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const regMesh = new THREE.Mesh(regGeom, regMat);
    regMesh.position.y = Z_FIGHT_OFFSET_Y;
    regMesh.userData = { siteId: input.siteId, layer: 'regional' };
    g.add(regMesh);
  }

  const radius = PATCH_DIAMETER_WORLD_UNITS / 2;
  const geom = new THREE.CircleGeometry(radius, 64);
  // Lay the disc flat: rotate so its normal aligns with the wrapper
  // group's local +Y (which is surface-normal after the wrapper's
  // quaternion has aligned it to the planet surface).
  geom.rotateX(-Math.PI / 2);

  const material = createPatchMaterial(input.textureUrl);
  const mesh = new THREE.Mesh(geom, material);
  mesh.position.y = Z_FIGHT_OFFSET_Y;
  // userData.layer === 'detail' lets the route's render loop find
  // the HiRISE inner disc and ramp its opacity independently of the
  // regional CTX layer — the detail patch fades in LATER as the user
  // continues to zoom in past the CTX-reveal threshold (2026-05-21
  // feedback: showing HiRISE at the same zoom as CTX gives the user
  // no visual sense of progressive detail).
  mesh.userData = { siteId: input.siteId, layer: 'detail' };
  g.add(mesh);

  // Centre pin — small dot at the lander's exact position on the
  // patch. Keeps the lander location readable when Tier 1 (3D model)
  // has faded out at close zoom. Green core (= "start / landing
  // site origin"), ringed in accent colour so it reads against any
  // HiRISE background. Slightly elevated to sit above the patch
  // surface. Also replaces the separate traverse start ring on /mars
  // (rovers' start coordinate == landing site == patch centre).
  const pinCore = new THREE.Mesh(
    new THREE.CircleGeometry(0.005, 16),
    new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    }),
  );
  pinCore.rotation.x = -Math.PI / 2;
  pinCore.position.y = Z_FIGHT_OFFSET_Y + 0.0015;
  g.add(pinCore);
  // (No pin ring — the green core is high-contrast enough against
  // any HiRISE / CTX background on its own. The agency-blue ring
  // that used to sit around it grew visible at the closest zoom and
  // re-introduced the same blue-on-blue conflict the patch rim and
  // selection halo had.)

  // (No rim ring — the contrast between the HiRISE/CTX texture
  // and the surrounding planet base texture is enough boundary cue
  // on its own, and an agency-coloured rim was reading as a third
  // blue ring stacked with the selection halo + pin ring.)

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

interface PatchMaterialOptions {
  /** Override the default polygonOffset factor. More negative pulls
   *  the surface toward the camera in depth-buffer space, winning
   *  more depth-fight contests. Default -2. Regional layer uses
   *  -1 (weaker) so the detail layer above it wins. */
  polygonOffsetFactor?: number;
  polygonOffsetUnits?: number;
}

function createPatchMaterial(
  textureUrl: string | undefined,
  opts: PatchMaterialOptions = {},
): THREE.MeshStandardMaterial {
  const pof = opts.polygonOffsetFactor ?? -2;
  const pou = opts.polygonOffsetUnits ?? -2;
  if (!textureUrl) {
    return new THREE.MeshStandardMaterial({
      color: 0x9a9a90,
      metalness: 0.0,
      roughness: 0.95,
      emissive: 0x111111,
      emissiveIntensity: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: pof,
      polygonOffsetUnits: pou,
    });
  }
  const loader = new THREE.TextureLoader();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.95,
    map: null,
    // polygonOffset pulls the patch toward the camera in depth-buffer
    // space without changing its world position. Combined with a tiny
    // surface offset (Z_FIGHT_OFFSET_Y) this keeps the patch flush on
    // the surface visually while always winning the depth test against
    // the planet sphere at any camera distance.
    polygonOffset: true,
    polygonOffsetFactor: pof,
    polygonOffsetUnits: pou,
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
      // Anisotropic filtering crisps up the patch at close zoom + at
      // grazing camera angles. Default anisotropy=1 makes a 2048²
      // patch look like a 256² thumbnail when the camera is near the
      // surface. 16 is a safe ceiling (most GPUs support it; reading
      // renderer.capabilities.getMaxAnisotropy() would be cleaner but
      // requires the renderer reference here).
      tex.anisotropy = 16;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
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
