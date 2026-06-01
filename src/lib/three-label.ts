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
  //
  // Canvas + sprite are sized PROPORTIONALLY to the rendered text
  // width. Short labels (e.g. "ISS") get a narrow sprite that doesn't
  // overlap nearby markers; long labels (e.g. "PATHFINDER + SOJOURNER"
  // or "ROSALIND FRANKLIN R") get a wider sprite so the full text
  // renders instead of being centre-clipped to ~14 chars (the old
  // fixed 256×64 canvas symptom).
  const upperText = opts.text.toUpperCase();
  const MAX_CANVAS_WIDTH = 512;
  const MIN_CANVAS_WIDTH = 128;
  const PADDING_PX = 24;

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  let fontPx = 28;
  let textWidth = 0;
  if (measureCtx) {
    do {
      measureCtx.font = `bold ${fontPx}px 'Space Mono', monospace`;
      textWidth = measureCtx.measureText(upperText).width;
      if (textWidth <= MAX_CANVAS_WIDTH - 32) break;
      fontPx -= 2;
    } while (fontPx >= 14);
  }

  const canvas = document.createElement('canvas');
  const targetCanvasWidth = Math.max(
    MIN_CANVAS_WIDTH,
    Math.min(MAX_CANVAS_WIDTH, Math.ceil((textWidth + PADDING_PX) / 64) * 64),
  );
  canvas.width = targetCanvasWidth;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.font = `bold ${fontPx}px 'Space Mono', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Soft glow under the text so it stays legible against bright
    // backgrounds (Earth dayside, sunlit Moon).
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = opts.color;
    ctx.fillText(upperText, canvas.width / 2, canvas.height / 2);
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
  // Sprite scale proportional to canvas aspect — narrow for short
  // labels, wide for long labels. Height stays size×0.5; width is
  // derived as `size * 0.5 * aspect` where aspect = w/h. So a
  // canvas of 128×64 (aspect 2:1) → sprite width size×1; canvas
  // 512×64 (aspect 8:1) → sprite width size×4.
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(size * 0.5 * aspect, size * 0.5, 1);
  sprite.position.copy(offset);
  group.add(sprite);

  return { group, texture };
}
