import * as THREE from 'three';

/**
 * Tier 3 ground-view panorama renderer (PRD-014 / RFC-017 §ADR-061,
 * V2 / #118).
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
        tex.encoding = THREE.sRGBEncoding;
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
      // Three.js r128 lacks Object3D.removeFromParent() — added in r130.
      // Use parent?.remove() instead (works in any version).
      group.parent?.remove(group);
    },
    isActive(): boolean {
      return active;
    },
    ready,
  };
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
export function isSaveDataActive(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return conn?.saveData === true;
}
