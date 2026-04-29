import * as THREE from 'three';

/**
 * Build a label-with-leader Three.js Group: a thin line from the
 * marker origin out to a label position, with a camera-facing Sprite
 * at the end carrying the text.
 *
 * Used by /earth (satellite labels) and /moon (landing-site labels).
 *
 * The leader line lives in the parent's local space; the Sprite is
 * placed at `offset` and naturally always faces the camera (Three.js
 * Sprite billboards). Caller is responsible for adding the returned
 * group as a child of the marker's transform.
 *
 * Returns a tuple so callers that want to dispose textures later can
 * keep a handle on the canvas-backed THREE.Texture without traversing.
 */
export interface LabelOptions {
  text: string;
  color: string; // hex string e.g. "#4ecdc4" — line + text color
  offset?: THREE.Vector3; // label position relative to marker origin
  /** Sprite world-size scale. 0.6 ≈ readable at 30u camera distance. */
  size?: number;
}

export interface BuiltLabel {
  group: THREE.Group;
  /** The canvas texture; dispose along with the rest of the scene. */
  texture: THREE.Texture;
}

export function buildLabel(opts: LabelOptions): BuiltLabel {
  const offset = opts.offset ?? new THREE.Vector3(0, 1.6, 0);
  const size = opts.size ?? 0.6;
  const group = new THREE.Group();

  // ─── Leader line (origin → offset) ────────────────────────────────
  const lineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    offset.clone(),
  ]);
  const lineMat = new THREE.LineBasicMaterial({
    color: opts.color,
    transparent: true,
    opacity: 0.55,
  });
  const line = new THREE.Line(lineGeo, lineMat);
  group.add(line);

  // ─── Sprite text ──────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  // Power-of-two sizes give cleaner mipmaps. 256×64 fits short labels
  // (≤14 chars at 32px) without scaling artefacts.
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.font = "bold 28px 'Space Mono', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Soft glow under the text so it stays legible against bright
    // backgrounds (Earth dayside, sunlit Moon).
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = opts.color;
    ctx.fillText(opts.text.toUpperCase(), canvas.width / 2, canvas.height / 2);
  }
  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(spriteMat);
  // Aspect ratio: 256:64 = 4:1. Width = size×2, height = size×0.5.
  sprite.scale.set(size * 2, size * 0.5, 1);
  sprite.position.copy(offset);
  group.add(sprite);

  return { group, texture };
}
