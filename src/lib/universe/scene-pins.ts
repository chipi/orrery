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

/**
 * How far in front of the camera's image plane a world point is (view-space depth). Three's
 * sprite shader projects with this depth, not with the Euclidean distance, so a pin 40 degrees
 * off the view axis draws 1 / cos(40) = 1.3 times larger when it is sized from the distance.
 * Pass it to `worldPerPx`. Reads `camera.matrixWorldInverse`: call `camera.updateMatrixWorld()`
 * first. Negative behind the camera.
 */
export function viewDepth(camera: THREE.Camera, p: THREE.Vector3): number {
  const e = camera.matrixWorldInverse.elements;
  return -(e[2] * p.x + e[6] * p.y + e[10] * p.z + e[14]);
}

/**
 * Writes `base` moved `lift` world units along the camera's screen-up into `out`. A label
 * lifted along world Y would foreshorten to nothing when the camera looks straight down; this
 * lift is `lift` on screen in every pose.
 */
export function liftOnScreen(
  out: THREE.Vector3,
  base: THREE.Vector3,
  camera: THREE.Camera,
  lift: number,
): THREE.Vector3 {
  const e = camera.matrixWorld.elements;
  return out.set(base.x + e[4] * lift, base.y + e[5] * lift, base.z + e[6] * lift);
}

/** World units one CSS pixel covers at view depth `dist` of a perspective camera (see `viewDepth`). */
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
  /** Fixed creation index: the last tie-break, so equal ranks place in the same order every frame. */
  order: number;
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

let nextSlotOrder = 0;

export function newLabelSlot(sprite: THREE.Sprite, aspect: number, rank = 0): LabelSlot {
  return {
    sprite,
    aspect,
    rank,
    order: nextSlotOrder++,
    force: false,
    visible: false,
    rect: { l: 0, r: 0, b: 0, t: 0 },
  };
}

const byPriority = (a: PlaceSlot, b: PlaceSlot) =>
  Number(b.force) - Number(a.force) || a.rank - b.rank || a.order - b.order;

/**
 * The shared label placement pass. Candidate slots (`visible` true on entry) are placed in
 * priority order (forced first, then ascending `rank`, then creation `order`); one that
 * overlaps a label already placed is hidden, except a forced label, which always stays. Sets
 * `visible` and `sprite.visible`. Sorts `slots` in place; it allocates nothing per frame
 * beyond what the engine's sort itself needs (AGENTS Performance rule 4).
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

/** Left edge for labels in NDC: the INDEX pull tab covers the screen's left edge, so a label
 *  next to it flips inward as it does at the screen edge. Set by the scene host. */
let leftEdgeNdc = -1;

/** `px`: how far the left edge's cover reaches into the canvas; `canvasW`: canvas width, px. */
export function setLabelLeftInset(px: number, canvasW: number): void {
  leftEdgeNdc = canvasW > 0 ? -1 + (2 * Math.max(0, px)) / canvasW : -1;
}

/**
 * Writes the label's rectangle on screen to `out` and returns true when its anchor is in
 * front of the camera and inside the viewport. A label centred on a pin near the screen edge
 * (or the INDEX tab, `setLabelLeftInset`) would run off it or under it; it is then anchored on
 * its other side so the text extends inward (it stays attached to its pin, only the side changes).
 */
export function labelRect(
  lbl: THREE.Sprite,
  camera: THREE.Camera,
  out: ScreenRect,
  tmp: THREE.Vector3,
): boolean {
  lbl.center.set(0.5, 0.5);
  const cam = camera as THREE.PerspectiveCamera;
  if (!cam.isPerspectiveCamera) return false;
  lbl.getWorldPosition(tmp);
  const dist = Math.max(0.01, viewDepth(cam, tmp));
  tmp.project(cam);
  if (tmp.z > 1 || Math.abs(tmp.x) > 1 || Math.abs(tmp.y) > 1) return false;
  const tanHalf = Math.tan((cam.fov * Math.PI) / 360);
  const w = lbl.scale.x / (dist * tanHalf * cam.aspect);
  const h = lbl.scale.y / (dist * tanHalf);
  if (tmp.x + w / 2 > 1) lbl.center.set(1, 0.5);
  else if (tmp.x - w / 2 < leftEdgeNdc) lbl.center.set(0, 0.5);
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
    /** The sprite's anchor point (its pin), canvas px. */
    cx: number;
    cy: number;
    /** The label rectangle as drawn, canvas px: left and top edge (an edge-anchored label is not centred on cx). */
    x: number;
    y: number;
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
const _a = new THREE.Vector3();
const _q = new THREE.Vector3();

/**
 * Length in CSS px that `len` world units take along the camera's right (axis 0) or up (axis 1)
 * at `p`, read off the projection of two points. It does not use `worldPerPx` or `viewDepth`, so a
 * wrong sizing formula cannot also fake the measurement.
 */
export function projectedPx(
  camera: THREE.Camera,
  p: THREE.Vector3,
  len: number,
  axis: 0 | 1,
  viewportPx: number,
): number {
  const e = camera.matrixWorld.elements;
  const o = axis * 4;
  _q.set(p.x + e[o] * len, p.y + e[o + 1] * len, p.z + e[o + 2] * len).project(camera);
  const a = _a.copy(p).project(camera);
  return (Math.abs(axis ? _q.y - a.y : _q.x - a.x) * viewportPx) / 2;
}

/** A sprite's rectangle as drawn, canvas px (left, top, size), measured by projection. */
export function spriteRectPx(
  sprite: THREE.Sprite,
  camera: THREE.Camera,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number } {
  camera.updateMatrixWorld();
  sprite.getWorldPosition(_p);
  const pw = projectedPx(camera, _p, sprite.scale.x, 0, w);
  const ph = projectedPx(camera, _p, sprite.scale.y, 1, h);
  _p.project(camera);
  const cx = ((_p.x + 1) / 2) * w;
  const cy = ((1 - _p.y) / 2) * h;
  return { x: cx - sprite.center.x * pw, y: cy - (1 - sprite.center.y) * ph, w: pw, h: ph };
}

export function snapshotPins(
  scale: string,
  pins: readonly ProbePin[],
  camera: THREE.Camera,
  w: number,
  h: number,
): PinsSnapshot {
  camera.updateMatrixWorld();
  const at = (sprite: THREE.Sprite) => {
    sprite.getWorldPosition(_p);
    const pw = projectedPx(camera, _p, sprite.scale.x, 0, w);
    const ph = projectedPx(camera, _p, sprite.scale.y, 1, h);
    _p.project(camera);
    return { pw, ph, x: ((_p.x + 1) / 2) * w, y: ((1 - _p.y) / 2) * h };
  };
  const out: PinsSnapshot = { scale, viewportH: h, labels: [], rings: [] };
  for (const pin of pins) {
    if (pin.slot) {
      const s = pin.slot.sprite;
      const { pw, ph, x, y } = at(s);
      out.labels.push({
        id: pin.id,
        shown: s.visible,
        cx: x,
        cy: y,
        x: x - s.center.x * pw,
        y: y - (1 - s.center.y) * ph,
        w: pw,
        h: ph,
        textPx: ph * (LABEL_TEXT_PX / LABEL_SPRITE_PX),
      });
    }
    if (pin.ring) {
      const { pw, x, y } = at(pin.ring);
      const opacity = (pin.ring.material as THREE.SpriteMaterial).opacity;
      out.rings.push({
        id: pin.id,
        visible: pin.ring.visible && opacity > 0,
        opacity,
        cx: x,
        cy: y,
        d: pw * (RING_PX / RING_SPRITE_PX),
      });
    }
  }
  return out;
}
