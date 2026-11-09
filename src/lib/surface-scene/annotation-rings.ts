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
/** Width of the shortened (ellipsis) chip tried before a label is dropped. */
const SHORT_LABEL_PX = 120;
const MAX_SEPARATION_FACTOR = 12;

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

export type LabelSide = 'right' | 'left' | 'top';

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
  if (side === 'top') {
    return { x: a.x - width / 2, y: a.y - off - LABEL_HEIGHT_PX, w: width, h: LABEL_HEIGHT_PX };
  }
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

function ringDisc(a: { x: number; y: number }, ringPx: number): Rect {
  const r = ringPx / 2 + GLOW_PX;
  return { x: a.x - r, y: a.y - r, w: 2 * r, h: 2 * r };
}

/** The footprint of a ring (or cluster ring) that labels and cards must keep clear of. */
export const ringFootprint = ringDisc;

/**
 * Which labels fit. Rings always stay. A label tries the right of its ring, then
 * the left, then above it; a side is skipped when the chip would be clipped by
 * the view edge, run under a blocked rectangle (the side panel, HUD), or touch a
 * ring or an already placed label. Only when the full name fits on no side is a
 * shortened chip (ellipsis) tried, and a label that fits nowhere is dropped. Earlier anchors win a clash, so callers pass them in
 * priority order.
 */
export function layoutLabels(
  anchors: Array<RingAnchor & { label: string }>,
  view: { w: number; h: number },
  ringPx: number,
  blocked: Rect[] = [],
): Map<string, { side: LabelSide; rect: Rect }> {
  const placed = new Map<string, { side: LabelSide; rect: Rect }>();
  const discs = [...anchors.map((a) => ringDisc(a, ringPx)), ...blocked];
  for (const [i, a] of anchors.entries()) {
    const full = estimateLabelWidth(a.label);
    const widths = full > SHORT_LABEL_PX ? [full, SHORT_LABEL_PX] : [full];
    // the full name on any side beats a shortened chip on a preferred one
    search: for (const width of widths) {
      for (const side of ['right', 'left', 'top'] as const) {
        const rect = labelRect(a, width, side, ringPx);
        const inside =
          rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= view.w && rect.y + rect.h <= view.h;
        if (!inside) continue;
        const clash =
          discs.some((d, j) => j !== i && overlaps(rect, d)) ||
          [...placed.values()].some((p) => overlaps(rect, p.rect));
        if (clash) continue;
        placed.set(a.id, { side, rect });
        break search;
      }
    }
  }
  return placed;
}

export interface RingCluster {
  /** Stable while the same rings stay together; resets a fan-out when they separate. */
  key: string;
  x: number;
  y: number;
  members: PlacedRing[];
}

/** Rings merge into one count badge from this many overlapping rings. */
export const CLUSTER_MIN = 3;

/**
 * Groups of CLUSTER_MIN+ rings that overlap at the current zoom (centres closer
 * than one ring diameter, chained). Smaller groups stay individual rings.
 */
export function clusterRings(
  rings: PlacedRing[],
  ringPx: number,
): { singles: PlacedRing[]; clusters: RingCluster[] } {
  const parent = rings.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < rings.length; i++) {
    for (let j = i + 1; j < rings.length; j++) {
      if (Math.hypot(rings[i].x - rings[j].x, rings[i].y - rings[j].y) < ringPx) {
        parent[find(i)] = find(j);
      }
    }
  }
  const groups = new Map<number, PlacedRing[]>();
  rings.forEach((r, i) => {
    const root = find(i);
    groups.set(root, [...(groups.get(root) ?? []), r]);
  });
  const singles: PlacedRing[] = [];
  const clusters: RingCluster[] = [];
  for (const members of groups.values()) {
    if (members.length < CLUSTER_MIN) {
      singles.push(...members);
      continue;
    }
    clusters.push({
      key: members
        .map((r) => r.annotation.id)
        .sort()
        .join('|'),
      x: members.reduce((n, r) => n + r.x, 0) / members.length,
      y: members.reduce((n, r) => n + r.y, 0) / members.length,
      members,
    });
  }
  const order = new Map(rings.map((r, i) => [r, i]));
  singles.sort((a, b) => order.get(a)! - order.get(b)!);
  return { singles, clusters };
}

/** By how much to zoom in so every pair of the cluster's rings clears a ring diameter. */
export function separationFactor(members: PlacedRing[], ringPx: number): number {
  let min = Infinity;
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      min = Math.min(min, Math.hypot(members[i].x - members[j].x, members[i].y - members[j].y));
    }
  }
  if (!(min > 0)) return MAX_SEPARATION_FACTOR;
  return Math.min(MAX_SEPARATION_FACTOR, Math.max(1.5, (ringPx * 1.15) / min));
}

/** Where a cluster's rings sit when fanned out (zoom already at its limit): a circle round the badge. */
export function fanOutPositions(
  cluster: RingCluster,
  ringPx: number,
): Map<string, { x: number; y: number }> {
  const n = cluster.members.length;
  const radius = Math.max(ringPx * 1.3, (ringPx * 1.2) / (2 * Math.sin(Math.PI / n)));
  const out = new Map<string, { x: number; y: number }>();
  cluster.members.forEach((r, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    out.set(r.annotation.id, {
      x: cluster.x + radius * Math.cos(angle),
      y: cluster.y + radius * Math.sin(angle),
    });
  });
  return out;
}

/**
 * Where the hover preview card goes: beside the ring on the preferred side, else
 * the other side, above, then below. A spot is used only if the whole card stays
 * inside the view and clear of the blocked rectangles (side panel, HUD); when none
 * is clean the preferred spot is kept, clamped into the view.
 */
export function placeCard(
  at: { x: number; y: number },
  size: { w: number; h: number },
  preferred: 'left' | 'right',
  view: { w: number; h: number },
  blocked: Rect[] = [],
): { x: number; y: number } {
  const gap = HIT_PX / 2 + 4;
  const clampY = (y: number) => Math.max(8, Math.min(y, view.h - size.h - 8));
  const clampX = (x: number) => Math.max(8, Math.min(x, view.w - size.w - 8));
  const right = { x: at.x + gap, y: clampY(at.y - size.h / 2) };
  const left = { x: at.x - gap - size.w, y: right.y };
  const above = { x: clampX(at.x - size.w / 2), y: at.y - gap - size.h };
  const below = { x: above.x, y: at.y + gap };
  const order = preferred === 'right' ? [right, left, above, below] : [left, right, above, below];
  const fits = (p: { x: number; y: number }) =>
    p.x >= 8 &&
    p.y >= 8 &&
    p.x + size.w <= view.w - 8 &&
    p.y + size.h <= view.h - 8 &&
    !blocked.some((b) => overlaps({ ...p, w: size.w, h: size.h }, b));
  const pick = order.find(fits) ?? order[0];
  return { x: clampX(pick.x), y: clampY(pick.y) };
}
