/**
 * Rover / EVA traverse rendering for SurfaceScene: the thick Line2 path,
 * start / end dots, caption sprites, curated stop pins, and the deferred
 * along-route HiRISE patch builders. `rebuildTraverses` tears down what
 * the previous build made and rebuilds from the loaded traverse data.
 *
 * Extracted from SurfaceScene's onMount closure. The shared arrays / maps
 * the animation loop and selection code also read are owned by the scene
 * and passed in by reference (they are mutated in place, never reassigned);
 * reactive component state is read through `get*` getters.
 */
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { formatNumber } from '$lib/format';
import { ladderRungUrl } from '$lib/image-srcset';
import type { LocaleCode } from '$lib/locale';
import { disposeObject3d } from '$lib/three/dispose-object3d';
import { createMarkerHalo } from '$lib/three/marker-halo';
import {
  placeOnSphereTangent,
  azimuthToAlignNorth,
  azimuthToAlignDir,
} from '$lib/three/place-on-sphere';
import { colorFor } from '$lib/surface-map/nation-palette';
import { liftForDark } from '$lib/three-label';
import { latLonToUnitSphere } from '$lib/moon-projection';
import {
  buildHotspotSurfacePatch,
  buildRegionalPatch,
  REGIONAL_PATCH_DIAMETER_WORLD_UNITS,
} from '$lib/hotspot-surface-patch';
import type { SurfaceSite, Traverse } from '$types/surface-site';

// ─── Traverse helpers (Mars today; Moon EVA/Lunokhod future) ──────
// Body-agnostic great-circle distance on a sphere of radius `radiusKm`.
// Used to surface "N km traversed" on the end-of-track caption + info card.
export function greatCircleKm(a: [number, number], b: [number, number], radiusKm: number): number {
  const R = radiusKm;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const dlat = lat2 - lat1;
  const dlon = ((b[1] - a[1]) * Math.PI) / 180;
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Sum of great-circle segments along a polyline. */
export function traversePathKm(points: Array<[number, number]>, radiusKm: number): number {
  let total = 0;
  for (let i = 1; i < points.length; i++)
    total += greatCircleKm(points[i - 1], points[i], radiusKm);
  return total;
}

/** Arc-length midpoint of a polyline (flat lat/lon metric, cos-lat on lon) —
 *  where fetch-mars-ctx centres a rover's regional CTX, so the 3D scene and
 *  the flat view place that image where it was cut. */
export function routeMidpoint(points: Array<[number, number]>): [number, number] {
  const seg = points
    .slice(1)
    .map((b, i) =>
      Math.hypot(
        b[0] - points[i][0],
        (b[1] - points[i][1]) * Math.cos((points[i][0] * Math.PI) / 180),
      ),
    );
  const half = seg.reduce((s, d) => s + d, 0) / 2;
  let acc = 0;
  for (let i = 0; i < seg.length; i++) {
    if (acc + seg[i] >= half) {
      const t = seg[i] ? (half - acc) / seg[i] : 0;
      return [
        points[i][0] + (points[i + 1][0] - points[i][0]) * t,
        points[i][1] + (points[i + 1][1] - points[i][1]) * t,
      ];
    }
    acc += seg[i];
  }
  return points[0];
}

/** Whole-day count between two ISO dates (or ISO + Date). */
export function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / (1000 * 60 * 60 * 24));
}

// ─── Sol colour ramp + sol ticks (#641) ─────────────────────────
// Whole-mission ramp, sol 1 → last sol: blue → white → amber (sRGB).
const SOL_RAMP: ReadonlyArray<readonly [number, number, number]> = [
  [136, 159, 231],
  [226, 240, 236],
  [251, 191, 36],
];

/** Ramp colour at t ∈ [0, 1] (clamped), as a linear THREE.Color. */
export function solRampColor(t: number, out = new THREE.Color()): THREE.Color {
  const u = Math.min(1, Math.max(0, t)) * (SOL_RAMP.length - 1);
  const i = Math.min(SOL_RAMP.length - 2, Math.floor(u));
  const f = u - i;
  const [a, b] = [SOL_RAMP[i], SOL_RAMP[i + 1]];
  return out.setRGB(
    (a[0] + (b[0] - a[0]) * f) / 255,
    (a[1] + (b[1] - a[1]) * f) / 255,
    (a[2] + (b[2] - a[2]) * f) / 255,
    THREE.SRGBColorSpace,
  );
}

/** Tick spacing by mission length: a handful of labelled majors per route. */
export function solTickSpacing(lastSol: number): { minor: number; major: number } {
  if (lastSol <= 400) return { minor: 25, major: 100 };
  if (lastSol <= 2500) return { minor: 100, major: 500 };
  return { minor: 250, major: 1000 };
}

/** For each multiple of `every` the rover passed, the first point reached on
 *  or after that sol (never point 0 — the landing has its own marker). */
export function solTickIndices(sols: number[], every: number): Array<{ sol: number; i: number }> {
  const out: Array<{ sol: number; i: number }> = [];
  if (sols.length < 2 || every <= 0) return out;
  let next = (Math.floor(sols[0] / every) + 1) * every;
  for (let i = 1; i < sols.length; i++) {
    if (sols[i] < next) continue;
    out.push({ sol: next, i });
    next = (Math.floor(sols[i] / every) + 1) * every;
  }
  return out;
}

/** Distance-milestone spacing for a route of `km`: a handful of labels. */
export function distanceMilestoneStepKm(km: number): number {
  if (km <= 3) return 0.5;
  if (km <= 15) return 1;
  if (km <= 60) return 5;
  return 10;
}

// Ground half-lengths of the sol ticks: read at crater scale, vanish at the
// whole-route view (where the colour ramp + major labels carry the time).
const TICK_HALF_M = { minor: 20, major: 35 };

// Mars solar day in seconds (sol → Earth date for the path hover card).
// Good to ±2 days: checked against 8 dated MER sols (Spirit 66 / 581 / 744 /
// 2210, Opportunity 2681 / 3968 / 4081 / 5111), 5 exact — JPL dates are
// Pacific time and no fixed offset fits all, so the card shows "≈".
const SOL_S = 88775.244;

/** UTC date (YYYY-MM-DD) of `sol` for a mission whose landing day is
 *  `landingSol` (MER 1, MSL / M2020 0). */
export function solToDate(landingIso: string, landingSol: number, sol: number): string {
  const t = Date.parse(landingIso) + (sol - landingSol) * SOL_S * 1000;
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : '';
}

function pathHover(
  verts: number[],
  sols: number[],
  tr: Traverse,
  landingIso: string | undefined,
  radiusKm: number,
): Pick<TraverseLine, 'pathWorld' | 'pointSols' | 'pointKm' | 'dateOfSol'> {
  const pathWorld: THREE.Vector3[] = [];
  for (let i = 0; i < verts.length; i += 3) {
    pathWorld.push(new THREE.Vector3(verts[i], verts[i + 1], verts[i + 2]));
  }
  const km = [0];
  for (let i = 1; i < tr.points.length; i++) {
    km.push(km[i - 1] + greatCircleKm(tr.points[i - 1], tr.points[i], radiusKm));
  }
  const total = km[km.length - 1];
  const scale = tr.length_km && total > 0 ? tr.length_km / total : 1;
  return {
    pathWorld,
    pointSols: sols,
    pointKm: km.map((k) => k * scale),
    dateOfSol: landingIso ? (s) => solToDate(landingIso, tr.landing_sol ?? 1, s) : undefined,
  };
}

// ─── Traverses (Mars rover paths today, Moon EVA paths future) ───
export type TraverseLine = {
  line: Line2;
  lineMaterial: LineMaterial;
  /** Dark casing under the line (#641). */
  casing?: Line2;
  casingMaterial?: LineMaterial;
  /** Minor + major sol ticks (#641). */
  ticks?: LineSegments2[];
  tickMaterials?: LineMaterial[];
  /** Per-point world positions, sols and km from landing — for the path
   *  hover card (#641). Present on sol-carrying paths only. */
  pathWorld?: THREE.Vector3[];
  pointSols?: number[];
  pointKm?: number[];
  /** Earth date of a sol on this rover (landing date + landing_sol). */
  dateOfSol?: (sol: number) => string;
  /** True lat/lon → where the (magnified) route draws it, as lat/lon — for
   *  flying the camera to a stop (#641). */
  toDrawn?: (lat: number, lon: number) => [number, number];
  /** "Replay the drive" (#641): the rover's place on the path, hidden until
   *  a replay runs; scaled per frame like the stop rings. */
  replayMarker?: THREE.Sprite;
  /** Pixel-stable labels at major ticks and next to stops (#641). */
  tickLabels?: THREE.Sprite[];
  stopLabels?: THREE.Sprite[];
  startDot: THREE.Mesh;
  endDot: THREE.Mesh;
  roverId: string;
  isActive: boolean;
  startLabel?: THREE.Group;
  endLabel?: THREE.Group;
  startLabelTexture?: THREE.Texture;
  endLabelTexture?: THREE.Texture;
  stopPins: THREE.Sprite[];
  stopPinTextures: THREE.Texture[];
  /** Anchor positions for screen-pixel-stable caption placement. */
  startAnchor: THREE.Vector3;
  endAnchor: THREE.Vector3;
  tangent: THREE.Vector3;
  /** Patch radius — used to renormalise caption positions to surface. */
  surfaceRadius: number;
};
function buildTraverseCaption(
  text: string,
  color: string,
  worldSize: number,
): { group: THREE.Group; texture: THREE.Texture } {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx2 = canvas.getContext('2d');
  if (ctx2) {
    ctx2.fillStyle = 'rgba(8, 10, 22, 0.72)';
    const radius = 12;
    const w = canvas.width;
    const h = canvas.height;
    const inset = 6;
    ctx2.beginPath();
    ctx2.moveTo(inset + radius, inset);
    ctx2.arcTo(w - inset, inset, w - inset, inset + radius, radius);
    ctx2.arcTo(w - inset, h - inset, w - inset - radius, h - inset, radius);
    ctx2.arcTo(inset, h - inset, inset, h - inset - radius, radius);
    ctx2.arcTo(inset, inset, inset + radius, inset, radius);
    ctx2.closePath();
    ctx2.fill();
    ctx2.font = "bold 38px 'Space Mono', monospace";
    ctx2.textAlign = 'center';
    ctx2.textBaseline = 'middle';
    ctx2.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx2.shadowBlur = 4;
    ctx2.fillStyle = color;
    ctx2.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2);
  }
  const texture = new THREE.Texture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  // depthTest:false + high renderOrder → captions always read ON TOP
  // of the route HiRISE patches + terrain, never occluded (#360 — "make
  // all labelling on top always").
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(worldSize, worldSize * (96 / 512), 1);
  sprite.renderOrder = 8;
  const group = new THREE.Group();
  group.add(sprite);
  return { group, texture };
}

// ── Traverse-stop ring marker (#641) ─────────────────────────────
// White ring with a kind-tinted core and a dark outline, centred on the
// path; the label pill beside it (buildTraverseText) carries name + sol.
// The canvas keeps the old 64×96 balloon footprint so the animate loop's
// per-frame (pinWorldW, pinWorldH) scaling and the picker are unchanged —
// the ring centre is 32 px from the bottom, hence center.y = 1/3.
function buildTraverseStopPin(hexColor: number): {
  sprite: THREE.Sprite;
  texture: THREE.Texture;
} {
  const hex = `#${hexColor.toString(16).padStart(6, '0')}`;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 96;
  const [cx, cy] = [32, 64];
  const ctx2 = canvas.getContext('2d');
  if (ctx2) {
    ctx2.lineWidth = 9;
    ctx2.strokeStyle = 'rgba(6, 8, 11, 0.8)';
    ctx2.beginPath();
    ctx2.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx2.stroke();
    ctx2.lineWidth = 5;
    ctx2.strokeStyle = '#ffffff';
    ctx2.stroke();
    ctx2.fillStyle = hex;
    ctx2.beginPath();
    ctx2.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx2.fill();
  }
  const texture = new THREE.Texture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    // Always on top of the route HiRISE patches (#360).
    depthTest: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.renderOrder = 8;
  sprite.scale.set(1, 1.5, 1);
  sprite.center.set(0.5, 1 / 3);
  return { sprite, texture };
}

/** Photo pin (#641): a small camera on a dark rounded square, same canvas
 *  footprint + anchor as the stop ring so the per-frame scaling applies. */
function buildTraversePhotoPin(): { sprite: THREE.Sprite; texture: THREE.Texture } {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 96;
  const ctx2 = canvas.getContext('2d');
  if (ctx2) {
    const [cx, cy] = [32, 64];
    ctx2.beginPath();
    ctx2.roundRect(cx - 22, cy - 18, 44, 36, 8);
    ctx2.fillStyle = 'rgba(11, 18, 32, 0.92)';
    ctx2.fill();
    ctx2.lineWidth = 3;
    ctx2.strokeStyle = '#ffffff';
    ctx2.stroke();
    // camera body + lens
    ctx2.fillStyle = '#ffffff';
    ctx2.beginPath();
    ctx2.roundRect(cx - 13, cy - 8, 26, 18, 3);
    ctx2.fill();
    ctx2.fillRect(cx - 5, cy - 12, 10, 5);
    ctx2.fillStyle = 'rgba(11, 18, 32, 0.92)';
    ctx2.beginPath();
    ctx2.arc(cx, cy + 1, 6, 0, Math.PI * 2);
    ctx2.fill();
  }
  const texture = new THREE.Texture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    }),
  );
  sprite.renderOrder = 9;
  sprite.scale.set(1, 1.5, 1);
  sprite.center.set(0.5, 1 / 3);
  return { sprite, texture };
}

/** Pixel-stable text sprite (#641): a sol number at a major tick, or a stop's
 *  "name · Sol N" pill. `userData.aspect` (width / height) lets the animate
 *  loop size it to a fixed on-screen height. `center` sets where the anchor
 *  sits on the sprite. */
function buildTraverseText(
  text: string,
  opts: { pill?: string; center: [number, number] },
): THREE.Sprite {
  const H = 64;
  const font = `600 ${opts.pill ? 32 : 30}px 'Space Mono', monospace`;
  const probe = document.createElement('canvas').getContext('2d');
  if (probe) probe.font = font;
  const textW = Math.ceil(probe?.measureText(text).width ?? text.length * 18);
  const padX = opts.pill ? 22 : 8;
  const canvas = document.createElement('canvas');
  canvas.width = textW + padX * 2;
  canvas.height = H;
  const ctx2 = canvas.getContext('2d');
  if (ctx2) {
    if (opts.pill) {
      const r = H / 2 - 4;
      ctx2.beginPath();
      ctx2.roundRect(2, 4, canvas.width - 4, H - 8, r);
      ctx2.fillStyle = 'rgba(11, 18, 32, 0.86)';
      ctx2.fill();
      ctx2.lineWidth = 3;
      ctx2.strokeStyle = opts.pill;
      ctx2.stroke();
    }
    ctx2.font = font;
    ctx2.textBaseline = 'middle';
    ctx2.textAlign = 'left';
    if (!opts.pill) {
      ctx2.lineWidth = 7;
      ctx2.strokeStyle = 'rgba(6, 8, 11, 0.9)';
      ctx2.strokeText(text, padX, H / 2 + 2);
    }
    ctx2.fillStyle = '#ffffff';
    ctx2.fillText(text, padX, H / 2 + 2);
  }
  const texture = new THREE.Texture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    }),
  );
  sprite.renderOrder = 9;
  sprite.center.set(opts.center[0], opts.center[1]);
  sprite.userData = { aspect: canvas.width / H };
  return sprite;
}

export interface SurfaceTraversesContext {
  planetMesh: THREE.Object3D;
  planetRadius: number;
  /** Body radius in km (great-circle path length + patch magnification). */
  radiusKm: number;
  getContainer: () => HTMLElement | undefined;
  /** True when the route supplied a traverse loader. */
  hasLoader: () => boolean;
  getTraverses: () => Record<string, Traverse>;
  getSites: () => SurfaceSite[];
  getSelected: () => SurfaceSite | null;
  traverseLines: TraverseLine[];
  tier2DelayedReveal: Array<THREE.Line | THREE.Mesh | THREE.Sprite | THREE.Group>;
  routePatchGroups: THREE.Object3D[];
  routeDetailGroups: THREE.Object3D[];
  routeRegionalGroups: THREE.Object3D[];
  routePatchMaterials: Array<THREE.Material & { opacity: number }>;
  routeRegionalMaterials: Array<THREE.Material & { opacity: number }>;
  routeSelectionHalos: Array<{ siteId: string; obj: THREE.Object3D }>;
  routeViewCenters: Map<string, { lat: number; lon: number }>;
  routeFrameCamR: Map<string, number>;
  routePatchBuilders: Map<string, () => void>;
  /** Largest route-tile ladder rung to load (quality tier routeTileMaxPx). */
  routeTileMaxPx?: number;
}

export function createSurfaceTraverses(ctx: SurfaceTraversesContext): {
  rebuildTraverses: () => void;
} {
  const {
    planetMesh,
    planetRadius,
    traverseLines,
    tier2DelayedReveal,
    routePatchGroups,
    routeDetailGroups,
    routeRegionalGroups,
    routePatchMaterials,
    routeRegionalMaterials,
    routeSelectionHalos,
    routeViewCenters,
    routeFrameCamR,
    routePatchBuilders,
  } = ctx;

  function rebuildTraverses() {
    if (!ctx.hasLoader()) return;
    for (const tl of traverseLines) {
      disposeObject3d(tl.line);
      planetMesh.remove(tl.line);
      disposeObject3d(tl.endDot);
      planetMesh.remove(tl.endDot);
      disposeObject3d(tl.startDot);
      planetMesh.remove(tl.startDot);
      if (tl.startLabel) {
        disposeObject3d(tl.startLabel);
        planetMesh.remove(tl.startLabel);
      }
      if (tl.endLabel) {
        disposeObject3d(tl.endLabel);
        planetMesh.remove(tl.endLabel);
      }
      for (const sp of tl.stopPins) {
        planetMesh.remove(sp);
        (sp.material as THREE.SpriteMaterial).dispose();
      }
      for (const t of tl.stopPinTextures) t.dispose();
      if (tl.replayMarker) {
        planetMesh.remove(tl.replayMarker);
        const mat = tl.replayMarker.material as THREE.SpriteMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
      for (const o of [tl.casing, ...(tl.ticks ?? [])]) {
        if (!o) continue;
        disposeObject3d(o);
        planetMesh.remove(o);
      }
      for (const sp of [...(tl.tickLabels ?? []), ...(tl.stopLabels ?? [])]) {
        planetMesh.remove(sp);
        const mat = sp.material as THREE.SpriteMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
      tl.startLabelTexture?.dispose();
      tl.endLabelTexture?.dispose();
    }
    traverseLines.length = 0;
    // Tear down along-route HiRISE patches from the previous build (#360).
    for (const g of routePatchGroups) {
      disposeObject3d(g);
      planetMesh.remove(g);
    }
    routePatchGroups.length = 0;
    routeDetailGroups.length = 0;
    routeRegionalGroups.length = 0;
    routePatchMaterials.length = 0;
    routeRegionalMaterials.length = 0;
    routeSelectionHalos.length = 0;
    routeViewCenters.clear();
    routeFrameCamR.clear();
    routePatchBuilders.clear();
    for (const tr of Object.values(ctx.getTraverses())) {
      if (!tr.points || tr.points.length < 2) continue;
      // Prepend the rover's published landing lat/lon when the first
      // waypoint isn't already there (~60 m threshold) — keeps the
      // green patch-centre pin lined up with the polyline start.
      const trSite = ctx.getSites().find((s) => s.id === tr.rover_id);
      const points = tr.points.slice();
      // Sol-carrying paths (#641) start at the lander as measured on HiRISE,
      // 0.2-0.45 km from the rounded site lat/lon — prepending that would draw
      // a leg the rover never drove (and break the one-sol-per-point match).
      const sols = tr.point_sols?.length === tr.points.length ? tr.point_sols : undefined;
      if (!sols && trSite?.lat != null && trSite?.lon != null) {
        const [firstLat, firstLon] = points[0];
        if (Math.abs(firstLat - trSite.lat) > 1e-3 || Math.abs(firstLon - trSite.lon) > 1e-3) {
          points.unshift([trSite.lat, trSite.lon]);
        }
      }
      const r = planetRadius + 0.05;
      // #309 — magnify the traverse around the landing site so it sits at
      // the SAME scale as the (magnified) Tier-2 patches instead of true
      // geographic scale (which renders ~22× too small to land on the
      // CTX/HiRISE imagery). M = patch magnification: world-units-per-metre
      // at the co-scale factor (REGIONAL_DIAMETER / regionalGroundMeters)
      // ÷ world-units-per-metre at true scale (planetRadius / bodyRadiusM).
      // Detail + regional share this factor (option A), so the path lines
      // up with both. Sites without a regional ground extent (Moon, legacy)
      // keep true scale (M = 1) — unchanged behaviour.
      const siteUnit =
        trSite?.lat != null && trSite?.lon != null
          ? latLonToUnitSphere(trSite.lat, trSite.lon)
          : null;
      const regionalGroundM = trSite?.hotspot_tier2_regional_ground_m;
      const traverseMag =
        siteUnit && regionalGroundM
          ? REGIONAL_PATCH_DIAMETER_WORLD_UNITS /
            regionalGroundM /
            (planetRadius / (ctx.radiusKm * 1000))
          : 1;
      // Map a (lat,lon) to its magnified world position on the surface.
      const tpos = (lat: number, lon: number, radius: number): THREE.Vector3 => {
        const p = latLonToUnitSphere(lat, lon);
        if (traverseMag === 1 || !siteUnit) {
          return new THREE.Vector3(p.x, p.y, p.z).multiplyScalar(radius);
        }
        // Scale the offset from the site centre, then re-project onto the
        // sphere so the magnified path stays on the surface.
        return new THREE.Vector3(
          siteUnit.x + (p.x - siteUnit.x) * traverseMag,
          siteUnit.y + (p.y - siteUnit.y) * traverseMag,
          siteUnit.z + (p.z - siteUnit.z) * traverseMag,
        )
          .normalize()
          .multiplyScalar(radius);
      };
      const verts: number[] = [];
      for (const [lat, lon] of points) {
        const wp = tpos(lat, lon, r);
        verts.push(wp.x, wp.y, wp.z);
      }
      const site = ctx.getSites().find((s) => s.id === tr.rover_id);
      const color = site ? colorFor(site) : '#ffffff';
      const isActive = tr.status === 'ACTIVE';
      // Thick rover path — THREE.Line is hard-capped at 1 px on most
      // WebGL platforms, so the traverse polyline disappeared next to
      // the kind-coloured stop dots (image 11, 2026-06-01). Line2 +
      // LineMaterial render a screen-pixel-sized extruded ribbon,
      // honouring `linewidth` reliably. Resolution is set here and
      // refreshed in the resize hook below.
      const lineGeo = new LineGeometry();
      lineGeo.setPositions(verts);
      // #641 — colour by sol over the whole mission when the path carries
      // sols; otherwise the site colour as before (Moon traverses).
      const lastSol = sols ? sols[sols.length - 1] : 0;
      if (sols) {
        const rgb: number[] = [];
        const c = new THREE.Color();
        for (const s of sols) {
          solRampColor(lastSol > 1 ? (s - 1) / (lastSol - 1) : 0, c);
          rgb.push(c.r, c.g, c.b);
        }
        lineGeo.setColors(rgb);
      }
      const resW = ctx.getContainer()?.clientWidth || window.innerWidth;
      const resH = ctx.getContainer()?.clientHeight || window.innerHeight;
      // Dark casing under the line so it reads on bright and dark terrain alike.
      let casing: Line2 | undefined;
      let casingMaterial: LineMaterial | undefined;
      {
        const casingGeo = new LineGeometry();
        casingGeo.setPositions(verts);
        casingMaterial = new LineMaterial({
          color: 0x06080b,
          linewidth: 8,
          transparent: true,
          opacity: 0.75,
          depthTest: false,
        });
        casingMaterial.resolution.set(resW, resH);
        casing = new Line2(casingGeo, casingMaterial);
        casing.renderOrder = 5;
        casing.userData = { roverId: tr.rover_id, kind: 'traverse-casing' };
        planetMesh.add(casing);
      }
      const lineMaterial = new LineMaterial({
        // Site colour lifted toward white without sols (Moon): Lunokhod's
        // Soviet red read as a dark thread on grey regolith (#641).
        color: sols ? 0xffffff : new THREE.Color(liftForDark(color)).getHex(),
        vertexColors: !!sols,
        // 3 → 4: with the smaller balloon pins + endDot the line
        // now reads as the primary trail with the markers
        // anchored along it, rather than the markers floating
        // above a hairline (image 19 proportion feedback).
        linewidth: 4,
        transparent: true,
        opacity: isActive ? 0.95 : 0.7,
        dashed: false,
        // Draw the trail ON TOP of the along-route HiRISE patches (#360)
        // — without this the 0.1u detail patches (rendered just above the
        // line) occlude the path as you zoom in, hiding the route.
        depthTest: false,
      });
      lineMaterial.resolution.set(
        ctx.getContainer()?.clientWidth || window.innerWidth,
        ctx.getContainer()?.clientHeight || window.innerHeight,
      );
      const line = new Line2(lineGeo, lineMaterial);
      line.computeLineDistances();
      line.renderOrder = 6;
      line.userData = { roverId: tr.rover_id, kind: 'traverse' };
      planetMesh.add(line);
      tier2DelayedReveal.push(line);

      // #641 — sol ticks across the path, minor + major (labelled), at the
      // first point reached on each tick's sol. Ground-sized (metres on the
      // magnified route) so they read at crater scale.
      const ticks: LineSegments2[] = [];
      const tickMaterials: LineMaterial[] = [];
      const tickLabels: THREE.Sprite[] = [];
      if (sols) {
        const worldPerM = (planetRadius / (ctx.radiusKm * 1000)) * traverseMag;
        const spacing = solTickSpacing(lastSol);
        const vert = (i: number) =>
          new THREE.Vector3(verts[i * 3], verts[i * 3 + 1], verts[i * 3 + 2]);
        const perpAt = (i: number): THREE.Vector3 => {
          const b = vert(i);
          for (let k = i - 1; k >= 0; k--) {
            const d = b.clone().sub(vert(k));
            if (d.lengthSq() > 1e-12) return d.cross(b.clone().normalize()).normalize();
          }
          return new THREE.Vector3();
        };
        const loc = getLocale() as LocaleCode;
        for (const kind of ['minor', 'major'] as const) {
          const every = spacing[kind];
          const half = TICK_HALF_M[kind] * worldPerM;
          const segs: number[] = [];
          for (const { sol, i } of solTickIndices(sols, every)) {
            if (kind === 'minor' && sol % spacing.major === 0) continue;
            const p = vert(i);
            const n = perpAt(i);
            segs.push(...p.clone().addScaledVector(n, -half).toArray());
            segs.push(...p.clone().addScaledVector(n, half).toArray());
            if (kind === 'major') {
              const label = buildTraverseText(formatNumber(sol, loc), { center: [0.5, 0.5] });
              label.position.copy(p.clone().addScaledVector(n, half * 2.2));
              label.userData = {
                ...label.userData,
                roverId: tr.rover_id,
                kind: 'traverse-tick-label',
                sol,
              };
              planetMesh.add(label);
              tickLabels.push(label);
            }
          }
          if (!segs.length) continue;
          const geo = new LineSegmentsGeometry();
          geo.setPositions(segs);
          const mat = new LineMaterial({
            color: 0xffffff,
            linewidth: kind === 'major' ? 2.5 : 1.5,
            transparent: true,
            depthTest: false,
          });
          mat.resolution.set(resW, resH);
          const seg = new LineSegments2(geo, mat);
          seg.renderOrder = 7;
          seg.userData = { roverId: tr.rover_id, kind: 'traverse-ticks' };
          planetMesh.add(seg);
          ticks.push(seg);
          tickMaterials.push(mat);
        }
        // Distance milestones ("10 km"), on the other side of the path from
        // the sol labels. Ground distance along the points, scaled so the end
        // reads the mission's distance driven (the polyline runs short).
        const cumM = [0];
        for (let i = 1; i < tr.points.length; i++) {
          cumM.push(
            cumM[i - 1] + greatCircleKm(tr.points[i - 1], tr.points[i], ctx.radiusKm) * 1000,
          );
        }
        const totalM = cumM[cumM.length - 1];
        const scale = tr.length_km && totalM > 0 ? (tr.length_km * 1000) / totalM : 1;
        const stepKm = distanceMilestoneStepKm((totalM * scale) / 1000);
        for (let km = stepKm, i = 1; km < (totalM * scale) / 1000 - stepKm * 0.25; km += stepKm) {
          const target = (km * 1000) / scale;
          while (i < cumM.length - 1 && cumM[i] < target) i++;
          const t = (target - cumM[i - 1]) / (cumM[i] - cumM[i - 1] || 1);
          const p = vert(i - 1).lerp(vert(i), t);
          const n = perpAt(i);
          const label = buildTraverseText(m.panel_rover_km({ value: formatNumber(km, loc) }), {
            pill: '#cbd5e1',
            center: [0.5, 0.5],
          });
          label.position.copy(p.clone().addScaledVector(n, -TICK_HALF_M.major * worldPerM * 2.6));
          label.userData = {
            ...label.userData,
            roverId: tr.rover_id,
            kind: 'traverse-km-label',
            sol: sols[i],
          };
          planetMesh.add(label);
          tickLabels.push(label);
        }
      }
      const TRAVERSE_END_ACTIVE_COLOR = 0xef4444;
      const TRAVERSE_END_FINISHED_COLOR = 0xf59e0b;
      const first = tr.points[0];
      const startWorld = tpos(first[0], first[1], r);
      const startDot = new THREE.Mesh(
        new THREE.BufferGeometry(),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      startDot.visible = false;
      startDot.position.copy(startWorld);
      planetMesh.add(startDot);
      tier2DelayedReveal.push(startDot);
      const last = tr.points[tr.points.length - 1];
      const endWorld = tpos(last[0], last[1], r);
      const endDot = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 12, 12),
        new THREE.MeshBasicMaterial({
          color: isActive ? TRAVERSE_END_ACTIVE_COLOR : TRAVERSE_END_FINISHED_COLOR,
          transparent: true,
          opacity: 0.95,
          depthWrite: false,
        }),
      );
      endDot.position.copy(endWorld);
      // Compute the sol number at the current rover position —
      // for active rovers, days alive since landing; for ended,
      // days between landing and snapshot.
      const endIsoForUserData = isActive ? new Date().toISOString() : tr.snapshot_date;
      // A sol, not a day count (#641): the recorded last sol when the data has
      // one, else days since landing (Moon traverses, which count days).
      const endSol =
        tr.last_sol ??
        (!isActive && site?.surface_duration_days != null
          ? Math.round(site.surface_duration_days)
          : site?.landing_date
            ? daysBetween(site.landing_date, endIsoForUserData)
            : 0);
      endDot.userData = {
        siteId: tr.rover_id,
        kind: 'traverse-end',
        stopLat: last[0],
        stopLon: last[1],
        stopSol: endSol,
        stopLabel: isActive
          ? m.traverse_current_rover_position()
          : m.traverse_final_rover_position(),
      };
      planetMesh.add(endDot);
      tier2DelayedReveal.push(endDot);
      // Captions along path tangent, offset away from each other
      // so labels don't overlap the dots or the line.
      const startPosWorld = startWorld.clone();
      const endPosWorld = endWorld.clone();
      const tangent = new THREE.Vector3().subVectors(endPosWorld, startPosWorld).normalize();
      const TANGENT_OFFSET = 0.025;
      const RADIAL_OFFSET = 0.03;
      function placeCaption(at: THREE.Vector3, awayFromOther: THREE.Vector3): THREE.Vector3 {
        const out = at.clone().addScaledVector(awayFromOther, TANGENT_OFFSET);
        return out.normalize().multiplyScalar(r + RADIAL_OFFSET);
      }
      const startLabelText = site?.landing_date
        ? m.surface_landed_on_caps({ date: site.landing_date })
        : m.surface_landing_site_caps();
      const startBuilt = buildTraverseCaption(startLabelText, '#22c55e', 0.32);
      startBuilt.group.position.copy(placeCaption(startPosWorld, tangent.clone().negate()));
      planetMesh.add(startBuilt.group);
      tier2DelayedReveal.push(startBuilt.group);
      // The mission's distance driven when the data carries it (#641): the
      // simplified polyline runs 5-11 % short of the odometry.
      const pathKm = tr.length_km ?? traversePathKm(tr.points, ctx.radiusKm);
      const endIso = isActive ? new Date().toISOString() : tr.snapshot_date;
      // A finished mission counts its recorded time on the surface, not landing
      // to the data snapshot (Lunokhod 1 read 20,441 days, Apollo 15 20,186).
      const days =
        !isActive && site?.surface_duration_days != null
          ? site.surface_duration_days
          : site?.landing_date
            ? daysBetween(site.landing_date, endIso)
            : 0;
      const loc = getLocale() as LocaleCode;
      const kmText = formatNumber(pathKm, loc, pathKm >= 100 ? 0 : 1);
      const daysText = formatNumber(days, loc, days < 10 && days % 1 ? 1 : 0);
      const endLabelText = isActive
        ? m.traverse_end_active({ km: kmText, days: daysText })
        : m.traverse_end_ended({ km: kmText, days: daysText });
      const endBuilt = buildTraverseCaption(endLabelText, isActive ? '#ef4444' : '#f59e0b', 0.34);
      endBuilt.group.position.copy(placeCaption(endPosWorld, tangent));
      planetMesh.add(endBuilt.group);
      tier2DelayedReveal.push(endBuilt.group);

      // Curated traverse stops (Slice 5b — sample sites, drill sites,
      // notable sols). NASA-style balloon-pin sprites with the sol
      // number painted inside the head. Joining tier2DelayedReveal
      // lets them fade in lockstep with the line + dots.
      const stopPins: THREE.Sprite[] = [];
      const stopPinTextures: THREE.Texture[] = [];
      const stopLabels: THREE.Sprite[] = [];
      // The rover's own photos (#641), pinned where it was on their sol.
      for (const ph of tr.route_photos ?? []) {
        const { sprite, texture } = buildTraversePhotoPin();
        sprite.position.copy(tpos(ph.lat, ph.lon, r));
        sprite.userData = {
          roverId: tr.rover_id,
          kind: 'traverse-photo',
          stopSol: ph.sol,
          stopSolApprox: ph.sol_approx === true,
          image: ph.image,
          thumb: ph.thumb,
        };
        planetMesh.add(sprite);
        tier2DelayedReveal.push(sprite);
        stopPins.push(sprite);
        stopPinTextures.push(texture);
      }
      let replayMarker: THREE.Sprite | undefined;
      if (sols) {
        replayMarker = buildTraverseStopPin(0xffffff).sprite;
        replayMarker.visible = false;
        replayMarker.renderOrder = 10;
        replayMarker.userData = { roverId: tr.rover_id, kind: 'traverse-replay' };
        planetMesh.add(replayMarker);
      }
      // #641 — landing marker ON the path: sol-carrying paths start at the
      // lander as seen on HiRISE, which the site's rounded patch-pin is not.
      if (sols) {
        const { sprite: landSprite, texture: landTexture } = buildTraverseStopPin(0x22c55e);
        landSprite.position.copy(startWorld);
        landSprite.userData = {
          roverId: tr.rover_id,
          kind: 'traverse-landing',
          stopSol: sols[0],
          stopLabel: site?.landing_date
            ? m.surface_landed_on({ date: site.landing_date })
            : m.surface_landing_site(),
          stopLat: first[0],
          stopLon: first[1],
        };
        planetMesh.add(landSprite);
        tier2DelayedReveal.push(landSprite);
        stopPins.push(landSprite);
        stopPinTextures.push(landTexture);
      }
      if (tr.stops) {
        const STOP_KIND_COLOR: Record<string, number> = {
          sample: 0xfb923c,
          drill: 0xf97316,
          panorama: 0x22d3ee, // a3-keep: marker kind identity colour, palette review at the end
          helicopter: 0xe879f9,
          feature: 0xfde047,
        };
        for (const stop of tr.stops) {
          const stopWorld = tpos(stop.lat, stop.lon, r);
          const { sprite: pinSprite, texture: pinTexture } = buildTraverseStopPin(
            STOP_KIND_COLOR[stop.kind] ?? 0xfde047,
          );
          pinSprite.position.copy(stopWorld);
          pinSprite.userData = {
            roverId: tr.rover_id,
            kind: 'traverse-stop',
            stopKind: stop.kind,
            stopSol: stop.sol,
            stopLabel: stop.label,
          };
          planetMesh.add(pinSprite);
          tier2DelayedReveal.push(pinSprite);
          stopPins.push(pinSprite);
          stopPinTextures.push(pinTexture);
          // #641 — "Victoria Crater · Sol 952" pill beside the ring; the
          // animate loop sizes it and keeps it clear of the ring.
          if (stop.label) {
            const kindHex = STOP_KIND_COLOR[stop.kind] ?? 0xfde047;
            // Moon stops carry no sol (Apollo 17's stations read "Sol undefined").
            const pillText = Number.isFinite(stop.sol)
              ? `${stop.label} · ${m.traverse_sol({ sol: formatNumber(stop.sol, getLocale() as LocaleCode) })}`
              : stop.label;
            const pill = buildTraverseText(pillText, {
              pill: `#${kindHex.toString(16).padStart(6, '0')}`,
              center: [0, 0.5],
            });
            pill.position.copy(stopWorld);
            pill.userData = {
              ...pill.userData,
              roverId: tr.rover_id,
              kind: 'traverse-stop-label',
              sol: stop.sol,
            };
            planetMesh.add(pill);
            stopLabels.push(pill);
          }
        }
      }

      // Along-route HiRISE detail patches (#360) — one per route_patches
      // entry, dropped on the MAGNIFIED traverse so the user can zoom
      // into HiRISE anywhere the rover drove. Detail-only (no regional
      // disc); co-scaled + north-aligned exactly like the landing patch.
      if (tr.route_patches?.length) {
        // #363 perf — defer this rover's along-route HiRISE imagery
        // (regional CTX + N multi-MB detail patches) until the rover is
        // selected. They only render when the rover is focused, so
        // building all rovers at mount flooded GPU/network and stalled
        // the planet's first paint. Built synchronously in selectSite,
        // before the fly-in reads routeViewCenters (which this sets).
        routePatchBuilders.set(tr.rover_id, () => {
          const regionalGroundForPatch = trSite?.hotspot_tier2_regional_ground_m ?? 15360;
          // Regional CTX at the traverse MIDPOINT (#360) — re-centred so the
          // whole drive frames inside the 15.4 km context (fetch-mars-ctx
          // crops the same arc-length midpoint). Rendered here instead of on
          // the landing patch, which skips its regional for traverse rovers.
          const regionalUrl = trSite?.hotspot_tier2_regional_source;
          if (regionalUrl) {
            const [midLat, midLon] = routeMidpoint(tr.points);
            // Regional sits on a LOWER shell than the detail patches so the
            // two never z-fight where they overlap.
            const rReg = planetRadius + 0.03;
            const midUnit = tpos(midLat, midLon, rReg).normalize();
            const rmLat = (Math.asin(Math.max(-1, Math.min(1, midUnit.y))) * 180) / Math.PI;
            const rmLon = (Math.atan2(-midUnit.z, midUnit.x) * 180) / Math.PI;
            // Camera frames the route here (the magnified midpoint), not the
            // landing — so selecting the rover centres the whole drive (#360).
            routeViewCenters.set(tr.rover_id, { lat: rmLat, lon: rmLon });
            const regWrap = new THREE.Group();
            placeOnSphereTangent(regWrap, midUnit, rReg);
            const regGroup = buildRegionalPatch({
              textureUrl: regionalUrl,
              siteId: tr.rover_id,
              orientationDeg: azimuthToAlignNorth(rmLat, rmLon, regWrap.quaternion),
            });
            regWrap.add(regGroup);
            // Tag with the rover so the per-frame reveal can gate this
            // midpoint CTX on the FOCUSED site only (#360 — see the
            // traverse visibility loop).
            regWrap.userData = { roverId: tr.rover_id };
            planetMesh.add(regWrap);
            routePatchGroups.push(regWrap);
            routeRegionalGroups.push(regWrap);
            regGroup.traverse((o) => {
              if (o instanceof THREE.Mesh && o.userData?.layer === 'regional') {
                const m = o.material as THREE.Material & { opacity: number };
                m.transparent = true;
                m.opacity = 0;
                routeRegionalMaterials.push(m);
              }
            });
            // Selection bracket at the route centre — the blue-corner
            // "zoomable imagery here" cue, north-aligned + framing the
            // midpoint CTX. Visible while the rover is selected (#360).
            // Square (aspect 1) to MATCH the midpoint CTX patch, which
            // buildRegionalPatch renders square (no region_bounds passed).
            // Using the region_bounds aspect here made the bracket a
            // tall/narrow rectangle around a square image — glaring on
            // Zhurong (region aspect 0.45) where the blue corners sat well
            // outside the CTX. The CTX crop is square, so the frame is too.
            const routeHalo = createMarkerHalo(color, 1.6, {
              lay: true,
              aspect: 1,
            });
            const haloWrap = new THREE.Group();
            placeOnSphereTangent(haloWrap, midUnit, rReg + 0.02);
            const haloSpin = new THREE.Group();
            haloSpin.rotation.y =
              (azimuthToAlignNorth(rmLat, rmLon, haloWrap.quaternion) * Math.PI) / 180;
            haloSpin.add(routeHalo);
            haloWrap.add(haloSpin);
            planetMesh.add(haloWrap);
            routePatchGroups.push(haloWrap);
            // Track the halo itself (not the wrap) — createMarkerHalo starts it
            // hidden; the per-frame loop flips it on when the rover is selected.
            routeSelectionHalos.push({ siteId: tr.rover_id, obj: routeHalo });
          }
          // Path-travel direction at a route point (#360): direction of the
          // nearest polyline segment, in MAGNIFIED world space. Route patches
          // orient to this instead of geographic north so they tile neatly
          // along the traverse (Marko's call — accepts losing CTX-north match
          // on the route segments).
          const pathDirAt = (lat: number, lon: number): THREE.Vector3 => {
            let best = Infinity;
            let segIdx = 1;
            for (let i = 1; i < points.length; i++) {
              const mlat = (points[i - 1][0] + points[i][0]) / 2;
              const mlon = (points[i - 1][1] + points[i][1]) / 2;
              const d = (mlat - lat) ** 2 + (mlon - lon) ** 2;
              if (d < best) {
                best = d;
                segIdx = i;
              }
            }
            const a = tpos(points[segIdx - 1][0], points[segIdx - 1][1], r);
            const b = tpos(points[segIdx][0], points[segIdx][1], r);
            return b.clone().sub(a);
          };
          // Detail patches sit on a HIGHER shell than the regional.
          const rDet = planetRadius + 0.08;
          // `?? []` — the deferred closure loses the outer `?.length`
          // narrowing; route_patches is guaranteed non-empty here by the
          // enclosing `if (tr.route_patches?.length)`.
          for (const rp of tr.route_patches ?? []) {
            const mUnit = tpos(rp.lat, rp.lon, rDet).normalize();
            const wrap = new THREE.Group();
            placeOnSphereTangent(wrap, mUnit, rDet);
            const patchGroup = buildHotspotSurfacePatch({
              textureUrl: ladderRungUrl(rp.image, rp.rungs, ctx.routeTileMaxPx ?? 1024),
              accentColor: color,
              siteId: tr.rover_id,
              orientationDeg: azimuthToAlignDir(pathDirAt(rp.lat, rp.lon), wrap.quaternion),
              groundMeters: rp.ground_m,
              regionalGroundMeters: regionalGroundForPatch,
            });
            // Tag the wrap with its manifest entry so the flat-patch trigger
            // can resolve which route patch is under the view (#360).
            wrap.userData = { roverId: tr.rover_id, routePatch: rp };
            wrap.add(patchGroup);
            planetMesh.add(wrap);
            routePatchGroups.push(wrap);
            routeDetailGroups.push(wrap);
            // Collect detail materials so the reveal ramp can fade them in.
            // depthWrite:false so adjacent overlapping patches alpha-blend by
            // render order instead of z-fighting (they tile with slight edge
            // overlap at 0.5 km spacing).
            patchGroup.traverse((o) => {
              if (o instanceof THREE.Mesh && o.userData?.layer === 'detail') {
                const m = o.material as THREE.Material & { opacity: number };
                m.transparent = true;
                m.depthWrite = false;
                m.opacity = 0;
                routePatchMaterials.push(m);
              }
            });
          }
        });
        // Already-selected rover (deep-link, or selection made before
        // traverses finished loading) — build its route imagery now.
        if (ctx.getSelected()?.id === tr.rover_id) {
          routePatchBuilders.get(tr.rover_id)?.();
          routePatchBuilders.delete(tr.rover_id);
        }
      }

      traverseLines.push({
        line,
        lineMaterial,
        startDot,
        endDot,
        roverId: tr.rover_id,
        isActive,
        startLabel: startBuilt.group,
        endLabel: endBuilt.group,
        startLabelTexture: startBuilt.texture,
        endLabelTexture: endBuilt.texture,
        stopPins,
        stopPinTextures,
        ...(sols ? pathHover(verts, sols, tr, site?.landing_date, ctx.radiusKm) : {}),
        toDrawn: (lat: number, lon: number): [number, number] => {
          const u = tpos(lat, lon, 1).normalize();
          return [
            (Math.asin(Math.max(-1, Math.min(1, u.y))) * 180) / Math.PI,
            (Math.atan2(-u.z, u.x) * 180) / Math.PI,
          ];
        },
        casing,
        casingMaterial,
        replayMarker,
        ticks,
        tickMaterials,
        tickLabels,
        stopLabels,
        startAnchor: startPosWorld.clone(),
        endAnchor: endPosWorld.clone(),
        tangent: tangent.clone(),
        surfaceRadius: r,
      });
    }
  }

  return { rebuildTraverses };
}
