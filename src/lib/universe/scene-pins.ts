/**
 * Pin, ring and label rules shared by every /explore scene that draws named pins
 * (neighbourhood, Milky Way, Local Group, Local Sheet, Virgo, Laniakea, Cosmic web).
 * UXD-020: one 12 px label, one ring look, one placement pass, a steady label offset.
 *
 * Pure maths and THREE geometry only (no canvas, no DOM), so it is unit-tested. The
 * canvas-backed builders (label sprite, ring texture) live in scene-pin-sprites.ts.
 */
import * as THREE from 'three';

/** Label text height in CSS px at every scale (`--size-meta`, UXD-002). */
export const LABEL_TEXT_PX = 12;
/**
 * Label sprite height in CSS px. The texture is 40 px tall and draws 24 px type, so 12 px
 * of text needs a sprite 12 × 40 / 24 = 20 px high.
 */
export const LABEL_SPRITE_PX = 20;
/** Ring diameter in CSS px, on every pin and on every arm label point. */
export const RING_PX = 44;
/** Ring sprite edge in CSS px: the 44 px annulus sits inside it with room for the stroke. */
export const RING_SPRITE_PX = 48;
/** Ring stroke in CSS px at the final size. */
export const RING_STROKE_PX = 1.5;
/**
 * Hover and selection ring: `--color-state` (#889fe7). Scene code cannot read CSS variables;
 * this literal mirrors the token (precedent: surface-markers.ts HOVER_BLUE).
 */
export const RING_BLUE = 0x889fe7;
/** The "you are here" anchor ring, at every scale: the neighbourhood Sol gold. */
export const RING_ANCHOR_GOLD = 0xffcf8f;
/** Anchor ring opacity while idle; hover and selection are full. */
export const ANCHOR_RING_IDLE_OPACITY = 0.55;

/** A label's rectangle on screen, in normalised device coordinates (−1…1). */
export interface ScreenRect {
  l: number;
  r: number;
  b: number;
  t: number;
}

/** Two label rectangles overlap (touching edges count as apart). */
export function overlaps(a: ScreenRect, b: ScreenRect): boolean {
  return a.l < b.r && b.l < a.r && a.b < b.t && b.b < a.t;
}

/** World units one CSS pixel covers at `dist` from a perspective camera. */
export function worldPerPx(dist: number, fovDeg: number, viewportH: number): number {
  return (2 * dist * Math.tan((fovDeg * Math.PI) / 360)) / Math.max(1, viewportH);
}

/** World size of `px` CSS pixels at `dist`. */
export function screenPxToWorld(
  px: number,
  dist: number,
  fovDeg: number,
  viewportH: number,
): number {
  return px * worldPerPx(dist, fovDeg, viewportH);
}

/**
 * How far above its pin a label sits, in world units. It depends on the STEADY glow size
 * (`glowWorld`, never the hover-grown one) and the ring, so a hover cannot move the label
 * (MW2). The label always clears the 44 px ring.
 */
export function labelOffset(
  glowWorld: number,
  labelWorldH: number,
  ringWorldR: number,
  glowK = 0.9,
): number {
  return Math.max(glowWorld * glowK, ringWorldR * 1.15) + labelWorldH * 0.7;
}

/** Ring opacity: full on hover or selection, the anchor stays up at a lower opacity. */
export function ringOpacity(anchor: boolean, highlighted: boolean): number {
  if (highlighted) return 1;
  return anchor ? ANCHOR_RING_IDLE_OPACITY : 0;
}

/** Ring tint: the anchor is gold at every scale, every other pin is the state blue. */
export function ringTint(anchor: boolean): number {
  return anchor ? RING_ANCHOR_GOLD : RING_BLUE;
}

/**
 * Per-frame ring state: RING_SPRITE_PX on screen whatever the distance (`wpp` is the world
 * size of one CSS px at the pin), full on hover or selection, the anchor idling at 0.55.
 * The sprite stays `visible` at opacity 0: it is also the pick target of an arm label point.
 */
export function applyRing(ring: THREE.Sprite, anchor: boolean, highlighted: boolean, wpp: number) {
  (ring.material as THREE.SpriteMaterial).opacity = ringOpacity(anchor, highlighted);
  ring.scale.setScalar(wpp * RING_SPRITE_PX);
}

/** Linear sRGB-channel blend of two 0xRRGGBB colours. */
export function lerpHex(a: number, b: number, t: number): number {
  const ch = (c: number, s: number) => (c >> s) & 255;
  const mix = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t);
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

/** Light-year ring colour: `RING_BLUE` towards white over `count` rings (index 0 is the blue one). */
export function lyRampColor(index: number, count: number): number {
  return lerpHex(RING_BLUE, 0xffffff, count > 1 ? index / (count - 1) : 0);
}

/** One label in the placement pass (the 3D sprites and the 2D canvas text share it). */
export interface PlaceSlot {
  /** Lower wins when two labels collide. */
  rank: number;
  /** Hovered or selected: always shown, and placed before everything else. */
  force: boolean;
  /**
   * In: the label wants to be shown and is on screen (its `rect` is valid).
   * Out: it is shown (it did not lose a collision to a higher-priority label).
   */
  visible: boolean;
  rect: ScreenRect;
  /** A 3D label: its sprite's `visible` follows the result. */
  sprite?: { visible: boolean };
}

export interface LabelSlot extends PlaceSlot {
  sprite: THREE.Sprite;
  /** Texture aspect (width / height). */
  aspect: number;
}

export function newLabelSlot(sprite: THREE.Sprite, aspect: number, rank = 0): LabelSlot {
  return { sprite, aspect, rank, force: false, visible: false, rect: { l: 0, r: 0, b: 0, t: 0 } };
}

const byPriority = (a: PlaceSlot, b: PlaceSlot) =>
  Number(b.force) - Number(a.force) || a.rank - b.rank;

/**
 * The shared label placement pass. Candidate slots (`visible` true on entry) are placed in
 * priority order (forced first, then ascending `rank`); one that overlaps a label already
 * placed is hidden, except a forced label, which always stays. Sets `visible` and
 * `sprite.visible`. Sorts `slots` in place and allocates nothing else, so it can run every
 * frame (AGENTS Performance rule 4).
 */
export function placeLabels(slots: PlaceSlot[]): void {
  slots.sort(byPriority);
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (s.visible && !s.force) {
      for (let j = 0; j < i; j++) {
        if (slots[j].visible && overlaps(slots[j].rect, s.rect)) {
          s.visible = false;
          break;
        }
      }
    }
    if (s.sprite) s.sprite.visible = s.visible;
  }
}

/**
 * Writes the label's rectangle on screen to `out` and returns true when its anchor is in
 * front of the camera and inside the viewport. A label centred on a pin near the screen edge
 * would run off it; it is then anchored on its other side so the text extends inward (it
 * stays attached to its pin, only the side changes).
 */
export function labelRect(
  lbl: THREE.Sprite,
  camera: THREE.Camera,
  camPos: THREE.Vector3,
  out: ScreenRect,
  tmp: THREE.Vector3,
): boolean {
  lbl.center.set(0.5, 0.5);
  const cam = camera as THREE.PerspectiveCamera;
  if (!cam.isPerspectiveCamera) return false;
  lbl.getWorldPosition(tmp);
  const dist = Math.max(0.01, camPos.distanceTo(tmp));
  tmp.project(cam);
  if (tmp.z > 1 || Math.abs(tmp.x) > 1 || Math.abs(tmp.y) > 1) return false;
  const tanHalf = Math.tan((cam.fov * Math.PI) / 360);
  const w = lbl.scale.x / (dist * tanHalf * cam.aspect);
  const h = lbl.scale.y / (dist * tanHalf);
  if (tmp.x + w / 2 > 1) lbl.center.set(1, 0.5);
  else if (tmp.x - w / 2 < -1) lbl.center.set(0, 0.5);
  const left = tmp.x - lbl.center.x * w;
  out.l = left;
  out.r = left + w;
  out.b = tmp.y - h / 2;
  out.t = tmp.y + h / 2;
  return true;
}

/** Vertical field of view of a perspective camera, degrees (55 when it is not one). */
export function cameraFov(camera: THREE.Camera): number {
  const cam = camera as THREE.PerspectiveCamera;
  return cam.isPerspectiveCamera ? cam.fov : 55;
}

/** What the e2e probe reads through `window.__scenePins` (client pixels in the canvas box). */
export interface PinsSnapshot {
  scale: string;
  viewportH: number;
  labels: Array<{
    id: string;
    shown: boolean;
    cx: number;
    cy: number;
    w: number;
    h: number;
    textPx: number;
  }>;
  rings: Array<{
    id: string;
    visible: boolean;
    opacity: number;
    cx: number;
    cy: number;
    d: number;
  }>;
}

/** One pin as the probe sees it. */
export interface ProbePin {
  id: string;
  slot?: LabelSlot;
  ring?: THREE.Sprite;
}

const _p = new THREE.Vector3();
const _c = new THREE.Vector3();

export function snapshotPins(
  scale: string,
  pins: readonly ProbePin[],
  camera: THREE.Camera,
  w: number,
  h: number,
): PinsSnapshot {
  camera.updateMatrixWorld();
  camera.getWorldPosition(_c);
  const fov = cameraFov(camera);
  const px = (sprite: THREE.Sprite) => {
    sprite.getWorldPosition(_p);
    const dist = Math.max(0.01, _c.distanceTo(_p));
    const wpp = worldPerPx(dist, fov, h);
    _p.project(camera);
    return { wpp, x: ((_p.x + 1) / 2) * w, y: ((1 - _p.y) / 2) * h };
  };
  const out: PinsSnapshot = { scale, viewportH: h, labels: [], rings: [] };
  for (const pin of pins) {
    if (pin.slot) {
      const s = pin.slot.sprite;
      const { wpp, x, y } = px(s);
      out.labels.push({
        id: pin.id,
        shown: s.visible,
        cx: x,
        cy: y,
        w: s.scale.x / wpp,
        h: s.scale.y / wpp,
        textPx: (s.scale.y / wpp) * (LABEL_TEXT_PX / LABEL_SPRITE_PX),
      });
    }
    if (pin.ring) {
      const { wpp, x, y } = px(pin.ring);
      const opacity = (pin.ring.material as THREE.SpriteMaterial).opacity;
      out.rings.push({
        id: pin.id,
        visible: pin.ring.visible && opacity > 0,
        opacity,
        cx: x,
        cy: y,
        d: (pin.ring.scale.x / wpp) * (RING_PX / RING_SPRITE_PX),
      });
    }
  }
  return out;
}
