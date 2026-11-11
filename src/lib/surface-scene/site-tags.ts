/**
 * Site tags (#641 1c): the screen-space marker for every surface site,
 * launch pad, museum and observatory, replacing the tier-0 3D models and
 * sprite labels. Each tag is an HTML element over the canvas: a framed icon
 * in the nation's colour with a status chip, a 45° leader and a glass card
 * with the name and one line of facts. Positions come from the scene each
 * frame (`sync`); the DOM is built once per tag and then only moved.
 *
 * Frames never overlap: tags whose frames would touch merge into one group
 * tag at their centroid, drawn as the highest-priority member with a count
 * badge (approximate by design — zooming in splits it).
 *
 * Cards thin by priority: a card that would cover a card already placed, a
 * frame of equal or higher priority, or leave the view is dropped, and its
 * tag shows the frame alone. Lower-priority frames may sit under a card
 * (it draws on top).
 */
import type { SiteStatus, SurfaceSite } from '$types/surface-site';
import type { Museum } from '$types/museum';
import type { Observatory } from '$types/observatory';
import * as m from '$lib/paraglide/messages';
import { colorFor } from '$lib/surface-map/nation-palette';
import { categoriseMarsMarker } from '$lib/mars-marker-category';
import { categoriseMoonMarker } from '$lib/moon-marker-category';
import { statusTone } from '$lib/surface-scene/status-tone';
import { MUSEUM_PIN_COLOR, OBSERVATORY_PIN_COLOR } from '$lib/surface-scene/museum-layer';

export type TagIcon =
  | 'rover'
  | 'merRover'
  | 'lunokhod'
  | 'lander'
  | 'insight'
  | 'viking'
  | 'lm'
  | 'petal'
  | 'probe'
  | 'pad'
  | 'museum'
  | 'scope';

export interface TagSpec {
  key: string;
  icon: TagIcon;
  /** Accent: frame, leader and card edge. */
  color: string;
  name: string;
  /** Short category word, drawn in the accent colour. */
  type: string;
  /** Rest of the fact line (agency, year, country…), may be empty. */
  facts: string;
  status?: SiteStatus | string;
  /** Localized status word; shown when set. */
  statusLabel?: string;
  /** Higher wins a card when anchors crowd. */
  priority: number;
}

export interface TagFrame {
  key: string;
  x: number;
  y: number;
  /** 0 hides the tag; frame and card both fade with it. */
  opacity: number;
  /** Added to the spec's priority (the selected site claims its card first). */
  boost?: number;
  /** Card and leader opacity multiplier (default 1); at 0 the tag is its icon alone, whatever the zoom stage. */
  card?: number;
}

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface CardCandidate {
  key: string;
  priority: number;
  frame: Rect;
  /** Card boxes in order of preference (up-right, then up-left). */
  cards: Rect[];
}

const overlaps = (a: Rect, b: Rect) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

const W = '#f4f7fb';
const D = 'rgba(244,247,251,0.55)';

/** Icons on a 40×40 grid centred at 0,0: primary strokes ~1.4, detail 0.8–1. */
export const TAG_ICONS: Record<TagIcon, string> = {
  rover: `<path d="M-13 1h20l3-4h-26z" fill="${W}" fill-opacity="0.18" stroke="${W}" stroke-width="1.5" stroke-linejoin="round"/><path d="M-11 1l-4 6M-11 1l3 6M3 1l-3 6M3 1l5 6" stroke="${W}" stroke-width="1.3" stroke-linecap="round"/><circle cx="-15" cy="9" r="2.6" fill="none" stroke="${W}" stroke-width="1.4"/><circle cx="-6" cy="9" r="2.6" fill="none" stroke="${W}" stroke-width="1.4"/><circle cx="1" cy="9" r="2.6" fill="none" stroke="${W}" stroke-width="1.4"/><circle cx="9" cy="9" r="2.6" fill="none" stroke="${W}" stroke-width="1.4"/><path d="M8 -3V-13" stroke="${W}" stroke-width="1.5" stroke-linecap="round"/><rect x="5" y="-17" width="7" height="4" rx="0.8" fill="${W}"/><path d="M-13 -3l-3 -3h-3" stroke="${D}" stroke-width="1" fill="none"/><rect x="-16" y="-5" width="4" height="3" fill="${D}"/><path d="M10 -1l5 -4l3 2" stroke="${D}" stroke-width="1" fill="none" stroke-linecap="round"/>`,
  merRover: `<path d="M-14 -4h26v3h-26z" fill="${W}" fill-opacity="0.2" stroke="${W}" stroke-width="1.3"/><path d="M-12 -4l3 -5h14l3 5" fill="none" stroke="${D}" stroke-width="1"/><path d="M-10 -1v4M-2 -1v4M8 -1v4" stroke="${W}" stroke-width="1.2"/><circle cx="-11" cy="7" r="2.6" fill="none" stroke="${W}" stroke-width="1.4"/><circle cx="-2" cy="7" r="2.6" fill="none" stroke="${W}" stroke-width="1.4"/><circle cx="8" cy="7" r="2.6" fill="none" stroke="${W}" stroke-width="1.4"/><path d="M2 -9V-15" stroke="${W}" stroke-width="1.4"/><rect x="-1" y="-18" width="7" height="3.5" rx="0.8" fill="${W}"/>`,
  lunokhod: `<path d="M-14 -6h28l-2 5h-24z" fill="${W}" fill-opacity="0.15" stroke="${W}" stroke-width="1.3"/><path d="M-15 -6a15 7 0 0 1 30 0" fill="${W}" fill-opacity="0.25" stroke="${W}" stroke-width="1.4"/><path d="M-12 -1h24v4h-24z" fill="${W}" fill-opacity="0.3" stroke="${W}" stroke-width="1.2"/><circle cx="-11" cy="7" r="2.8" fill="none" stroke="${W}" stroke-width="1.4"/><circle cx="-4" cy="7" r="2.8" fill="none" stroke="${W}" stroke-width="1.4"/><circle cx="4" cy="7" r="2.8" fill="none" stroke="${W}" stroke-width="1.4"/><circle cx="11" cy="7" r="2.8" fill="none" stroke="${W}" stroke-width="1.4"/><path d="M10 -9l4 -6" stroke="${W}" stroke-width="1.1"/>`,
  lander: `<path d="M-9 -4h18l3 6h-24z" fill="${W}" fill-opacity="0.2" stroke="${W}" stroke-width="1.5" stroke-linejoin="round"/><path d="M-6 -4l2 -6h8l2 6" fill="none" stroke="${D}" stroke-width="1"/><path d="M-10 2l-5 9M10 2l5 9M-3 2l-2 9M3 2l2 9" stroke="${W}" stroke-width="1.4" stroke-linecap="round"/><path d="M-18 11h6M12 11h6M-7 11h4M3 11h4" stroke="${W}" stroke-width="1.6" stroke-linecap="round"/><path d="M0 -10v-5" stroke="${W}" stroke-width="1.2"/><circle cx="0" cy="-16" r="1.6" fill="${W}"/>`,
  insight: `<circle cx="-12" cy="-2" r="7" fill="${W}" fill-opacity="0.12" stroke="${W}" stroke-width="1.3"/><path d="M-12 -9v14M-19 -2h14M-17 -7l10 10M-17 3l10 -10" stroke="${D}" stroke-width="0.8"/><circle cx="12" cy="-2" r="7" fill="${W}" fill-opacity="0.12" stroke="${W}" stroke-width="1.3"/><path d="M12 -9v14M5 -2h14M7 -7l10 10M7 3l10 -10" stroke="${D}" stroke-width="0.8"/><path d="M-5 -4h10v5h-10z" fill="${W}" fill-opacity="0.3" stroke="${W}" stroke-width="1.3"/><path d="M-4 1l-4 9M4 1l4 9M0 1v9" stroke="${W}" stroke-width="1.3" stroke-linecap="round"/><path d="M-10 10h4M6 10h4M-2 10h4" stroke="${W}" stroke-width="1.5" stroke-linecap="round"/>`,
  viking: `<path d="M-10 -3h20l-3 6h-14z" fill="${W}" fill-opacity="0.2" stroke="${W}" stroke-width="1.5" stroke-linejoin="round"/><path d="M-8 3l-7 8M8 3l7 8M0 3v8" stroke="${W}" stroke-width="1.4" stroke-linecap="round"/><path d="M-18 11h6M12 11h6M-3 11h6" stroke="${W}" stroke-width="1.6" stroke-linecap="round"/><path d="M-4 -3v-7M-4 -10h-6" stroke="${W}" stroke-width="1.2"/><path d="M5 -3l3 -10" stroke="${W}" stroke-width="1.2"/><path d="M2 -15a6 6 0 0 1 11 3z" fill="${W}" fill-opacity="0.35" stroke="${W}" stroke-width="1"/>`,
  lm: `<path d="M-7 -16h14l3 5v6h-20v-6z" fill="${W}" fill-opacity="0.22" stroke="${W}" stroke-width="1.4" stroke-linejoin="round"/><path d="M-3 -12h6v4h-6z" fill="${W}" fill-opacity="0.6"/><path d="M-12 -5h24v7h-24z" fill="${W}" fill-opacity="0.12" stroke="${W}" stroke-width="1.4"/><path d="M-6 -5v7M0 -5v7M6 -5v7" stroke="${D}" stroke-width="0.8"/><path d="M-12 2l-6 9M12 2l6 9M-6 2l-3 9M6 2l3 9" stroke="${W}" stroke-width="1.3" stroke-linecap="round"/><ellipse cx="-19" cy="11.5" rx="3" ry="1" fill="${W}"/><ellipse cx="19" cy="11.5" rx="3" ry="1" fill="${W}"/><ellipse cx="-9" cy="11.5" rx="2.5" ry="0.9" fill="${W}"/><ellipse cx="9" cy="11.5" rx="2.5" ry="0.9" fill="${W}"/>`,
  // Mars 2/3/6: the spherical capsule with four petals splayed open.
  petal: `<circle cx="0" cy="-2" r="7.5" fill="${W}" fill-opacity="0.2" stroke="${W}" stroke-width="1.5"/><path d="M-5 -7a7 7 0 0 1 10 0" fill="none" stroke="${D}" stroke-width="0.9"/><path d="M-6 3l-11 6l4 -10z M6 3l11 6l-4 -10z" fill="${W}" fill-opacity="0.25" stroke="${W}" stroke-width="1.2" stroke-linejoin="round"/><path d="M-4 5l-3 7h14l-3 -7" fill="${W}" fill-opacity="0.12" stroke="${W}" stroke-width="1.2" stroke-linejoin="round"/><path d="M0 -10v-6" stroke="${W}" stroke-width="1.2"/><path d="M-19 12h38" stroke="${D}" stroke-width="1"/>`,
  // Venera / Vega: the pressure sphere on its crush ring, drag disc on top.
  probe: `<path d="M-15 -9h30" stroke="${W}" stroke-width="1.8" stroke-linecap="round"/><path d="M-3 -9v-5h6v5" fill="none" stroke="${W}" stroke-width="1.2"/><circle cx="0" cy="0" r="8" fill="${W}" fill-opacity="0.2" stroke="${W}" stroke-width="1.5"/><path d="M-8 0h16M0 -8a12 8 0 0 1 0 16" fill="none" stroke="${D}" stroke-width="0.8"/><path d="M-11 10h22l-3 -3h-16z" fill="${W}" fill-opacity="0.25" stroke="${W}" stroke-width="1.3" stroke-linejoin="round"/><path d="M-17 12h34" stroke="${D}" stroke-width="1"/>`,
  pad: `<path d="M-2 -19c1-3 3-3 4 0v22h-4z" fill="${W}" fill-opacity="0.35" stroke="${W}" stroke-width="1.3" stroke-linejoin="round"/><path d="M-2 0l-3 4M2 0l3 4" stroke="${W}" stroke-width="1.2"/><path d="M7 -17v21M12 -17v21" stroke="${W}" stroke-width="1.3"/><path d="M7 -13l5 4M12 -13l-5 4M7 -6l5 4M12 -6l-5 4M7 -17h5" stroke="${D}" stroke-width="0.9"/><path d="M7 -11h-5M7 -4h-5" stroke="${D}" stroke-width="1"/><path d="M-16 4h32v3h-32z" fill="${W}" fill-opacity="0.22" stroke="${W}" stroke-width="1.2"/><path d="M-6 7v4h12v-4" fill="none" stroke="${D}" stroke-width="1"/><path d="M-12 4v-8M-15 -4h6" stroke="${D}" stroke-width="1"/>`,
  museum: `<path d="M-15 -6L0 -15L15 -6z" fill="${W}" fill-opacity="0.25" stroke="${W}" stroke-width="1.4" stroke-linejoin="round"/><path d="M-14 -5h28" stroke="${W}" stroke-width="1.3"/><path d="M-11 -4v11M-5.5 -4v11M0 -4v11M5.5 -4v11M11 -4v11" stroke="${W}" stroke-width="1.7"/><path d="M-15 8h30M-17 11h34" stroke="${W}" stroke-width="1.4" stroke-linecap="round"/><circle cx="0" cy="-9.5" r="1.6" fill="${W}"/>`,
  scope: `<path d="M-13 3a13 13 0 0 1 26 0z" fill="${W}" fill-opacity="0.2" stroke="${W}" stroke-width="1.4"/><path d="M-2 -10h4v13h-4z" fill="rgba(10,14,28,0.9)" stroke="${W}" stroke-width="1"/><path d="M-15 3h30v8h-30z" fill="${W}" fill-opacity="0.12" stroke="${W}" stroke-width="1.3"/><path d="M-9 3v8M-3 3v8M3 3v8M9 3v8" stroke="${D}" stroke-width="0.8"/><path d="M-17 11h34" stroke="${W}" stroke-width="1.5" stroke-linecap="round"/>`,
};

const MER = new Set(['spirit', 'opportunity']);
const PHOENIX_CLASS = new Set(['insight', 'phoenix']);
const LUNOKHOD = new Set(['luna17', 'luna21']);

/** Icon for a surface site. `category` is the site's language-neutral
 *  marker category (moon/mars categorisers); Earth sites are all pads. */
export function iconForSite(
  body: 'mars' | 'moon' | 'venus' | 'earth',
  id: string,
  category: string,
): TagIcon {
  if (body === 'earth') return 'pad';
  if (body === 'venus') return 'probe';
  if (MER.has(id)) return 'merRover';
  if (PHOENIX_CLASS.has(id)) return 'insight';
  if (id.startsWith('viking')) return 'viking';
  if (LUNOKHOD.has(id)) return 'lunokhod';
  if (category === 'soviet-petal') return 'petal';
  if (category === 'crewed') return 'lm';
  if (category === 'rover') return 'rover';
  return 'lander';
}

/** The nation colours are flag tones, too dark on the tag's navy glass:
 *  keep the hue, raise saturation and lightness to read as an accent. */
export function tagAccent(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  const l0 = (max + min) / 2;
  const s0 = d === 0 ? 0 : d / (1 - Math.abs(2 * l0 - 1));
  // Greys (no hue) stay grey; anything with colour gets a vivid accent.
  const s = s0 < 0.05 ? 0 : Math.max(s0, 0.85);
  const l = Math.max(l0, 0.68);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const mm = l - c / 2;
  const [r1, g1, b1] =
    h < 1
      ? [c, x, 0]
      : h < 2
        ? [x, c, 0]
        : h < 3
          ? [0, c, x]
          : h < 4
            ? [0, x, c]
            : h < 5
              ? [x, 0, c]
              : [c, 0, x];
  const to = (v: number) =>
    Math.round((v + mm) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r1)}${to(g1)}${to(b1)}`;
}

/** Status chip colour: green running, yellow planned, red lost, grey history. */
export function statusChipColor(status: string | undefined): string {
  if (status === 'ACTIVE') return '#5be38a';
  if (status === 'PLANNED') return '#ffd24a';
  if (status === 'CRASHED' || status === 'LOST') return '#ff6b5a';
  return '#8b93a7';
}

/** Which tags get a card, and on which side: walk by priority (then key,
 *  for stable order) and keep a card only where it stays inside `view`,
 *  covers no card already kept, no `blocked` area (HUD panels over the
 *  canvas) and no other frame of equal or higher priority. Returns key → index into `cards`. */
export function thinCards(
  items: CardCandidate[],
  view?: Rect,
  blocked: Rect[] = [],
): Map<string, number> {
  const order = [...items].sort((a, b) => b.priority - a.priority || (a.key < b.key ? -1 : 1));
  const kept: Rect[] = [];
  const out = new Map<string, number>();
  const fits = (c: CardCandidate, r: Rect, strict: boolean) =>
    !(view && (r.x0 < view.x0 || r.y0 < view.y0 || r.x1 > view.x1 || r.y1 > view.y1)) &&
    !kept.some((k) => overlaps(k, r)) &&
    !blocked.some((b) => overlaps(b, r)) &&
    !items.some((o) => o !== c && (strict || o.priority >= c.priority) && overlaps(o.frame, r));
  for (const c of order) {
    // A side that covers no frame at all first; else one that covers only
    // lower-priority frames (the card draws over them).
    let pick = c.cards.findIndex((r) => fits(c, r, true));
    if (pick < 0) pick = c.cards.findIndex((r) => fits(c, r, false));
    if (pick < 0) continue;
    kept.push(c.cards[pick]);
    out.set(c.key, pick);
  }
  return out;
}

export interface TagCluster {
  lead: string;
  keys: string[];
  x: number;
  y: number;
}

/** Group anchors closer than `size` px on both axes (their frames would
 *  overlap). Greedy by priority: each anchor joins the first group whose
 *  centre is within reach, else starts one; groups that end up touching
 *  merge, until none do. The lead is the highest-priority member. */
export function clusterFrames(
  items: Array<{ key: string; x: number; y: number; priority: number }>,
  size: number,
): TagCluster[] {
  const order = [...items].sort((a, b) => b.priority - a.priority || (a.key < b.key ? -1 : 1));
  type G = { lead: string; keys: string[]; sx: number; sy: number; x: number; y: number };
  const near = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.abs(a.x - b.x) < size && Math.abs(a.y - b.y) < size;
  let groups: G[] = [];
  for (const it of order) {
    const g = groups.find((q) => near(q, it));
    if (g) {
      g.keys.push(it.key);
      g.sx += it.x;
      g.sy += it.y;
      g.x = g.sx / g.keys.length;
      g.y = g.sy / g.keys.length;
    } else groups.push({ lead: it.key, keys: [it.key], sx: it.x, sy: it.y, x: it.x, y: it.y });
  }
  for (let merged = true; merged;) {
    merged = false;
    outer: for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        if (!near(groups[i], groups[j])) continue;
        const a = groups[i];
        const b = groups[j];
        a.keys.push(...b.keys);
        a.sx += b.sx;
        a.sy += b.sy;
        a.x = a.sx / a.keys.length;
        a.y = a.sy / a.keys.length;
        groups = groups.filter((_, k) => k !== j);
        merged = true;
        break outer;
      }
    }
  }
  return groups.map(({ lead, keys, x, y }) => ({ lead, keys, x, y }));
}

/** How much of the view the planet fills: its on-screen radius over half
 *  the canvas's shorter side (1 = it just touches the edges). */
export function planetFill(
  camDistance: number,
  planetRadius: number,
  fovDeg: number,
  canvasW: number,
  canvasH: number,
): number {
  const ang = Math.asin(Math.min(1, planetRadius / camDistance));
  const pxR = (canvasH / 2) * (Math.tan(ang) / Math.tan((fovDeg * Math.PI) / 360));
  return pxR / (Math.min(canvasW, canvasH) / 2);
}

/** The point under the mean direction of `points` (degrees). */
export function centroidLatLon(points: Array<{ lat: number; lon: number }>): {
  lat: number;
  lon: number;
} {
  const rad = Math.PI / 180;
  let x = 0;
  let y = 0;
  let z = 0;
  for (const p of points) {
    x += Math.cos(p.lat * rad) * Math.cos(p.lon * rad);
    y += Math.sin(p.lat * rad);
    z += Math.cos(p.lat * rad) * Math.sin(p.lon * rad);
  }
  return {
    lat: Math.atan2(y, Math.hypot(x, z)) / rad,
    lon: Math.atan2(z, x) / rad,
  };
}

/** Opacity of the tags outside an open fan. Below the hit-test floor, so they are not tappable. */
const FAN_DIM = 0.22;

export interface FanItem {
  key: string;
  /** Where the tag is drawn. */
  x: number;
  y: number;
  /** Card side: 0 right, 1 left. */
  side: 0 | 1;
  /** The member's true position; the leader line runs from here to (x, y). */
  from: { x: number; y: number };
}

/** Fan a group out ("spiderfy", on click): each member's tag goes into a
 *  column beside the group point, a leader line back to its true position.
 *  Two columns (left and right of the point, split by where the members
 *  really are) when both cards fit in `view`, else one column on the side
 *  with room. Rows are `max(frame, 40) + 6` px apart, so neither frames nor
 *  cards (which extend outward from their column) can touch. The whole fan
 *  is shifted to stay inside `view`. */
export function fanLayout(
  points: Array<{ key: string; x: number; y: number }>,
  o: {
    frame: number;
    cardW: number;
    /** Card's left edge from the tag centre (its leader reach). */
    cardDx: number;
    view: { w: number; h: number };
    pad?: number;
  },
): FanItem[] {
  const n = points.length;
  if (n === 0) return [];
  const pad = o.pad ?? 8;
  const pitch = Math.max(o.frame, 40) + 6;
  const colX = Math.max(o.frame, 44) * 1.4;
  const reach = o.cardDx + o.cardW;
  let cx = points.reduce((s, p) => s + p.x, 0) / n;
  let cy = points.reduce((s, p) => s + p.y, 0) / n;
  const byX = [...points].sort((a, b) => a.x - b.x || (a.key < b.key ? -1 : 1));
  const two = n > 1 && o.view.w >= 2 * (reach + colX) + 2 * pad;
  type Col = { dir: 0 | 1; members: typeof points };
  let cols: Col[];
  if (two) {
    const k = Math.ceil(n / 2);
    cols = [
      { dir: 1, members: byX.slice(0, k) },
      { dir: 0, members: byX.slice(k) },
    ];
  } else {
    // One column, on the side of the point with more room.
    cols = [{ dir: cx > o.view.w / 2 ? 1 : 0, members: byX }];
  }
  const out: FanItem[] = [];
  for (const col of cols) {
    const rows = [...col.members].sort((a, b) => a.y - b.y || (a.key < b.key ? -1 : 1));
    rows.forEach((p, i) => {
      out.push({
        key: p.key,
        x: (col.dir === 0 ? 1 : -1) * (two ? colX : colX * 0.5),
        y: (i - (rows.length - 1) / 2) * pitch,
        side: col.dir,
        from: { x: p.x, y: p.y },
      });
    });
  }
  // Shift so every frame and card is inside the view.
  const half = o.frame / 2;
  const left = Math.min(...out.map((i) => (i.side === 1 ? i.x - reach : i.x - half)));
  const right = Math.max(...out.map((i) => (i.side === 0 ? i.x + reach : i.x + half)));
  const top = Math.min(...out.map((i) => i.y)) - Math.max(half, 20);
  const bottom = Math.max(...out.map((i) => i.y)) + Math.max(half, 20);
  const shift = (lo: number, hi: number, min: number, max: number) =>
    hi - lo > max - min ? min - lo : Math.max(0, min - lo) - Math.max(0, hi - max);
  cx += shift(cx + left, cx + right, pad, o.view.w - pad);
  cy += shift(cy + top, cy + bottom, pad, o.view.h - pad);
  return out.map((i) => ({ ...i, x: cx + i.x, y: cy + i.y }));
}

export interface TagStage {
  /** Icon opacity multiplier. */
  icon: number;
  /** Frame size multiplier. */
  size: number;
  /** Card opacity; 0 = icons only. */
  card: number;
}

const ramp = (x: number, [a, b]: readonly [number, number]) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Zoom stages by how much the planet has grown since the first view (its
 *  fill over the fill at the route's default framing), so every route and
 *  screen opens on a bare globe: icons fade in, grow to full size, then the
 *  cards (#641). Desktop, default camR 150: icons 130 → 116, full size by 92,
 *  cards 85 → 65. `focus`: arc (degrees) from the point under the camera
 *  where tags start to fade and where they are gone — looking at North
 *  America shows its sites, not Europe's on the limb. */
export const TAG_STAGES = {
  iconIn: [1.18, 1.34],
  grow: [1.34, 1.78],
  cardIn: [1.85, 2.55],
  minSize: 0.55,
  focus: [38, 50],
} as const;

/** Opacity for a tag `arcDeg` from the point under the camera. */
export function focusFade(arcDeg: number): number {
  return 1 - ramp(arcDeg, TAG_STAGES.focus);
}

/** `zoom`: planet fill now over the fill at the default framing. */
export function tagStage(zoom: number): TagStage {
  return {
    icon: ramp(zoom, TAG_STAGES.iconIn),
    size: TAG_STAGES.minSize + (1 - TAG_STAGES.minSize) * ramp(zoom, TAG_STAGES.grow),
    card: ramp(zoom, TAG_STAGES.cardIn),
  };
}

export type TagBody = 'mars' | 'moon' | 'venus' | 'earth';

const ROVER_ICONS = new Set<TagIcon>(['rover', 'merRover', 'lunokhod']);

/** Tag content for a surface site or launch pad, in the page's locale. */
export function siteTagSpec(site: SurfaceSite, body: TagBody): TagSpec {
  const category =
    body === 'mars'
      ? categoriseMarsMarker(site.marker ?? site.mission_type, site.agency)
      : body === 'moon'
        ? categoriseMoonMarker(site.marker ?? site.mission_type)
        : '';
  const icon = iconForSite(body, site.id, category);
  // The Moon's translated mission type is richer ("CREWED LANDER"); its
  // first part only, the status has its own coloured word.
  const moonType = body === 'moon' ? site.mission_type?.split(' · ')[0]?.trim() : undefined;
  const type =
    body === 'earth'
      ? m.card_cat_launch_site()
      : moonType || (ROVER_ICONS.has(icon) ? m.card_cat_rover() : m.card_cat_lander());
  const year = body === 'earth' ? undefined : site.year;
  return {
    key: `site:${site.id}`,
    icon,
    color: tagAccent(colorFor(site)),
    name: site.name ?? site.id,
    type,
    facts: [site.agency, year].filter((v) => v != null).join(' · '),
    status: site.status,
    statusLabel: statusTone(site.status, site.kind, site.site_role).label,
    priority: site.status === 'ACTIVE' ? 3 : (site.hotspot_tier_max ?? 0) >= 1 ? 2 : 1,
  };
}

export function museumTagSpec(museum: Museum): TagSpec {
  return {
    key: `museum:${museum.id}`,
    icon: 'museum',
    color: MUSEUM_PIN_COLOR,
    name: museum.name,
    type: m.site_tag_museum(),
    facts: museum.city ?? '',
    priority: 0,
  };
}

export function observatoryTagSpec(o: Observatory): TagSpec {
  return {
    key: `scope:${o.id}`,
    icon: 'scope',
    color: OBSERVATORY_PIN_COLOR,
    name: o.name,
    type: m.card_cat_observatory(),
    facts: [o.place, o.since].filter(Boolean).join(' · '),
    status: o.status === 'active' ? 'ACTIVE' : o.status === 'building' ? 'PLANNED' : 'ENDED',
    priority: 0,
  };
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Markup for one tag, anchored at (0,0) of its element. `scale` sizes the
 *  whole tag (Earth draws smaller: dozens of pads and museums share a view). */
export function tagMarkup(spec: TagSpec, scale = 1, count = 1): { frame: string; card: string } {
  const S = Math.round(44 * scale);
  const h = S / 2;
  const arm = Math.round(9 * scale);
  const col = spec.color;
  const st = statusChipColor(spec.status);
  const gid = `tg-${spec.key.replace(/[^\w-]/g, '_')}`;
  const lx = h + 16 * scale;
  const ly = -h - 16 * scale;
  const ex = h + 30 * scale;
  const frame =
    `<svg class="site-tag__svg" width="${S + 2 * ex}" height="${S + 2 * ex}" viewBox="${-h - ex} ${-h - ex} ${S + 2 * ex} ${S + 2 * ex}" style="left:${-h - ex}px;top:${-h - ex}px" aria-hidden="true">` +
    `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="rgba(30,38,62,0.82)"/><stop offset="1" stop-color="rgba(8,11,22,0.9)"/></linearGradient></defs>` +
    (count > 1
      ? [2, 1]
          .map(
            (k) =>
              `<rect x="${-h + 4 * k * scale}" y="${-h - 4 * k * scale}" width="${S}" height="${S}" rx="3" fill="rgba(8,11,22,0.85)" stroke="${col}" stroke-opacity="${0.25 + 0.2 * (2 - k)}" stroke-width="1"/>`,
          )
          .join('')
      : '') +
    `<rect x="${-h}" y="${-h}" width="${S}" height="${S}" rx="3" fill="url(#${gid})" stroke="${col}" stroke-opacity="0.85" stroke-width="1.25"/>` +
    `<rect x="${-h + 3}" y="${-h + 3}" width="${S - 6}" height="${S - 6}" rx="1.5" fill="none" stroke="rgba(255,255,255,0.08)"/>` +
    `<path d="M${-h} ${-h + arm}V${-h}H${-h + arm}M${h - arm} ${-h}H${h}V${-h + arm}M${h} ${h - arm}V${h}H${h - arm}M${-h + arm} ${h}H${-h}V${h - arm}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linecap="square"/>` +
    `<g transform="translate(0,-1) scale(${(0.92 * scale).toFixed(3)})">${TAG_ICONS[spec.icon]}</g>` +
    `<rect x="${-h + 5}" y="${h - 5}" width="${Math.round(5 * scale) + 1}" height="2" fill="${st}"/>` +
    (count > 1
      ? `<g transform="translate(${-h},${-h})"><circle r="${8 * scale + 2}" fill="${col}"/><text text-anchor="middle" dy="0.35em" font-size="${(10 * scale + 1).toFixed(1)}" font-weight="700" fill="#0a0e1c" font-family="inherit">${count}</text></g>`
      : '') +
    [1, -1]
      .map(
        (d) =>
          `<g class="site-tag__lead site-tag__lead--${d > 0 ? 'r' : 'l'}"><path d="M${d * h} ${-h}L${d * lx} ${ly}H${d * ex}" fill="none" stroke="${col}" stroke-opacity="0.8" stroke-width="1.1"/><circle cx="${d * ex}" cy="${ly}" r="1.8" fill="${col}"/></g>`,
      )
      .join('') +
    `</svg>`;
  const facts = spec.facts ? ` · ${esc(spec.facts)}` : '';
  const status = spec.statusLabel
    ? ` · <span style="color:${st}">${esc(spec.statusLabel)}</span>`
    : '';
  const card =
    `<div class="site-tag__card" style="left:${ex + 4 * scale}px;top:${ly - 15 * scale}px;border-left-color:${col};font-size:${(11.5 * scale).toFixed(1)}px">` +
    `<div class="site-tag__name">${esc(spec.name)}${count > 1 ? ` <span style="color:${col}">+${count - 1}</span>` : ''}</div>` +
    `<div class="site-tag__facts"><span style="color:${col}">${esc(spec.type)}</span>${facts}${status}</div>` +
    `</div>`;
  return { frame, card };
}

const STYLE = `
.site-tags{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2;font-family:var(--font-mono,'Space Mono',monospace)}
.site-tag{position:absolute;left:0;top:0;will-change:transform,opacity;filter:drop-shadow(0 2px 6px rgba(0,0,0,.6))}
.site-tag__svg{position:absolute;overflow:visible;transform:scale(var(--tag-s,1));transform-origin:50% 50%}
.site-tag__card,.site-tag__lead{opacity:var(--tag-card,1)}
.site-tag__card{transform:translateY(calc((1 - var(--tag-card,1)) * 6px))}
.site-tag__card{position:absolute;white-space:nowrap;padding:.42em .85em .5em .78em;background:linear-gradient(180deg,rgba(28,35,58,.86),rgba(8,11,22,.9));border:1px solid rgba(255,255,255,.12);border-left:2px solid;border-radius:2px;box-shadow:0 4px 14px rgba(0,0,0,.45);backdrop-filter:blur(4px)}
.site-tag__name{letter-spacing:.08em;color:#f4f7fb;line-height:1.3;text-transform:uppercase}
.site-tag__facts{font-size:.78em;letter-spacing:.12em;color:#9aa6bf;line-height:1.45;margin-top:1px;text-transform:uppercase}
.site-tag__lead--l,.site-tag--left .site-tag__lead--r{display:none}
.site-tag--left .site-tag__lead--l{display:inline}
.site-tag--bare .site-tag__card,.site-tag--bare .site-tag__lead{display:none}
.site-tag--hover{--tag-card:1}
.site-tag-fan{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:5}
`;

/** The DOM layer. `host` must be positioned; tags are placed in its
 *  coordinates (canvas-relative, CSS px). */
export function createSiteTagLayer(host: HTMLElement, opts: { scale?: number } = {}) {
  const scale = opts.scale ?? 1;
  const full = Math.round(44 * scale) / 2;
  // Breathing room kept around each card when thinning.
  const pad = 4;
  const root = document.createElement('div');
  root.className = 'site-tags';
  root.dataset.testid = 'site-tags';
  // A visual copy of the 3D pins (pointer-events: none): keep the card text out of the a11y tree.
  root.setAttribute('aria-hidden', 'true');
  const style = document.createElement('style');
  style.textContent = STYLE;
  root.appendChild(style);
  host.appendChild(root);
  const specs = new Map<string, TagSpec>();
  const els = new Map<string, HTMLDivElement>();
  const state = new Map<
    string,
    {
      shown: boolean;
      hover?: boolean;
      bare: boolean;
      /** The card opacity written on the element ('' = inherits the layer's). */
      cardVar?: string;
      z: number;
      left?: boolean;
      card?: { dx: number; dy: number; w: number; h: number };
    }
  >();

  function setSpecs(list: TagSpec[]) {
    for (const el of els.values()) el.remove();
    els.clear();
    state.clear();
    specs.clear();
    for (const sp of list) specs.set(sp.key, sp);
  }

  function elFor(lead: string, count: number): { el: HTMLDivElement; id: string } | null {
    const id = count > 1 ? `${lead}#${count}` : lead;
    let el = els.get(id);
    if (el) return { el, id };
    const spec = specs.get(lead);
    if (!spec) return null;
    el = document.createElement('div');
    el.className = 'site-tag';
    el.dataset.tag = lead;
    if (count > 1) el.dataset.count = String(count);
    const { frame, card } = tagMarkup(spec, scale, count);
    el.innerHTML = frame + card;
    el.style.display = 'none';
    root.appendChild(el);
    els.set(id, el);
    return { el, id };
  }

  let hoverLead: string | null = null;
  let fan: Set<string> | null = null;
  // Leader lines of a fanned group, under the tags.
  const fanSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  fanSvg.setAttribute('class', 'site-tag-fan');
  fanSvg.setAttribute('aria-hidden', 'true');
  root.appendChild(fanSvg);
  let fanDrawn = false;
  let lastHalf = full;
  let lastShown: Array<{
    lead: string;
    keys: string[];
    x: number;
    y: number;
    opacity: number;
    z: number;
  }> = [];
  let lastSize = -1;
  let lastCard = -1;

  /** `blocked`: areas (layer px) cards keep clear of; a frame inside one hides.
   *  `stage`: the zoom stage (tagStage) — icon fade, frame size, card fade. */
  function sync(
    frames: TagFrame[],
    blocked: Rect[] = [],
    stage: TagStage = { icon: 1, size: 1, card: 1 },
  ) {
    if (Math.abs(stage.size - lastSize) > 0.002) {
      root.style.setProperty('--tag-s', stage.size.toFixed(3));
      lastSize = stage.size;
    }
    if (Math.abs(stage.card - lastCard) > 0.002) {
      root.style.setProperty('--tag-card', stage.card.toFixed(3));
      lastCard = stage.card;
    }
    const half = full * stage.size;
    // A tag whose spot lies under a HUD panel is hidden whole (frame and card). Only the spot
    // counts: a thin bar grazing the frame's edge (a landscape phone's bottom bar sits a few px
    // under the centred site) must not take the selected site's only tap target away.
    const live = frames.filter(
      (f) =>
        f.opacity * stage.icon > 0.01 &&
        specs.has(f.key) &&
        !blocked.some((b) => f.x >= b.x0 && f.x <= b.x1 && f.y >= b.y0 && f.y <= b.y1),
    );
    const prio = new Map(live.map((f) => [f.key, specs.get(f.key)!.priority + (f.boost ?? 0)]));
    const byKey = new Map(live.map((f) => [f.key, f]));
    // A fanned group's members leave the clustering; they are laid out below.
    if (fan && live.filter((f) => fan!.has(f.key)).length < 2) fan = null;
    const fanned = fan ? live.filter((f) => fan!.has(f.key)) : [];
    const free = fan ? live.filter((f) => !fan!.has(f.key)) : live;
    // Frames may not overlap; touching is fine (two pads 0.5 km apart only clear 27 px at the closest zoom).
    const groups = clusterFrames(
      free.map((f) => ({ key: f.key, x: f.x, y: f.y, priority: prio.get(f.key)! })),
      2 * half,
    );
    const shown: Array<{
      g: TagCluster;
      el: HTMLDivElement;
      id: string;
      opacity: number;
      fan?: FanItem;
    }> = [];
    const touch = (made: { el: HTMLDivElement; id: string }) => {
      const st = state.get(made.id) ?? { shown: false, bare: false, z: -1 };
      state.set(made.id, st);
      if (!st.shown) {
        made.el.style.display = '';
        st.shown = true;
      }
      if (!st.card) {
        // Measured once, while shown: the card's box relative to the anchor.
        const c = made.el.querySelector<HTMLElement>('.site-tag__card');
        // Measured while the host is hidden, the card is 0×0: measure again next frame.
        if (c && c.offsetWidth > 0)
          st.card = { dx: c.offsetLeft, dy: c.offsetTop, w: c.offsetWidth, h: c.offsetHeight };
      }
    };
    for (const g of groups) {
      const made = elFor(g.lead, g.keys.length);
      if (!made) continue;
      touch(made);
      // While a fan is open the other tags recede (no cards, faint), so the fan reads alone.
      const opacity =
        stage.icon * Math.max(...g.keys.map((k) => byKey.get(k)!.opacity)) * (fan ? FAN_DIM : 1);
      shown.push({ g, ...made, opacity });
    }
    let fanItems: FanItem[] = [];
    if (fanned.length) {
      const known = fanned.map((f) => state.get(f.key)?.card).filter((c) => !!c);
      fanItems = fanLayout(
        fanned.map((f) => ({ key: f.key, x: f.x, y: f.y })),
        {
          frame: 2 * half,
          cardW: Math.max(...known.map((c) => c!.w), 190 * scale),
          cardDx: known[0]?.dx ?? full + 34 * scale,
          view: { w: root.clientWidth, h: root.clientHeight },
          pad: 12,
        },
      );
      for (const it of fanItems) {
        const made = elFor(it.key, 1);
        if (!made) continue;
        touch(made);
        shown.push({
          g: { lead: it.key, keys: [it.key], x: it.x, y: it.y },
          ...made,
          opacity: stage.icon * byKey.get(it.key)!.opacity,
          fan: it,
        });
      }
    }
    const cardOf = (lead: string) => byKey.get(lead)?.card ?? 1;
    // Icons-only stage: no cards, no thinning.
    const cards =
      stage.card < 0.01 || fan
        ? new Map<string, number>()
        : thinCards(
            shown
              .filter((s) => !s.fan && cardOf(s.g.lead) > 0.01)
              .map(({ g, id }) => {
                const c = state.get(id)!.card ?? { dx: 0, dy: 0, w: 0, h: 0 };
                const box = (dx: number) => ({
                  x0: g.x + dx - pad,
                  y0: g.y + c.dy - pad,
                  x1: g.x + dx + c.w + pad,
                  y1: g.y + c.dy + c.h + pad,
                });
                return {
                  key: id,
                  priority: prio.get(g.lead)!,
                  frame: { x0: g.x - half, y0: g.y - half, x1: g.x + half, y1: g.y + half },
                  cards: [box(c.dx), box(-c.dx - c.w)],
                };
              }),
            { x0: 0, y0: 0, x1: root.clientWidth, y1: root.clientHeight },
            blocked,
          );
    const seen = new Set<string>();
    lastHalf = half;
    lastShown = [];
    for (const { g, el, id, opacity, fan: fanItem } of shown) {
      seen.add(id);
      const st = state.get(id)!;
      // The hovered tag always shows its card (on the right unless that leaves the view),
      // whatever the zoom stage or the thinning decided.
      const hovered = !!fanItem || (hoverLead != null && g.lead === hoverLead);
      if (hovered !== !!st.hover) {
        el.classList.toggle('site-tag--hover', hovered);
        st.hover = hovered;
      }
      const cardMul = fanItem ? 1 : cardOf(g.lead);
      let side = fanItem ? fanItem.side : cards.get(id);
      if (hovered && side == null && cardMul > 0.01)
        side = st.card && g.x + st.card.dx + st.card.w > root.clientWidth ? 1 : 0;
      const cardVar = cardMul >= 0.99 ? '' : (stage.card * cardMul).toFixed(3);
      if (cardVar !== (st.cardVar ?? '')) {
        el.style.setProperty('--tag-card', cardVar);
        st.cardVar = cardVar;
      }
      const bare = side == null;
      if (bare !== st.bare) {
        el.classList.toggle('site-tag--bare', bare);
        st.bare = bare;
      }
      const left = side === 1;
      if (left !== (st.left ?? false) && st.card) {
        el.classList.toggle('site-tag--left', left);
        const card = el.querySelector<HTMLElement>('.site-tag__card');
        if (card) card.style.left = `${left ? -st.card.dx - st.card.w : st.card.dx}px`;
        st.left = left;
      }
      // Higher priority draws on top.
      const z = fanItem ? (hoverLead === g.lead ? 1100 : 1050) : hovered ? 1000 : prio.get(g.lead)!;
      lastShown.push({ lead: g.lead, keys: g.keys, x: g.x, y: g.y, opacity, z });
      if (z !== st.z) {
        el.style.zIndex = String(10 + z);
        st.z = z;
      }
      el.style.transform = `translate3d(${g.x.toFixed(1)}px,${g.y.toFixed(1)}px,0)`;
      el.style.opacity = opacity >= 0.99 ? '' : opacity.toFixed(3);
    }
    for (const [id, el] of els) {
      const st = state.get(id);
      if (!seen.has(id) && st?.shown) {
        el.style.display = 'none';
        st.shown = false;
      }
    }
    if (fanItems.length) {
      fanSvg.innerHTML = fanItems
        .map((it) => {
          const c = specs.get(it.key)?.color ?? '#fff';
          return (
            `<line x1="${it.from.x.toFixed(1)}" y1="${it.from.y.toFixed(1)}" x2="${it.x.toFixed(1)}" y2="${it.y.toFixed(1)}" stroke="${c}" stroke-opacity="0.85" stroke-width="1.2"/>` +
            `<circle cx="${it.from.x.toFixed(1)}" cy="${it.from.y.toFixed(1)}" r="3" fill="${c}" stroke="#0a0e1c" stroke-width="1"/>`
          );
        })
        .join('');
      fanDrawn = true;
    } else if (fanDrawn) {
      fanSvg.innerHTML = '';
      fanDrawn = false;
    }
  }

  /** The tag under (x, y) in layer px: its drawn frame, grown to a `minHit` px square
   *  (a touch target) when smaller. Nearest anchor wins, then the higher draw order. */
  function hitTest(x: number, y: number, minHit = 44) {
    const reach = Math.max(lastHalf, minHit / 2);
    let best: (typeof lastShown)[number] | null = null;
    let bestD = Infinity;
    for (const s of lastShown) {
      if (s.opacity < 0.3) continue;
      const dx = Math.abs(x - s.x);
      const dy = Math.abs(y - s.y);
      if (dx > reach || dy > reach) continue;
      const d = Math.hypot(dx, dy);
      if (d < bestD - 0.5 || (Math.abs(d - bestD) <= 0.5 && best && s.z > best.z)) {
        best = s;
        bestD = d;
      }
    }
    return best ? { lead: best.lead, keys: best.keys, x: best.x, y: best.y } : null;
  }

  return {
    setSpecs,
    sync,
    hitTest,
    /** Fan these tags out around their group point (click on a group); null collapses. */
    setFan: (keys: string[] | null) => {
      fan = keys && keys.length > 1 ? new Set(keys) : null;
    },
    fanned: () => fan != null,
    setHover: (lead: string | null) => {
      hoverLead = lead;
    },
    /** Side of a frame at full size, px: what a group needs to split at the zoom it lands on. */
    frameSize: () => 2 * full,
    dispose: () => root.remove(),
  };
}
