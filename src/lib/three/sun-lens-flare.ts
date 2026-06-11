import * as THREE from 'three';

/**
 * Sun lens flare — wave 2/3 polish #10. A cluster of additive-blend
 * sprite "ghosts" attached to the Sun. Each ghost is a procedural
 * CanvasTexture disc with a soft chromatic tint, ordered radially out
 * from the Sun's screen position so that as the camera frames the Sun,
 * the ghosts smear along a line through the screen center — the
 * classic anamorphic-flare emotional-beat polish.
 *
 * Unlike Three.js's bundled `Lensflare` add-on (which depends on
 * picking textures + a hidden occlusion mesh), this version is a plain
 * sprite cluster. The component updater (called per frame from the
 * /fly animate loop) recomputes ghost positions based on the
 * camera→sun screen-space vector so the ghosts always trail through
 * the screen center.
 *
 * Returned handle:
 *  - group: scene.add() this. Owns the ghost sprites.
 *  - update(camera): call once per frame from the animate loop.
 *  - dispose(): free textures + materials.
 */

export interface SunLensFlare {
  group: THREE.Group;
  update: (camera: THREE.PerspectiveCamera) => void;
  dispose: () => void;
}

interface GhostSpec {
  size: number;
  /** Distance from sun along the screen-space sun→center line, in
   *  fractions of the screen-center→sun distance. 0 = at the sun,
   *  1 = at the screen center, 2 = on the opposite side. */
  offset: number;
  color: string;
  opacity: number;
}

const GHOSTS: GhostSpec[] = [
  { size: 0.4, offset: 0.95, color: '#ffd9a0', opacity: 0.5 },
  { size: 0.55, offset: 1.3, color: '#a6d6ff', opacity: 0.35 },
  { size: 0.3, offset: 1.6, color: '#ffe6c2', opacity: 0.45 },
  { size: 0.7, offset: 1.95, color: '#9fbcff', opacity: 0.3 },
  { size: 0.25, offset: 2.25, color: '#ffcbcb', opacity: 0.5 },
];

export function buildSunLensFlare(opts: {
  /** Anchor point in world space — typically the Sun's position. */
  anchor: THREE.Vector3;
  /** Scene unit length for the base ghost sprite scale. Ghosts are
   *  positioned in world space; their on-screen size depends on
   *  camera distance + this base scale. */
  baseScale?: number;
}): SunLensFlare {
  const baseScale = opts.baseScale ?? 30;
  const group = new THREE.Group();

  const sprites: THREE.Sprite[] = [];
  const materials: THREE.SpriteMaterial[] = [];
  const textures: THREE.Texture[] = [];
  for (const spec of GHOSTS) {
    const tex = buildGhostTexture(spec.color);
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color: 0xffffff,
      transparent: true,
      opacity: spec.opacity,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.setScalar(baseScale * spec.size);
    sprite.renderOrder = 9000;
    group.add(sprite);
    sprites.push(sprite);
    materials.push(mat);
    textures.push(tex);
  }

  const sunScreen = new THREE.Vector3();
  const ghostWorld = new THREE.Vector3();

  function update(camera: THREE.PerspectiveCamera): void {
    // Project the anchor (Sun) into NDC. If the Sun is behind the
    // camera, hide everything — no flare from behind.
    sunScreen.copy(opts.anchor).project(camera);
    const behindCam = sunScreen.z > 1;
    if (behindCam) {
      group.visible = false;
      return;
    }
    group.visible = true;

    // For each ghost, place its world position along the line from
    // the sun toward the camera center, then "behind" the camera
    // by the same factor — done by inverse-projecting an NDC point.
    // NDC center is (0,0). Vector from sun-NDC toward center is -sun.
    for (let i = 0; i < GHOSTS.length; i++) {
      const spec = GHOSTS[i];
      // NDC offset = sun-NDC + offset * (center - sun-NDC)
      // At offset=0 we sit at the sun; at offset=1 at the center.
      const ndcX = sunScreen.x + spec.offset * (0 - sunScreen.x);
      const ndcY = sunScreen.y + spec.offset * (0 - sunScreen.y);
      ghostWorld.set(ndcX, ndcY, sunScreen.z);
      ghostWorld.unproject(camera);
      sprites[i].position.copy(ghostWorld);
      // Opacity falls off as the sun nears the screen edge — when the
      // sun NDC magnitude > 1 it's off-screen, no flare needed.
      const r = Math.hypot(sunScreen.x, sunScreen.y);
      const visiblityFactor = Math.max(0, 1 - r * 0.9);
      (sprites[i].material as THREE.SpriteMaterial).opacity =
        spec.opacity * visiblityFactor;
    }
  }

  function dispose(): void {
    sprites.forEach((s) => {
      group.remove(s);
    });
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  }

  return { group, update, dispose };
}

function buildGhostTexture(color: string): THREE.CanvasTexture {
  const SIZE = 128;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, SIZE / 2);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
