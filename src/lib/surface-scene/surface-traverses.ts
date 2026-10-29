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
import * as m from '$lib/paraglide/messages';
import { disposeObject3d } from '$lib/three/dispose-object3d';
import { createMarkerHalo } from '$lib/three/marker-halo';
import {
  placeOnSphereTangent,
  azimuthToAlignNorth,
  azimuthToAlignDir,
} from '$lib/three/place-on-sphere';
import { colorFor } from '$lib/surface-map/nation-palette';
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

/** Whole-day count between two ISO dates (or ISO + Date). */
export function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / (1000 * 60 * 60 * 24));
}

// ─── Traverses (Mars rover paths today, Moon EVA paths future) ───
export type TraverseLine = {
  line: Line2;
  lineMaterial: LineMaterial;
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

// ── Traverse-stop balloon-pin marker (NASA-map style) ───────────
// Tear-drop balloon with kind-tinted body, thin white outline,
// soft drop shadow, small white centre dot. Sol info is surfaced
// only via the hover tooltip so the pin face doesn't duplicate
// it — duplicate text was illegible at close zoom anyway (image
// 19 feedback, 2026-06-02). Anchored at the tip via
// sprite.center=(0.5, 0). Base scale is 1.0 here because the
// animate loop computes a screen-pixel-stable target size and
// sets sprite.scale per frame.
function buildTraverseStopPin(hexColor: number): {
  sprite: THREE.Sprite;
  texture: THREE.Texture;
} {
  const hex = `#${hexColor.toString(16).padStart(6, '0')}`;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 96;
  const cx = 32;
  const headR = 22;
  const headY = 28;
  const tipY = 86;
  const ctx2 = canvas.getContext('2d');
  if (ctx2) {
    ctx2.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx2.shadowBlur = 5;
    ctx2.shadowOffsetY = 2;
    ctx2.beginPath();
    ctx2.arc(cx, headY, headR, Math.PI * 0.78, Math.PI * 0.22, false);
    ctx2.lineTo(cx, tipY);
    ctx2.closePath();
    ctx2.fillStyle = hex;
    ctx2.fill();
    ctx2.shadowColor = 'transparent';
    ctx2.shadowBlur = 0;
    ctx2.shadowOffsetY = 0;
    ctx2.lineWidth = 3;
    ctx2.strokeStyle = '#ffffff';
    ctx2.stroke();
    ctx2.fillStyle = '#ffffff';
    ctx2.beginPath();
    ctx2.arc(cx, headY, 6, 0, Math.PI * 2);
    ctx2.fill();
  }
  const texture = new THREE.Texture(canvas);
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
  sprite.center.set(0.5, 0);
  return { sprite, texture };
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
      if (trSite?.lat != null && trSite?.lon != null) {
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
      const lineMaterial = new LineMaterial({
        color: new THREE.Color(color).getHex(),
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
      const endSol = site?.landing_date ? daysBetween(site.landing_date, endIsoForUserData) : 0;
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
      const startLabelText = site?.landing_date ? `LANDED ${site.landing_date}` : 'LANDING SITE';
      const startBuilt = buildTraverseCaption(startLabelText, '#22c55e', 0.32);
      startBuilt.group.position.copy(placeCaption(startPosWorld, tangent.clone().negate()));
      planetMesh.add(startBuilt.group);
      tier2DelayedReveal.push(startBuilt.group);
      const pathKm = traversePathKm(tr.points, ctx.radiusKm);
      const endIso = isActive ? new Date().toISOString() : tr.snapshot_date;
      const days = site?.landing_date ? daysBetween(site.landing_date, endIso) : 0;
      const kmText = pathKm >= 100 ? pathKm.toFixed(0) : pathKm.toFixed(1);
      const endLabelText = isActive
        ? `${kmText} KM · DAY ${days.toLocaleString()}`
        : `${kmText} KM · ${days.toLocaleString()} D`;
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
      if (tr.stops) {
        const STOP_KIND_COLOR: Record<string, number> = {
          sample: 0xfb923c,
          drill: 0xf97316,
          panorama: 0x22d3ee,
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
            const raw = tr.points;
            const seg = raw.slice(1).map((b, i) => {
              const a = raw[i];
              return Math.hypot(b[0] - a[0], (b[1] - a[1]) * Math.cos((a[0] * Math.PI) / 180));
            });
            const halfLen = seg.reduce((s, d) => s + d, 0) / 2;
            let acc = 0;
            let midLat = raw[0][0];
            let midLon = raw[0][1];
            for (let i = 0; i < seg.length; i++) {
              if (acc + seg[i] >= halfLen) {
                const t = seg[i] ? (halfLen - acc) / seg[i] : 0;
                midLat = raw[i][0] + (raw[i + 1][0] - raw[i][0]) * t;
                midLon = raw[i][1] + (raw[i + 1][1] - raw[i][1]) * t;
                break;
              }
              acc += seg[i];
            }
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
              textureUrl: rp.image,
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
        startAnchor: startPosWorld.clone(),
        endAnchor: endPosWorld.clone(),
        tangent: tangent.clone(),
        surfaceRadius: r,
      });
    }
  }

  return { rebuildTraverses };
}
