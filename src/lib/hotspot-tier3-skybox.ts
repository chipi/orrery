import * as THREE from 'three';
import type { PanoramaAnnotation } from '$types/surface-site';

/**
 * Tier 3 ground-view panorama renderer (PRD-014 / RFC-017 §ADR-061,
 * V2 / #118; extended by PRD-022 / ADR-074 / #286 with annotation
 * sprite mount + click raycast).
 *
 * For the 5 Showcase sites with a curated panorama (Apollo 11,
 * Apollo 17, Curiosity, Perseverance, Viking 1), this renders a
 * NASA equirectangular panorama as a skybox-style sphere wrapped
 * around the camera. User clicks "Stand at site" → 1.2 s cinematic
 * camera transition from Tier 2 close-zoom down to ground-level
 * (~5 m from the lander); ESC or "Return to orbit" reverses it.
 *
 * Why inverted sphere + equirectangular: NASA Lunar Surface Journal
 * + Mars Mastcam-Z panoramas ship as 2:1 equirectangular JPEGs
 * already. No cube-map conversion needed. Pole distortion is
 * invisible for landing-site panoramas (no one looks straight up
 * or down at horizon-level surface imagery).
 *
 * Lifecycle:
 *   - createSkybox(textureUrl) builds the geometry + material,
 *     attaches to the scene, hidden until activate().
 *   - activate() starts the camera transition + reveals the skybox.
 *   - deactivate() reverses the transition + hides the skybox.
 *   - dispose() releases textures + geometry.
 *
 * Reduced-motion: skip the 1.2 s ease; instant camera cut.
 * navigator.connection.saveData: skip pre-fetch entirely; only
 *   load the panorama when the user explicitly taps "Stand at site".
 */

export const SKYBOX_TRANSITION_MS = 1200;

export interface SkyboxInput {
  /** Equirectangular JPEG URL (PD-NASA per ADR-061). */
  textureUrl: string;
  /** Site id, for userData attribution. */
  siteId: string;
}

export interface SkyboxHandle {
  group: THREE.Group;
  activate(): void;
  deactivate(): void;
  dispose(): void;
  isActive(): boolean;
  /** Texture load promise; resolves on first activate() or on prefetch. */
  ready: Promise<void>;
  /**
   * Mount the panorama annotations as 3D Sprites on the interior of
   * the inverted-sphere skybox at the yaw/pitch direction of each
   * annotation (PRD-022 / ADR-074). Replaces any previously mounted
   * set on subsequent calls — caller doesn't have to track them.
   * Pass [] to clear without disposing the skybox.
   */
  mountAnnotations(annotations: PanoramaAnnotation[], tintHex: string): void;
  /**
   * Swap the skybox texture in-place to a new panorama URL
   * (PRD-022 / ADR-074 Phase 2F). Used by the cycler UI when the
   * user picks a different panorama from the site's panorama_set.
   * Old texture is disposed once the new one loads; caller updates
   * annotations + metadata separately via mountAnnotations() etc.
   */
  swapTexture(textureUrl: string): Promise<void>;
  /**
   * Raycast the mounted annotation sprites against the given normalised
   * device coordinates (NDC, x/y in [-1, +1]). Returns the closest
   * annotation under the cursor, or null if none. Caller is expected
   * to pass the camera that's looking at the skybox interior — same
   * camera used to render the panorama.
   */
  raycastAnnotation(ndcX: number, ndcY: number, camera: THREE.Camera): PanoramaAnnotation | null;
}

/**
 * Build an inverted-sphere skybox for ground-view panorama display.
 * The returned group is added to the scene by the caller; visibility
 * defaults to false until activate() is called. Caller manages the
 * camera-transition outside this module (skybox just controls its
 * own geometry + texture).
 */
export function createSkybox(input: SkyboxInput): SkyboxHandle {
  const group = new THREE.Group();
  group.visible = false;
  group.userData = { siteId: input.siteId, isHotspotSkybox: true };

  // Large inverted sphere; the camera sits at the centre and looks
  // outward. Radius is chosen to be larger than the typical Tier 2
  // viewing distance but smaller than the camera's far plane —
  // ~80 world units on /moon (which uses moonRadius = 30, near=0.5,
  // far=400).
  const SKYBOX_RADIUS = 80;
  const geom = new THREE.SphereGeometry(SKYBOX_RADIUS, 64, 32);
  // Invert by scaling -1 on the X axis (flips winding so the inside
  // faces become the visible side; back-face culling does the rest).
  geom.scale(-1, 1, 1);

  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.FrontSide,
    map: null,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const sphere = new THREE.Mesh(geom, material);
  group.add(sphere);

  let active = false;
  let disposed = false;

  // Annotation sprites mounted inside the skybox sphere (PRD-022 /
  // ADR-074). Each Sprite carries its source PanoramaAnnotation in
  // userData for the raycaster to retrieve on click. Re-mounted (full
  // replace) on every mountAnnotations() call.
  const annotationGroup = new THREE.Group();
  annotationGroup.userData = { isPanoramaAnnotationGroup: true };
  group.add(annotationGroup);
  const raycaster = new THREE.Raycaster();
  const ndcPoint = new THREE.Vector2();
  let pinTextureCached: THREE.CanvasTexture | null = null;

  const loader = new THREE.TextureLoader();
  const ready = new Promise<void>((resolve, reject) => {
    loader.load(
      input.textureUrl,
      (tex) => {
        if (disposed) {
          tex.dispose();
          return;
        }
        // Three.js r128 colour-space (PRD-019 §S1 will upgrade).
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        material.map = tex;
        material.needsUpdate = true;
        resolve();
      },
      undefined,
      () => {
        reject(new Error(`Failed to load panorama texture: ${input.textureUrl}`));
      },
    );
  });
  // Swallow the rejection so an unhandled-promise warning doesn't fire
  // when the operator hasn't fetched the panorama file yet.
  ready.catch(() => {});

  return {
    group,
    activate(): void {
      if (active || disposed) return;
      active = true;
      group.visible = true;
      // Fade in; instant flip if reduced-motion.
      const reduced = isReducedMotion();
      if (reduced) {
        material.opacity = 1;
      } else {
        animateOpacity(material, 1, SKYBOX_TRANSITION_MS);
      }
    },
    deactivate(): void {
      if (!active || disposed) return;
      active = false;
      const reduced = isReducedMotion();
      if (reduced) {
        material.opacity = 0;
        group.visible = false;
      } else {
        animateOpacity(material, 0, SKYBOX_TRANSITION_MS).then(() => {
          if (!active) group.visible = false;
        });
      }
    },
    dispose(): void {
      disposed = true;
      active = false;
      material.map?.dispose();
      material.dispose();
      geom.dispose();
      // Dispose annotation sprites + cached pin texture.
      disposeAnnotationGroup(annotationGroup);
      pinTextureCached?.dispose();
      pinTextureCached = null;
      // Three.js r128 lacks Object3D.removeFromParent() — added in r130.
      // Use parent?.remove() instead (works in any version).
      group.parent?.remove(group);
    },
    isActive(): boolean {
      return active;
    },
    mountAnnotations(annotations: PanoramaAnnotation[], tintHex: string): void {
      if (disposed) return;
      // Replace strategy: dispose previous sprites, build fresh.
      disposeAnnotationGroup(annotationGroup);
      if (annotations.length === 0) return;
      if (!pinTextureCached) pinTextureCached = buildPinTexture();
      for (const ann of annotations) {
        const yaw = THREE.MathUtils.degToRad(ann.yaw_deg);
        const pitch = THREE.MathUtils.degToRad(ann.pitch_deg);
        // Sphere-interior position: just inside the skybox surface so
        // the sprite is in front of (not coincident with) the panorama
        // texture. Standard yaw/pitch → Cartesian (Y up).
        const r = SKYBOX_RADIUS - 2;
        const x = r * Math.cos(pitch) * Math.sin(yaw);
        const y = r * Math.sin(pitch);
        const z = r * Math.cos(pitch) * Math.cos(yaw);
        const sm = new THREE.SpriteMaterial({
          map: pinTextureCached,
          color: new THREE.Color(tintHex),
          depthTest: false,
          transparent: true,
        });
        const sprite = new THREE.Sprite(sm);
        sprite.position.set(x, y, z);
        // Scale chosen so the sprite reads as ~3% of viewport height at
        // the default 60° FOV — clickable, not dominant.
        sprite.scale.set(4, 4, 1);
        sprite.userData = { panoramaAnnotation: ann };
        sprite.renderOrder = 10; // draw on top of skybox texture
        annotationGroup.add(sprite);
      }
    },
    raycastAnnotation(ndcX, ndcY, camera): PanoramaAnnotation | null {
      if (disposed || annotationGroup.children.length === 0) return null;
      ndcPoint.set(ndcX, ndcY);
      raycaster.setFromCamera(ndcPoint, camera);
      const hits = raycaster.intersectObjects(annotationGroup.children, false);
      if (hits.length === 0) return null;
      const ann = hits[0].object.userData?.panoramaAnnotation as PanoramaAnnotation | undefined;
      return ann ?? null;
    },
    swapTexture(textureUrl: string): Promise<void> {
      return new Promise((resolve, reject) => {
        if (disposed) {
          reject(new Error('swapTexture: skybox disposed'));
          return;
        }
        const swapLoader = new THREE.TextureLoader();
        swapLoader.load(
          textureUrl,
          (tex) => {
            if (disposed) {
              tex.dispose();
              return;
            }
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.wrapS = THREE.ClampToEdgeWrapping;
            tex.wrapT = THREE.ClampToEdgeWrapping;
            const old = material.map;
            material.map = tex;
            material.needsUpdate = true;
            old?.dispose();
            resolve();
          },
          undefined,
          () => reject(new Error(`Failed to swap panorama texture: ${textureUrl}`)),
        );
      });
    },
    ready,
  };
}

/**
 * Dispose every Sprite under an annotation group (including its
 * SpriteMaterial) and clear the group. Idempotent — empty groups
 * are safe.
 */
function disposeAnnotationGroup(g: THREE.Group): void {
  for (const child of [...g.children]) {
    if (child instanceof THREE.Sprite) {
      child.material.dispose();
    }
    g.remove(child);
  }
}

/**
 * Build a small canvas-backed pin texture for annotation sprites
 * (PRD-022 / ADR-074). Single cached texture, runtime-tinted per
 * sprite via material.color. Cheap — ~32×32 px canvas, drawn once.
 */
function buildPinTexture(): THREE.CanvasTexture {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  // White pin glyph on transparent — tinted at runtime per agency
  // colour. Simple circle + downward triangle (same silhouette as
  // the SVG mockups in docs/mockups/panorama-redesign/).
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  // Body circle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2 - 6, 18, 0, Math.PI * 2);
  ctx.fill();
  // Stem (downward triangle)
  ctx.beginPath();
  ctx.moveTo(size / 2, size - 4);
  ctx.lineTo(size / 2 - 8, size / 2 + 4);
  ctx.lineTo(size / 2 + 8, size / 2 + 4);
  ctx.closePath();
  ctx.fill();
  // Hollow inner ring for tint contrast
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2 - 6, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function isReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

/**
 * Fade a material's opacity to a target value over `durationMs`.
 * Uses requestAnimationFrame internally; returns a promise that
 * resolves on completion.
 */
function animateOpacity(
  material: THREE.Material & { opacity: number },
  targetOpacity: number,
  durationMs: number,
): Promise<void> {
  return new Promise((resolve) => {
    const startOpacity = material.opacity;
    const startTime = performance.now();
    function step() {
      const t = Math.min(1, (performance.now() - startTime) / durationMs);
      const eased = easeInOutCubic(t);
      material.opacity = startOpacity + (targetOpacity - startOpacity) * eased;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Determine whether the user's connection has saveData=true. Used
 * by the route to suppress panorama prefetch (the texture only
 * loads when the user explicitly taps "Stand at site").
 */
/**
 * Fire-and-forget skybox teardown for the exit-panorama path (#42).
 *
 * Calls `deactivate()` immediately to start the fade-out, then defers
 * `dispose()` until the fade animation completes. Both surface routes
 * had the same 4-line block; collapses to one call.
 */
export function teardownPanoramaSkybox(
  handle: SkyboxHandle | null,
  fadeOutMs = SKYBOX_TRANSITION_MS + 100,
): void {
  if (!handle) return;
  handle.deactivate();
  setTimeout(() => handle.dispose(), fadeOutMs);
}

export function isSaveDataActive(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData === true;
}
