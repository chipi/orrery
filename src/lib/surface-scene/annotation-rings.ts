/**
 * Fixed-screen-size annotation rings for the surface close-ups (flat ground
 * view + 3D detail patch). Positions come from the ground (metres), sizes never
 * do: a ring is the same CSS px at every zoom, so annotations metres apart stay
 * separate rings instead of merging into one blob.
 */

import type { HotspotAnnotation } from '$types/surface-site';

/** Drawn ring diameter in CSS px: scales a little with the view, 32 px on a phone. */
export const RING_MIN_PX = 32;
export const RING_MAX_PX = 44;
export const RING_STROKE_PX = 3;
/** Invisible tap target around the ring, larger than the ring itself. */
export const HIT_PX = 48;
/** Leader line from the ring's edge to its label chip. */
export const LEADER_PX = 12;
export const LABEL_HEIGHT_PX = 22;
// Space Mono 11px + 0.03em tracking measures 7.33 px per glyph; 8 px padding + 1 px border each side
const LABEL_CHAR_PX = 7.4;
const LABEL_PAD_PX = 20;
/** Outer glow around the ring that labels must also stay clear of. */
const GLOW_PX = 4;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RingAnchor {
  id: string;
  x: number;
  y: number;
}

/** A ring with its projected screen position (CSS px, relative to the overlay). */
export interface PlacedRing {
  annotation: HotspotAnnotation;
  x: number;
  y: number;
}

export type LabelSide = 'right' | 'left';

export function ringDiameter(viewW: number): number {
  return Math.max(RING_MIN_PX, Math.min(RING_MAX_PX, Math.round(viewW * 0.032)));
}

/** Screen position of a ground offset (metres north / east of the site point).
 *  `origin` is where the site point sits on screen; +lat is up. */
export function groundOffsetToScreen(
  latOffsetM: number,
  lonOffsetM: number,
  kmPerPx: number,
  origin: { x: number; y: number },
): { x: number; y: number } {
  const mPerPx = kmPerPx * 1000;
  return { x: origin.x + lonOffsetM / mPerPx, y: origin.y - latOffsetM / mPerPx };
}

/** A ring is drawn only while its tap target intersects the view. */
export function ringInView(x: number, y: number, w: number, h: number): boolean {
  const r = HIT_PX / 2;
  return x + r > 0 && x - r < w && y + r > 0 && y - r < h;
}

export function estimateLabelWidth(label: string): number {
  return Math.ceil(label.length * LABEL_CHAR_PX + LABEL_PAD_PX);
}

/** The chip's rectangle; its leader line runs from the ring's edge to the chip. */
export function labelRect(a: RingAnchor, width: number, side: LabelSide, ringPx: number): Rect {
  const off = ringPx / 2 + LEADER_PX;
  return {
    x: side === 'right' ? a.x + off : a.x - off - width,
    y: a.y - LABEL_HEIGHT_PX / 2,
    w: width,
    h: LABEL_HEIGHT_PX,
  };
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function ringDisc(a: RingAnchor, ringPx: number): Rect {
  const r = ringPx / 2 + GLOW_PX;
  return { x: a.x - r, y: a.y - r, w: 2 * r, h: 2 * r };
}

/**
 * Which labels fit. Rings always stay; a label goes to the right of its ring,
 * else the left, and is dropped when both sides run out of view or hit a ring or
 * an already placed label. Earlier anchors win a clash, so callers pass them in
 * priority order.
 */
export function layoutLabels(
  anchors: Array<RingAnchor & { label: string }>,
  view: { w: number; h: number },
  ringPx: number,
  blocked: Rect[] = [],
): Map<string, { side: LabelSide; rect: Rect }> {
  const placed = new Map<string, { side: LabelSide; rect: Rect }>();
  const discs = anchors.map((a) => ringDisc(a, ringPx));
  for (const [i, a] of anchors.entries()) {
    const width = estimateLabelWidth(a.label);
    for (const side of ['right', 'left'] as const) {
      const rect = labelRect(a, width, side, ringPx);
      const inside =
        rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= view.w && rect.y + rect.h <= view.h;
      if (!inside) continue;
      const clash =
        discs.some((d, j) => j !== i && overlaps(rect, d)) ||
        blocked.some((b) => overlaps(rect, b)) ||
        [...placed.values()].some((p) => overlaps(rect, p.rect));
      if (clash) continue;
      placed.set(a.id, { side, rect });
      break;
    }
  }
  return placed;
}
