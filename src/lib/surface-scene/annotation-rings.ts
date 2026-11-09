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
  /** This ring's own drawn diameter when it differs from the shared one (small crater rings). */
  ringPx?: number;
}

/** A ring with its projected screen position (CSS px, relative to the overlay). */
export interface PlacedRing {
  annotation: HotspotAnnotation;
  x: number;
  y: number;
  /** Ground radius of an area annotation in screen px (dashed outline at true size). */
  radiusPx?: number;
}

export type LabelSide = 'right' | 'left' | 'top' | 'bottom';

export function ringDiameter(viewW: number): number {
  return Math.max(RING_MIN_PX, Math.min(RING_MAX_PX, Math.round(viewW * 0.032)));
}

/** Craters get a smaller ring than hardware. */
export const SMALL_RING_FACTOR = 0.6;
/** An area's tap handle (a small dot on its dashed outline), not a ring. */
export const AREA_HANDLE_PX = 14;

export function ringPxFor(a: HotspotAnnotation, basePx: number): number {
  return a.ring_size === 'small' ? Math.round(basePx * SMALL_RING_FACTOR) : basePx;
}

/** Screen radius of an area annotation: its ground radius over the ground size of a pixel; undefined for a point. */
export function areaRadiusPx(a: HotspotAnnotation, mPerPx: number): number | undefined {
  return a.area_radius_m && mPerPx > 0 ? a.area_radius_m / mPerPx : undefined;
}

/**
 * Where an area is tapped and labelled: the top of its outline (an area centred on a
 * lander would otherwise stack its tap target on the lander ring). A point is unchanged.
 */
export function interactivePosition(r: PlacedRing): PlacedRing {
  return r.radiusPx ? { ...r, y: r.y - r.radiusPx } : r;
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
  if (side === 'bottom') {
    return { x: a.x - width / 2, y: a.y + off, w: width, h: LABEL_HEIGHT_PX };
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
 * the left, then above, then below it; a side is skipped when the chip would be clipped by
 * the view edge, run under a blocked rectangle (the side panel, HUD), or touch a
 * ring or an already placed label. Texts are tried in order: the full name on every
 * side, then the curated short name (`short`) on every side, and only then a shortened
 * chip (ellipsis). A ring that itself sits partly past the view edge gets a last
 * resort: its chip above or below it, slid along the edge to stay inside the view.
 * A label that fits nowhere is dropped. Earlier anchors win a clash, so callers pass them in
 * priority order. `text` is the string the chip must show.
 */
export function layoutLabels(
  anchors: Array<RingAnchor & { label: string; short?: string }>,
  view: { w: number; h: number },
  ringPx: number,
  blocked: Rect[] = [],
): Map<string, { side: LabelSide; rect: Rect; text: string }> {
  const placed = new Map<string, { side: LabelSide; rect: Rect; text: string }>();
  const discs = [...anchors.map((a) => ringDisc(a, a.ringPx ?? ringPx)), ...blocked];
  const inView = (r: Rect): boolean =>
    r.x >= 0 && r.y >= 0 && r.x + r.w <= view.w && r.y + r.h <= view.h;
  for (const [i, a] of anchors.entries()) {
    const own = a.ringPx ?? ringPx;
    const full = estimateLabelWidth(a.label);
    const candidates = [{ text: a.label, width: full }];
    const shortWidth = a.short ? estimateLabelWidth(a.short) : full;
    if (a.short && shortWidth < full) candidates.push({ text: a.short, width: shortWidth });
    if (Math.min(full, shortWidth) > SHORT_LABEL_PX) {
      candidates.push({
        text: a.short && shortWidth < full ? a.short : a.label,
        width: SHORT_LABEL_PX,
      });
    }
    const free = (rect: Rect): boolean =>
      !discs.some((d, j) => j !== i && overlaps(rect, d)) &&
      ![...placed.values()].some((p) => overlaps(rect, p.rect));
    // the full name on any side beats a shorter text on a preferred one
    search: {
      for (const { text, width } of candidates) {
        for (const side of ['right', 'left', 'top', 'bottom'] as const) {
          const rect = labelRect(a, width, side, own);
          if (!inView(rect) || !free(rect)) continue;
          placed.set(a.id, { side, rect, text });
          break search;
        }
      }
      if (a.x - own / 2 >= 0 && a.x + own / 2 <= view.w) break search;
      for (const { text, width } of candidates) {
        if (width > view.w) continue;
        for (const side of ['top', 'bottom'] as const) {
          const raw = labelRect(a, width, side, own);
          const rect = { ...raw, x: Math.max(0, Math.min(raw.x, view.w - width)) };
          if (!inView(rect) || !free(rect)) continue;
          placed.set(a.id, { side, rect, text });
          break search;
        }
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
