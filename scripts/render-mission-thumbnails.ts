#!/usr/bin/env tsx
/**
 * Mission trajectory thumbnails: one 736 x 414 WebP per mission, drawn from the same code /fly flies.
 *
 *   npx tsx scripts/render-mission-thumbnails.ts                 # all missions
 *   npx tsx scripts/render-mission-thumbnails.ts --only=apollo11,voyager-2
 *   npx tsx scripts/render-mission-thumbnails.ts --out=/tmp/x --no-ladder   # preview, touches nothing in the repo
 *
 * Geometry is never re-derived here: `computeMissionApply` (heliocentric spline / Keplerian arc,
 * cislunar phases), `getEarthOrbitCoast` (Earth-orbit descriptors), `orbitPath` / `earthOrbitPath`
 * (rings) and `predictShipPosAtMet` (event positions). Which trajectory file /fly loads comes from
 * `flyTrajectoryPath` (src/lib/fly-trajectory-ids.ts). Missions with no orbit data (no `flight`
 * block and no Earth-orbit descriptor) get a placeholder in the same style that says so; no
 * trajectory is invented. Runbook: docs/guides/mission-thumbnail-runbook.md.
 *
 * Style (operator decision 2026-11-09): vector plot on flat navy, muted-blue paths (#889fe7),
 * amber/gold highlights, body discs, small mono labels, a caption line. No cyan or teal.
 * Output is deterministic: a re-run with unchanged inputs leaves no diff.
 */
import { createCanvas, registerFont, type CanvasRenderingContext2D } from 'canvas';
import sharp from 'sharp';
import {
  existsSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
} from 'node:fs';
import { join } from 'node:path';
import { computeMissionApply, labelToPlanetId } from '../src/lib/fly-mission-apply';
import { flyTrajectoryPath } from '../src/lib/fly-trajectory-ids';
import { orbitPath, earthOrbitPath } from '../src/lib/physics/transfer/mission-arc';
import { predictShipPosAtMet } from '../src/lib/physics/transfer/predict-ship-pos';
import { getEarthOrbitCoast } from '../src/lib/orbital/earth-orbit-registry';
import {
  A_MOON_KM,
  R_EARTH_KM,
  R_MOON_KM,
  moonEciPos,
} from '../src/lib/orbital/cislunar/cislunar-geometry';
import { LUNAR_LOCAL_PHASE_TYPES } from '../src/lib/three/fly-cislunar-overlays';

export const THUMB_W = 736;
export const THUMB_H = 414;
const WEBP_QUALITY = 82;
const REPO = process.cwd();
const DATA = join(REPO, 'static/data');
const THUMB_DIR = join(REPO, 'static/images/missions/thumbnails');
const LADDER = join(DATA, 'image-ladder.json');

// ---- palette (no cyan / teal) ----
const BG = '#04040c';
const BLUE = '#889fe7';
const BLUE_DIM = 'rgba(136,159,231,0.30)';
const AMBER = '#f5a524';
const GOLD = '#ffc850';
const PAPER = '#e9e2cf';
const BODY: Record<string, string> = {
  earth: '#6f8fe0',
  mars: '#d0623a',
  venus: '#e3c58c',
  mercury: '#a8a39a',
  jupiter: '#d8b48a',
  saturn: '#e0cf9f',
  uranus: '#9bb3d6',
  neptune: '#6f86c8',
  moon: '#cfcfcf',
  pluto: '#c9b8a4',
};

registerFont(join(REPO, 'scripts/assets/fonts/SpaceMono-Regular.ttf'), { family: 'Space Mono' });
const FONT = 'Space Mono';

const DEFAULTS = {
  depFallback: 0,
  dvFallback: 0,
  depLabelFallback: 'dep',
  arrLabelFallback: 'arr',
};

// ---------------------------------------------------------------- data
interface Pt {
  x: number;
  y: number;
}
interface MissionRec {
  id: string;
  dest: string;
  transit_days: number;
  departure_date?: string;
  flight?: { events?: { type?: string; met_days?: number | null; label?: string }[] };
  [k: string]: unknown;
}
interface Mark {
  p: Pt;
  label: string;
  kind: 'launch' | 'flyby' | 'arrival' | 'burn';
  body?: string;
}
interface Scene {
  kind: 'helio' | 'cislunar' | 'leo' | 'placeholder';
  paths: { pts: Pt[]; hot?: boolean; dashed?: boolean }[];
  rings: { pts: Pt[]; body?: string }[];
  discs: { p: Pt; r: number; color: string }[];
  marks: Mark[];
  fit: Pt[];
  caption: string;
  leo?: ReturnType<typeof getEarthOrbitCoast>;
  name?: string;
  typeLine?: string;
}

function loadMissions(): MissionRec[] {
  const out: MissionRec[] = [];
  const root = join(DATA, 'missions');
  for (const d of readdirSync(root, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    for (const f of readdirSync(join(root, d.name)).sort()) {
      if (!f.endsWith('.json') || f === 'index.json') continue;
      out.push(JSON.parse(readFileSync(join(root, d.name, f), 'utf8')) as MissionRec);
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

const overlay = JSON.parse(readFileSync(join(DATA, 'i18n/en-US.missions.json'), 'utf8')) as Record<
  string,
  { name?: string; type?: string }
>;
function overlayFor(m: MissionRec) {
  for (const [k, v] of Object.entries(overlay)) if (k.endsWith(`/${m.id}.json`)) return v;
  return {};
}

const upper = (s: string) => s.toUpperCase();

// Radial compression beyond 1.6 AU: outer-system tours would otherwise shrink Earth's orbit to a dot.
function compress(maxR: number) {
  const k = 1.6;
  if (maxR <= k * 1.6) return (p: { x: number; z: number }): Pt => ({ x: p.x, y: p.z });
  return (p: { x: number; z: number }): Pt => {
    const r = Math.hypot(p.x, p.z);
    if (r <= k) return { x: p.x, y: p.z };
    const f = (k * Math.sqrt(r / k)) / r;
    return { x: p.x * f, y: p.z * f };
  };
}

// ---------------------------------------------------------------- scenes
function helioScene(m: MissionRec): Scene {
  const tp = flyTrajectoryPath(m.id);
  let override: { waypoints: unknown[] } | undefined;
  if (tp) {
    const t = JSON.parse(readFileSync(join(DATA, tp), 'utf8')) as { waypoints?: unknown[] };
    if ((t.waypoints?.length ?? 0) >= 2) override = { waypoints: t.waypoints! };
  }
  const r = computeMissionApply(m as never, DEFAULTS, override as never);
  if (r.outPts.length < 2) throw new Error('no outbound path');
  const dep = r.timeline.dep_day;
  const outDays = r.timeline.arr_day - dep;
  let maxR = 1;
  for (const p of [...r.outPts, ...r.retPts]) maxR = Math.max(maxR, Math.hypot(p.x, p.z));
  const pr = compress(maxR);
  const out = r.outPts.map(pr);
  const ret = r.retPts.map(pr);
  const scene: Scene = {
    kind: 'helio',
    paths: [{ pts: out }],
    rings: [],
    discs: [],
    marks: [],
    fit: [...out, ...ret, { x: 0, y: 0 }],
    caption: '',
  };
  if (ret.length) scene.paths.push({ pts: ret, dashed: true });
  scene.rings.push({ pts: earthOrbitPath().map(pr), body: 'earth' });
  const dest = r.activeDestination as string;
  if (dest && dest !== 'earth') {
    try {
      scene.rings.push({ pts: orbitPath(dest as never).map(pr), body: dest });
    } catch {
      /* no orbit for this body */
    }
  }
  scene.marks.push({ p: out[0], label: 'LAUNCH', kind: 'launch' });
  const seen = new Set<string>();
  for (const e of m.flight?.events ?? []) {
    if (e.met_days == null) continue;
    const t = e.type ?? '';
    if (!['flyby', 'edl_or_oi', 'arrival'].includes(t)) continue;
    const planet = labelToPlanetId(e.label ?? '') as string | null;
    if (!planet || planet === 'earth' || seen.has(planet)) continue;
    seen.add(planet);
    const s = predictShipPosAtMet(r.outPts, e.met_days, outDays);
    if (!s) continue;
    scene.marks.push({
      p: pr({ x: s.x, z: s.z }),
      label: `${upper(planet)} ${t === 'flyby' ? 'FLYBY' : 'ARRIVAL'}`,
      kind: t === 'flyby' ? 'flyby' : 'arrival',
      body: planet,
    });
    if (!scene.rings.some((x) => x.body === planet)) {
      try {
        scene.rings.push({ pts: orbitPath(planet as never).map(pr), body: planet });
      } catch {
        /* no orbit for this body */
      }
    }
  }
  const last = out[out.length - 1];
  const near = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y) < 0.02 * Math.max(1, maxR * 0.5);
  if (!scene.marks.some((x) => x.kind !== 'launch' && near(x.p, last))) {
    scene.marks.push({ p: last, label: 'ARRIVAL', kind: 'arrival', body: dest });
  }
  const yrs = m.transit_days / 365.25;
  scene.caption = `${yrs >= 1 ? yrs.toFixed(1) + ' YR' : m.transit_days + ' D'} · ${
    maxR > 2.56 ? 'RADIAL SCALE COMPRESSED' : 'HELIOCENTRIC · TO SCALE'
  }`;
  return scene;
}

function cislunarScene(m: MissionRec): Scene {
  const r = computeMissionApply(m as never, DEFAULTS);
  const ct = r.cislunarTrajectory;
  if (!ct) throw new Error('no cislunar trajectory');
  const k = 1 / A_MOON_KM; // world unit = Moon distance
  const P = (p: { x: number; z: number }): Pt => ({ x: p.x * k, y: p.z * k });
  // /fly stores the lunar-local phases (orbit, flyby, descent, ascent) Moon-relative (points minus the
  // Moon's position at the flyby day) and rides them on the Moon, while the Earth-frame coasts keep the
  // Moon frozen at the encounter point. The still picture is the encounter: the lunar-local loop sits
  // on the point where the TLI coast ends and the TEI coast starts, with the Moon there.
  const moonRef = moonEciPos(r.timeline.flyby_day);
  const hot = new Set(['lunar_orbit', 'lunar_flyby', 'descent', 'ascent', 'spiral_lunar']);
  const scene: Scene = {
    kind: 'cislunar',
    paths: [],
    rings: [],
    discs: [],
    marks: [],
    fit: [],
    caption: `${m.transit_days} D · EARTH-CENTRED · ${r.isReturnTrip ? 'ROUND TRIP' : 'ONE WAY'}`,
  };
  let moonAt: Pt | null = null;
  let encounter: Pt | null = null;
  for (const ph of ct.phases) {
    const end = ph.points[ph.points.length - 1];
    if (
      !encounter &&
      end &&
      !LUNAR_LOCAL_PHASE_TYPES.has(ph.type) &&
      Math.abs(Math.hypot(end.x, end.z) / A_MOON_KM - 1) < 0.06
    ) {
      encounter = P(end);
    }
  }
  for (const ph of ct.phases) {
    if (ph.points.length < 2) continue;
    if (LUNAR_LOCAL_PHASE_TYPES.has(ph.type)) {
      const e = encounter ?? P(moonRef);
      const pts = ph.points.map((p) => {
        const q = P({ x: p.x - moonRef.x, z: p.z - moonRef.z });
        return { x: q.x + e.x, y: q.y + e.y };
      });
      scene.paths.push({ pts, hot: true });
      scene.fit.push(...pts);
      moonAt = moonAt ?? e;
    } else {
      const pts = ph.points.map(P);
      scene.paths.push({ pts, hot: hot.has(ph.type) });
      scene.fit.push(...pts);
    }
  }
  if (!moonAt && ct.moon_track.length)
    moonAt = P(ct.moon_track[Math.floor(ct.moon_track.length / 2)]);
  // The Moon's orbit is drawn only where the Moon is during the flight (its track plus a margin), so
  // the dashed arc ends inside the frame instead of being cut by its edge, and it is part of the fit.
  const moonAngles = ct.moon_track.map((q) => Math.atan2(q.z, q.x));
  const a0 = moonAngles[0] ?? 0;
  let lo = 0;
  let hi = 0;
  for (const a of moonAngles) {
    const d = Math.atan2(Math.sin(a - a0), Math.cos(a - a0));
    lo = Math.min(lo, d);
    hi = Math.max(hi, d);
  }
  const MARGIN = (24 * Math.PI) / 180;
  const ring: Pt[] = [];
  const n = 90;
  for (let i = 0; i <= n; i++) {
    const a = a0 + lo - MARGIN + ((hi - lo + 2 * MARGIN) * i) / n;
    ring.push({ x: Math.cos(a), y: Math.sin(a) });
  }
  scene.rings.push({ pts: ring, body: 'moon' });
  scene.fit.push(...ring);
  scene.discs.push({ p: { x: 0, y: 0 }, r: R_EARTH_KM * k * 3.5, color: BODY.earth });
  scene.fit.push({ x: 0, y: 0 });
  if (moonAt) {
    scene.discs.push({ p: moonAt, r: R_MOON_KM * k * 7, color: BODY.moon });
    scene.fit.push(moonAt);
  }
  const first = scene.paths[0]?.pts[0];
  const lastP = scene.paths[scene.paths.length - 1]?.pts.slice(-1)[0];
  if (first)
    scene.marks.push({
      p: first,
      label: r.isReturnTrip ? 'LAUNCH · SPLASHDOWN' : 'LAUNCH',
      kind: 'launch',
    });
  if (moonAt) scene.marks.push({ p: moonAt, label: 'LUNAR ARRIVAL', kind: 'burn', body: 'moon' });
  if (
    lastP &&
    !r.isReturnTrip &&
    !(moonAt && Math.hypot(lastP.x - moonAt.x, lastP.y - moonAt.y) < 0.06)
  )
    scene.marks.push({ p: lastP, label: 'ARRIVAL', kind: 'arrival' });
  return scene;
}

function leoScene(m: MissionRec): Scene {
  const c = getEarthOrbitCoast(m.id);
  if (!c) throw new Error('no earth-orbit descriptor');
  const caption = c.suborbital
    ? `SUBORBITAL · ${c.apogeeKm} KM APOGEE · NOT TO SCALE`
    : `${c.apogeeKm}×${c.perigeeKm} KM · ${c.inclinationDeg}° · NOT TO SCALE`;
  return { kind: 'leo', paths: [], rings: [], discs: [], marks: [], fit: [], caption, leo: c };
}

function placeholderScene(m: MissionRec): Scene {
  const o = overlayFor(m);
  return {
    kind: 'placeholder',
    paths: [],
    rings: [],
    discs: [],
    marks: [],
    fit: [],
    caption: 'NO TRAJECTORY DATA',
    name: o.name ?? m.id,
    typeLine: o.type ?? '',
  };
}

export function sceneFor(m: MissionRec): Scene {
  if (m.dest === 'MOON' && m.flight) return cislunarScene(m);
  if (m.dest === 'EARTH') return getEarthOrbitCoast(m.id) ? leoScene(m) : placeholderScene(m);
  if (m.flight) return helioScene(m);
  return placeholderScene(m);
}

// ---------------------------------------------------------------- painting
const SW = THUMB_W / 368; // style was designed at the panel's 368 px

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function paint(m: MissionRec, scene: Scene) {
  const W = THUMB_W;
  const H = THUMB_H;
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  if (scene.kind === 'placeholder') paintPlaceholder(ctx, scene);
  else if (scene.kind === 'leo') paintLeo(ctx, scene);
  else paintPlot(ctx, scene);

  ctx.font = `${6.6 * SW}px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(233,226,207,0.62)';
  ctx.fillText(scene.caption, 10 * SW, H - 8 * SW);
  void m;
  return cv;
}

function paintPlot(ctx: CanvasRenderingContext2D, scene: Scene) {
  const W = THUMB_W;
  const H = THUMB_H;
  const pad = 26 * SW;
  const padTop = 24 * SW;
  let minX = 1e9;
  let maxX = -1e9;
  let minY = 1e9;
  let maxY = -1e9;
  for (const p of scene.fit) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const bw = Math.max(maxX - minX, 1e-6);
  const bh = Math.max(maxY - minY, 1e-6);
  const s = Math.min((W - 2 * pad) / bw, (H - padTop - pad) / bh);
  const ox = W / 2 - ((minX + maxX) / 2) * s;
  const oy = (H + padTop - pad) / 2 - ((minY + maxY) / 2) * s;
  const T = (p: Pt): Pt => ({ x: ox + p.x * s, y: oy + p.y * s });

  ctx.lineWidth = 0.9 * SW;
  for (const ring of scene.rings) {
    ctx.beginPath();
    ring.pts.forEach((p, i) => {
      const q = T(p);
      if (i) ctx.lineTo(q.x, q.y);
      else ctx.moveTo(q.x, q.y);
    });
    ctx.strokeStyle =
      ring.body === 'earth' || ring.body === 'moon' ? 'rgba(136,159,231,0.38)' : BLUE_DIM;
    ctx.setLineDash([3 * SW, 3 * SW]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (scene.kind === 'helio') {
    const q = T({ x: 0, y: 0 });
    const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 14 * SW);
    g.addColorStop(0, 'rgba(255,214,120,0.9)');
    g.addColorStop(0.25, 'rgba(245,165,36,0.35)');
    g.addColorStop(1, 'rgba(245,165,36,0)');
    ctx.fillStyle = g;
    circle(ctx, q.x, q.y, 14 * SW);
    ctx.fill();
    ctx.fillStyle = '#ffe3a0';
    circle(ctx, q.x, q.y, 2.6 * SW);
    ctx.fill();
  }

  for (const d of scene.discs) {
    const q = T(d.p);
    const rr = Math.max(3.2 * SW, d.r * s);
    const g = ctx.createRadialGradient(q.x, q.y, rr * 0.8, q.x, q.y, rr * 2.2);
    g.addColorStop(0, d.color + '55');
    g.addColorStop(1, d.color + '00');
    ctx.fillStyle = g;
    circle(ctx, q.x, q.y, rr * 2.2);
    ctx.fill();
    ctx.fillStyle = d.color;
    circle(ctx, q.x, q.y, rr);
    ctx.fill();
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const path of scene.paths) {
    const n = path.pts.length;
    ctx.beginPath();
    path.pts.forEach((p, i) => {
      const q = T(p);
      if (i) ctx.lineTo(q.x, q.y);
      else ctx.moveTo(q.x, q.y);
    });
    ctx.strokeStyle = path.hot ? 'rgba(245,165,36,0.18)' : 'rgba(136,159,231,0.18)';
    ctx.lineWidth = 5 * SW;
    ctx.stroke();
    // dim at departure, bright at arrival
    const seg = Math.max(1, Math.floor(n / 120));
    for (let i = 0; i < n - 1; i += seg) {
      const a = path.pts.slice(i, Math.min(n, i + seg + 1));
      if (a.length < 2) continue;
      ctx.beginPath();
      a.forEach((p, j) => {
        const q = T(p);
        if (j) ctx.lineTo(q.x, q.y);
        else ctx.moveTo(q.x, q.y);
      });
      const al = 0.45 + 0.55 * (i / n);
      ctx.strokeStyle = path.hot ? `rgba(245,165,36,${al})` : `rgba(136,159,231,${al})`;
      ctx.lineWidth = 1.7 * SW;
      if (path.dashed) ctx.setLineDash([4 * SW, 3 * SW]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  if (scene.kind === 'helio') {
    for (const mk of scene.marks) {
      if (!mk.body || mk.kind === 'launch') continue;
      const q = T(mk.p);
      const rr = (mk.body === 'jupiter' || mk.body === 'saturn' ? 4.6 : 3.6) * SW;
      ctx.fillStyle = BODY[mk.body] ?? PAPER;
      circle(ctx, q.x, q.y, rr);
      ctx.fill();
      ctx.strokeStyle = 'rgba(4,4,12,0.6)';
      ctx.lineWidth = 0.8 * SW;
      ctx.stroke();
    }
  }

  const placed: { x: number; y: number; w: number }[] = [];
  const keep: Mark[] = [];
  for (const mk of scene.marks) {
    const q = T(mk.p);
    const dup =
      mk.kind !== 'launch' &&
      keep.some((k) => k.kind !== 'launch' && Math.hypot(T(k.p).x - q.x, T(k.p).y - q.y) < 9 * SW);
    if (!dup) keep.push(mk);
  }
  scene.marks = keep;
  const pts: Pt[] = scene.marks.map((mk) => T(mk.p));
  for (let i = 0; i < scene.marks.length; i++) {
    const mk = scene.marks[i];
    const q = pts[i];
    if (mk.kind === 'launch') {
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.4 * SW;
      ctx.fillStyle = BG;
      circle(ctx, q.x, q.y, 3.4 * SW);
      ctx.fill();
      ctx.stroke();
    } else if (mk.kind === 'arrival') {
      ctx.fillStyle = GOLD;
      circle(ctx, q.x, q.y, 3.2 * SW);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,80,0.45)';
      ctx.lineWidth = SW;
      circle(ctx, q.x, q.y, 6.5 * SW);
      ctx.stroke();
    } else if (mk.kind === 'burn') {
      ctx.fillStyle = AMBER;
      ctx.beginPath();
      ctx.moveTo(q.x, q.y - 4 * SW);
      ctx.lineTo(q.x + 3.5 * SW, q.y + 3 * SW);
      ctx.lineTo(q.x - 3.5 * SW, q.y + 3 * SW);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.font = `${7.5 * SW}px ${FONT}`;
  ctx.textBaseline = 'middle';
  for (let i = 0; i < scene.marks.length; i++) {
    const q = pts[i];
    const text = scene.marks[i].label;
    const w = ctx.measureText(text).width;
    const h = 9 * SW;
    // labels start outside a body disc drawn at the marker
    const disc = scene.discs.find((d) => {
      const dq = T(d.p);
      return Math.hypot(dq.x - q.x, dq.y - q.y) < 8 * SW;
    });
    const clear = disc ? Math.max(3.2 * SW, disc.r * s) : 0;
    // candidate offsets, nearest first; the first that stays inside the frame and misses every
    // placed label and every marker wins
    const cands: Pt[] = [];
    for (const r of [8, 15, 22, 29]) {
      for (const side of [1, -1]) {
        for (const up of [-1, 1])
          cands.push({
            x: side > 0 ? r * SW + clear : -r * SW - w - clear,
            y: up * (r * 0.8 * SW + clear * 0.5),
          });
      }
    }
    let best = cands[0];
    for (const c of cands) {
      const x = q.x + c.x;
      const y = q.y + c.y;
      const inside = x >= 6 && x + w <= W - 6 && y - h / 2 >= 6 && y + h / 2 <= H - 18 * SW;
      const clash =
        placed.some((p) => x < p.x + p.w + 4 && x + w + 4 > p.x && Math.abs(y - p.y) < h) ||
        pts.some(
          (o, j) => j !== i && o.x > x - 4 && o.x < x + w + 4 && Math.abs(o.y - y) < h / 2 + 3,
        );
      if (inside && !clash) {
        best = c;
        break;
      }
    }
    const x = q.x + best.x;
    const y = q.y + best.y;
    placed.push({ x, y, w });
    ctx.strokeStyle = 'rgba(233,226,207,0.35)';
    ctx.lineWidth = 0.7 * SW;
    ctx.beginPath();
    ctx.moveTo(q.x, q.y);
    ctx.lineTo(best.x < 0 ? x + w : x - 1, y);
    ctx.stroke();
    ctx.fillStyle = PAPER;
    ctx.fillText(text, x, y);
  }
}

function paintLeo(ctx: CanvasRenderingContext2D, scene: Scene) {
  const W = THUMB_W;
  const H = THUMB_H;
  const c = scene.leo!;
  const cx = W / 2;
  const cy = H / 2 - 4 * SW;
  const R = Math.min(W, H) * 0.22;
  // Orbit radius is exaggerated (real LEO is about 1.06 Earth radii) so the ring reads; the caption
  // says not to scale. Inclination only tilts the ring on screen (steeper orbit, steeper ring).
  const orbR = R * 1.7;
  const flat = 0.36;
  const tilt = -(c.inclinationDeg / 90) * 0.5;
  const loops = c.suborbital ? 1 : Math.min(3, Math.max(1, c.revolutions));
  const ring = (th: number, rr: number, k: number) => {
    const x = Math.cos(th) * rr * (1 + 0.035 * k);
    const y = Math.sin(th) * rr * (1 + 0.035 * k) * flat;
    const rot = tilt + k * 0.05;
    return {
      X: cx + x * Math.cos(rot) - y * Math.sin(rot),
      Y: cy + x * Math.sin(rot) + y * Math.cos(rot),
      D: Math.sin(th),
    };
  };
  // suborbital hop: a ballistic arch over the limb, surface -> apogee -> surface (upright, not tilted)
  const s0 = 0.24 * Math.PI;
  const s1 = 0.76 * Math.PI;
  const arch = (t: number) => {
    const th = s1 + t * (s0 - s1);
    const rr = R * (1.012 + 0.55 * Math.sin(Math.PI * t));
    return { X: cx + Math.cos(th) * rr, Y: cy - Math.sin(th) * rr, D: 1 };
  };

  const drawOrbit = (front: boolean) => {
    for (let k = 0; k < loops; k++) {
      let pen = false;
      ctx.beginPath();
      for (let i = 0; i <= 240; i++) {
        const p = ring((i / 240) * Math.PI * 2, orbR, k);
        if (p.D >= 0 !== front) {
          pen = false;
          continue;
        }
        if (pen) ctx.lineTo(p.X, p.Y);
        else ctx.moveTo(p.X, p.Y);
        pen = true;
      }
      const al = (0.45 + 0.55 * ((k + 1) / loops)) * (front ? 1 : 0.35);
      ctx.strokeStyle = `rgba(136,159,231,${al})`;
      ctx.lineWidth = 1.5 * SW;
      ctx.stroke();
    }
  };
  if (!c.suborbital) drawOrbit(false);
  const h = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.5);
  h.addColorStop(0, 'rgba(136,159,231,0.35)');
  h.addColorStop(1, 'rgba(136,159,231,0)');
  ctx.fillStyle = h;
  circle(ctx, cx, cy, R * 1.5);
  ctx.fill();
  const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
  g.addColorStop(0, '#6f8fe0');
  g.addColorStop(1, '#1d2c5e');
  ctx.fillStyle = g;
  circle(ctx, cx, cy, R);
  ctx.fill();
  if (c.suborbital) {
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const p = arch(i / 120);
      if (i) ctx.lineTo(p.X, p.Y);
      else ctx.moveTo(p.X, p.Y);
    }
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 1.7 * SW;
    ctx.stroke();
  } else drawOrbit(true);

  const a0 = c.suborbital ? arch(0) : ring(0.14 * Math.PI, orbR, 0);
  const a1 = c.suborbital ? arch(1) : ring(0.86 * Math.PI, orbR, loops - 1);
  ctx.fillStyle = BG;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.4 * SW;
  circle(ctx, a0.X, a0.Y, 3.4 * SW);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = GOLD;
  circle(ctx, a1.X, a1.Y, 3.2 * SW);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,200,80,0.45)';
  ctx.lineWidth = SW;
  circle(ctx, a1.X, a1.Y, 6.5 * SW);
  ctx.stroke();

  ctx.font = `${7.5 * SW}px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PAPER;
  if (c.suborbital) {
    ctx.textAlign = 'right';
    ctx.fillText('LAUNCH', a0.X - 10 * SW, a0.Y);
    ctx.textAlign = 'left';
    ctx.fillText('SPLASHDOWN', a1.X + 10 * SW, a1.Y);
  } else {
    ctx.textAlign = 'left';
    ctx.fillText('LAUNCH', a0.X + 10 * SW, a0.Y + 2 * SW);
    ctx.textAlign = 'right';
    ctx.fillText('DEORBIT BURN', a1.X - 10 * SW, a1.Y + 2 * SW);
  }
  ctx.fillStyle = AMBER;
  ctx.textAlign = 'center';
  ctx.fillText(c.suborbital ? 'SUBORBITAL' : `${c.revolutions} REV`, cx, cy + R * 1.95);
  ctx.textAlign = 'left';
}

function paintPlaceholder(ctx: CanvasRenderingContext2D, scene: Scene) {
  const W = THUMB_W;
  const H = THUMB_H;
  const cx = W / 2;
  const cy = H / 2 - 22 * SW;
  const R = 34 * SW;
  const h = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, R * 1.9);
  h.addColorStop(0, 'rgba(136,159,231,0.30)');
  h.addColorStop(1, 'rgba(136,159,231,0)');
  ctx.fillStyle = h;
  circle(ctx, cx, cy, R * 1.9);
  ctx.fill();
  const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
  g.addColorStop(0, '#6f8fe0');
  g.addColorStop(1, '#1d2c5e');
  ctx.fillStyle = g;
  circle(ctx, cx, cy, R);
  ctx.fill();
  ctx.strokeStyle = BLUE_DIM;
  ctx.lineWidth = 0.9 * SW;
  ctx.setLineDash([3 * SW, 3 * SW]);
  circle(ctx, cx, cy, R * 1.7);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const fit = (text: string, px: number, maxW: number) => {
    let size = px;
    ctx.font = `${size}px ${FONT}`;
    while (ctx.measureText(text).width > maxW && size > 8) {
      size -= 1;
      ctx.font = `${size}px ${FONT}`;
    }
    return text;
  };
  ctx.fillStyle = PAPER;
  fit(upper(scene.name ?? ''), 15 * SW, W - 40 * SW);
  ctx.fillText(upper(scene.name ?? ''), cx, cy + R * 1.7 + 30 * SW);
  if (scene.typeLine) {
    ctx.fillStyle = AMBER;
    fit(scene.typeLine, 7.5 * SW, W - 40 * SW);
    ctx.fillText(scene.typeLine, cx, cy + R * 1.7 + 48 * SW);
  }
  ctx.textAlign = 'left';
}

// ---------------------------------------------------------------- run
async function encode(m: MissionRec, scene: Scene): Promise<Buffer> {
  const png = paint(m, scene).toBuffer('image/png');
  return sharp(png).webp({ quality: WEBP_QUALITY }).toBuffer();
}

export async function renderAll(
  opts: { only?: string[]; outDir?: string; ladder?: boolean; pngs?: string } = {},
) {
  const outDir = opts.outDir ?? THUMB_DIR;
  mkdirSync(outDir, { recursive: true });
  const all = loadMissions();
  const todo = opts.only?.length ? all.filter((m) => opts.only!.includes(m.id)) : all;
  const stats = {
    written: 0,
    bytes: 0,
    placeholders: 0,
    failed: [] as string[],
    kinds: {} as Record<string, number>,
  };
  for (const m of todo) {
    let scene: Scene;
    try {
      scene = sceneFor(m);
    } catch (e) {
      stats.failed.push(`${m.id}: ${(e as Error).message}`);
      continue;
    }
    const buf = await encode(m, scene);
    writeFileSync(join(outDir, `${m.id}.webp`), buf);
    if (opts.pngs) {
      mkdirSync(opts.pngs, { recursive: true });
      writeFileSync(join(opts.pngs, `${m.id}.png`), paint(m, scene).toBuffer('image/png'));
    }
    stats.written++;
    stats.bytes += buf.length;
    stats.kinds[scene.kind] = (stats.kinds[scene.kind] ?? 0) + 1;
    if (scene.kind === 'placeholder') stats.placeholders++;
  }
  if (opts.ladder !== false && !opts.only?.length) {
    const ladder = JSON.parse(readFileSync(LADDER, 'utf8')) as Record<string, number[]>;
    for (const m of todo) {
      if (!stats.failed.some((f) => f.startsWith(`${m.id}:`)))
        ladder[`/images/missions/thumbnails/${m.id}`] = [THUMB_W];
    }
    writeFileSync(LADDER, JSON.stringify(ladder, null, 2) + '\n');
    // retire the old 240 px PNGs this generator replaces
    for (const m of todo) {
      const old = join(THUMB_DIR, `${m.id}.png`);
      if (existsSync(old)) unlinkSync(old);
    }
  }
  return stats;
}

if (process.argv[1]?.endsWith('render-mission-thumbnails.ts')) {
  const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
  const only = arg('only')?.split(',').filter(Boolean);
  const out = arg('out');
  renderAll({
    only,
    outDir: out,
    ladder: !process.argv.includes('--no-ladder') && !out,
    pngs: arg('png'),
  })
    .then((s) => {
      console.log(
        `thumbnails: ${s.written} written (${(s.bytes / 1024).toFixed(0)} KB), ${s.placeholders} placeholders, kinds ${JSON.stringify(s.kinds)}`,
      );
      if (s.failed.length) {
        console.error(`FAILED ${s.failed.length}:\n  ${s.failed.join('\n  ')}`);
        process.exit(1);
      }
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
