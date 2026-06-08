import * as THREE from 'three';
import type { HotspotAnnotation, RegionBounds } from '$types/surface-site';

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
  /**
   * Axis-aligned region polygon (ADR-061, Slice 1 of #283). When
   * provided, the patch geometry switches from circular `CircleGeometry`
   * to rectangular `PlaneGeometry` with aspect ratio derived from the
   * region's lat-extent vs lon-extent ratio. Total area preserved at
   * ~`PATCH_DIAMETER_WORLD_UNITS²` (stylized callout, not literal —
   * true-scale rectangles ship in Slice 4's flat-ground-patch view).
   * Backward-compatible: sites without region_bounds keep the legacy
   * circular geometry.
   */
  regionBounds?: RegionBounds;
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

  // Region-aware aspect ratio: if region_bounds is provided (ADR-061),
  // derive width/height in world units that preserves total stylized
  // area but matches the region's actual lon:lat extent ratio. So a
  // long traverse bbox reads as a horizontal rectangle, a polar ROI
  // reads as a wider one, etc. Without region_bounds, fall back to
  // the legacy circular disc.
  const aspect = aspectFromRegion(input.regionBounds);

  // Regional (Tier 2a — CTX mosaic) layer goes FIRST so it renders
  // first / sits under everything that follows. Larger geometry +
  // weaker polygonOffset means it loses depth fights against the
  // detail patch / rim / pin while still beating the planet sphere.
  if (input.regionalTextureUrl) {
    const regGeom = buildPatchGeometry(REGIONAL_PATCH_DIAMETER_WORLD_UNITS, aspect, 96);
    const regMat = createPatchMaterial(input.regionalTextureUrl, {
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const regMesh = new THREE.Mesh(regGeom, regMat);
    regMesh.position.y = Z_FIGHT_OFFSET_Y;
    regMesh.userData = { siteId: input.siteId, layer: 'regional' };
    g.add(regMesh);
  }

  const geom = buildPatchGeometry(PATCH_DIAMETER_WORLD_UNITS, aspect, 64);

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
  // Landing-site pin (green disc). Built at radius 0.005u so the
  // geometry has a known base; the SurfaceScene animate loop finds
  // this mesh via userData.kind = 'patch-pin' and per-frame scales
  // it to ~10 px diameter on screen — matching the red endDot's
  // screen-pixel-stable sizing (image 20 feedback, 2026-06-02).
  // Without that scaling the disc stays at 0.005u world size and
  // at close zoom subtends 50+ px → the screen-filling green blob.
  // White outline ring — sits behind the green core to give it a
  // hard contrast halo against HiRISE / LROC NAC textures. Without it
  // the 14 px green disc was easy to lose against rough gray terrain
  // (user feedback 2026-06-08: "when only looking at HIRISE there is
  // no green dot anymore").
  // Pin core + halo retained for hover-pickability + back-compat but
  // rendered invisible. The persistent HTML crosshair overlay (in
  // SurfaceScene's template) is now the canonical landing-site marker;
  // it sits above the WebGL canvas at the projected site position and
  // matches the flat-patch's canvas crosshair so the symbol stays the
  // same across tiers (user feedback 2026-06-08: "can we have same
  // flat-patch crosshair marker across all tiers and not have any
  // transitions and have it always visible?").
  const pinHalo = new THREE.Mesh(
    new THREE.CircleGeometry(0.007, 24),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    }),
  );
  pinHalo.rotation.x = -Math.PI / 2;
  pinHalo.position.y = Z_FIGHT_OFFSET_Y + 0.0014;
  pinHalo.userData = { siteId: input.siteId, kind: 'patch-pin-halo' };
  pinHalo.visible = false;
  g.add(pinHalo);

  const pinCore = new THREE.Mesh(
    new THREE.CircleGeometry(0.005, 16),
    new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
    }),
  );
  pinCore.visible = false;
  pinCore.rotation.x = -Math.PI / 2;
  pinCore.position.y = Z_FIGHT_OFFSET_Y + 0.0015;
  pinCore.userData = { siteId: input.siteId, kind: 'patch-pin' };
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

/**
 * Compute the aspect-ratio multiplier (w/h) for a stylized rectangular
 * region patch given the region's lat/lon bounds. Returns 1 (square)
 * when no region is provided — caller treats this as "circle".
 *
 * The math: width-in-degrees-of-arc ≈ Δlon × cos(centroidLat), height
 * = Δlat (no cos correction since latitude lines are great circles).
 * Aspect = width / height. Clamped to [0.25, 4] so extreme polar ROIs
 * (e.g. Artemis south pole) don't produce slivers that vanish on screen.
 */
export function aspectFromRegion(rb: RegionBounds | undefined): number {
  if (!rb) return 1;
  const dLat = Math.max(1e-6, rb.lat_max - rb.lat_min);
  const dLon = Math.max(1e-6, rb.lon_max - rb.lon_min);
  const centroidLat = ((rb.lat_min + rb.lat_max) / 2) * (Math.PI / 180);
  const widthDeg = dLon * Math.cos(centroidLat);
  const aspect = widthDeg / dLat;
  return Math.max(0.25, Math.min(4, aspect));
}

/**
 * Build a flat patch geometry (laid in the XZ plane, normal = +Y) as a
 * rectangular `PlaneGeometry` whose width × height preserves the
 * reference circle's area while matching the requested aspect. The
 * legacy circular-patch branch was removed 2026-06-08 because every
 * surface site that goes through this builder now ships with
 * `region_bounds`, and the near-1 aspect threshold was incorrectly
 * catching 6 real sites (Opportunity / Curiosity / Schiaparelli on
 * Mars; Luna 9 / Luna 16 / Apollo 12 on the Moon) whose true
 * lon×lat extent happens to be within 1 % of square at their latitude
 * — drawing them as circles inconsistent with their actual extent.
 *
 * Area preservation: for a unit-diameter circle, area = π/4. For a
 * rectangle with the same area and width/height = aspect, height =
 * √(π/(4·aspect)), width = aspect × height. `segments` ignored now
 * (planes don't need a segment count) but kept in the signature so
 * callers don't need to change.
 */
function buildPatchGeometry(
  baseDiameter: number,
  aspect: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  segments: number,
): THREE.BufferGeometry {
  const circleArea = (Math.PI / 4) * baseDiameter * baseDiameter;
  const height = Math.sqrt(circleArea / aspect);
  const width = aspect * height;
  const g = new THREE.PlaneGeometry(width, height);
  g.rotateX(-Math.PI / 2);
  return g;
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
