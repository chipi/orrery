/**
 * 3D picking for SurfaceScene — the raycast helpers (surface sites +
 * orbital markers, Earth satellites, museum pins, observatory pins,
 * traverse stops / patch pins) and the click dispatcher that decides
 * which kind of object wins.
 *
 * Extracted from SurfaceScene's onMount closure. State that changes
 * after mount (`$state` / reassigned `let`s) is read through `get*`
 * getters on the context so a pick never sees a stale value; arrays
 * that are mutated in place are passed by reference.
 */
import * as THREE from 'three';
import * as m from '$lib/paraglide/messages';
import { getLocale } from '$lib/paraglide/runtime';
import { formatNumber } from '$lib/format';
import { getImageAlt } from '$lib/image-alt';
import type { LocaleCode } from '$lib/locale';
import type { OrbiterMarker } from '$lib/three/orbiter-group';
import type { HotspotEntry } from '$lib/hotspot-lod-dispatcher';
import type { SkyboxHandle } from '$lib/hotspot-tier3-skybox';
import type { SatObj } from '$lib/surface-scene/earth-satellite-layer';
import type { MuseumPin } from '$lib/surface-scene/museum-layer';
import type { EarthObject } from '$types/earth-object';
import type { PanoramaAnnotation, SurfaceSite } from '$types/surface-site';

/** The slice of a rendered traverse the stop picker raycasts against. */
export interface PickableTraverseLine {
  stopPins: THREE.Sprite[];
  endDot: THREE.Mesh;
  line?: THREE.Object3D;
  pathWorld?: THREE.Vector3[];
  pointSols?: number[];
  pointKm?: number[];
  dateOfSol?: (sol: number) => string;
}

/** Path hover (#641): the vertex nearest the pointer within `maxPx` on
 *  screen, or -1. `project` maps a world point to client pixels. */
export function nearestPathVertex(
  pathWorld: ReadonlyArray<THREE.Vector3>,
  project: (v: THREE.Vector3) => [number, number] | null,
  x: number,
  y: number,
  maxPx = 10,
): number {
  let best = -1;
  let bestD = maxPx;
  for (let i = 0; i < pathWorld.length; i++) {
    const p = project(pathWorld[i]);
    if (!p) continue;
    const d = Math.hypot(p[0] - x, p[1] - y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

/** Compact tooltip payload returned by `pickStopAt`. */
export interface StopPickHit {
  title: string;
  /** Photo pin (#641): the image to open, and its small preview. */
  image?: string;
  thumb?: string;
  sol?: number;
  label?: string;
  lat?: number;
  lon?: number;
}

export interface SurfacePickingContext {
  el3d: HTMLElement;
  camera: THREE.PerspectiveCamera;
  /** Surface markers (mutated in place by rebuildMarkers). */
  markers: ReadonlyArray<{ group: THREE.Group }>;
  /** Orbital markers (mutated in place by rebuildOrbitalMarkers). */
  orbitalMarkers: ReadonlyArray<OrbiterMarker>;
  traverseLines: ReadonlyArray<PickableTraverseLine>;
  hotspots: ReadonlyArray<HotspotEntry>;
  getSites: () => SurfaceSite[];
  getPadsOn: () => boolean;
  getLayerOrbiters: () => boolean;
  getEarthSats: () => SatObj[];
  getMuseumsOn: () => boolean;
  getMuseumPins: () => MuseumPin[];
  getTelescopesOn: () => boolean;
  getObservatoryPins: () => MuseumPin[];
  getPanoramaActive: () => boolean;
  getPanoramaSkybox: () => SkyboxHandle | null;
  getEarthObjects: () => EarthObject[];
  /** Panorama annotation sprite was clicked. */
  onPanoramaAnnotation: (hit: PanoramaAnnotation) => void;
  /** A satellite was clicked; `o` is its EarthObject. */
  onSatPicked: (o: EarthObject) => void;
  onObservatoryPicked: (id: string) => void;
  onMuseumPicked: (id: string) => void;
  onSitePicked: (id: string) => void;
}

export interface SurfacePicking {
  pickSiteAt: (clientX: number, clientY: number) => string | null;
  pickSatAt: (clientX: number, clientY: number) => string | null;
  pickMuseumAt: (clientX: number, clientY: number) => string | null;
  pickObservatoryAt: (clientX: number, clientY: number) => string | null;
  pickStopAt: (clientX: number, clientY: number) => StopPickHit | null;
  tryPick3d: (clientX: number, clientY: number) => void;
}

export function createSurfacePicking(ctx: SurfacePickingContext): SurfacePicking {
  const { el3d, camera } = ctx;
  const ray = new THREE.Raycaster();

  function pickSiteAt(clientX: number, clientY: number): string | null {
    const rect = el3d.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const targets: THREE.Object3D[] = [];
    if (ctx.getPadsOn()) for (const mk of ctx.markers) targets.push(mk.group);
    if (ctx.getLayerOrbiters()) for (const om of ctx.orbitalMarkers) targets.push(om.dotGroup);
    const hits = ray.intersectObjects(targets, true);
    const hit = hits.find((h) => typeof h.object.userData.siteId === 'string');
    return hit ? (hit.object.userData.siteId as string) : null;
  }

  // #290 Slice 6b — Earth-satellite picker. Raycasts against the
  // sat-layer hit spheres (3u radius around each spacecraft) so the
  // user can grab moving satellites without millimetre-perfect
  // pointer accuracy. Returns the EarthObject id when a satellite
  // is hit, or null. Empty no-op on /moon and /mars (earthSats [] ).
  function pickSatAt(clientX: number, clientY: number): string | null {
    const earthSats = ctx.getEarthSats();
    if (earthSats.length === 0) return null;
    const rect = el3d.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const targets: THREE.Object3D[] = [];
    for (const s of earthSats) if (s.group.visible) targets.push(s.group);
    const hits = ray.intersectObjects(targets, true);
    const hit = hits.find((h) => typeof h.object.userData.id === 'string');
    return hit ? (hit.object.userData.id as string) : null;
  }

  // PRD-027 — museum pins (gold), tagged userData.museumId.
  function pickMuseumAt(clientX: number, clientY: number): string | null {
    const museumPins = ctx.getMuseumPins();
    if (!ctx.getMuseumsOn() || museumPins.length === 0) return null;
    const rect = el3d.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const hits = ray.intersectObjects(
      museumPins.map((p) => p.group),
      true,
    );
    const hit = hits.find((h) => typeof h.object.userData.museumId === 'string');
    return hit ? (hit.object.userData.museumId as string) : null;
  }

  function pickObservatoryAt(clientX: number, clientY: number): string | null {
    const observatoryPins = ctx.getObservatoryPins();
    if (!ctx.getTelescopesOn() || observatoryPins.length === 0) return null;
    const rect = el3d.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const hits = ray.intersectObjects(
      observatoryPins.map((p) => p.group),
      true,
    );
    const hit = hits.find((h) => typeof h.object.userData.observatoryId === 'string');
    return hit ? (hit.object.userData.observatoryId as string) : null;
  }

  function tryPick3d(clientX: number, clientY: number) {
    // Panorama mode: raycast annotation sprites first (PRD-022 / ADR-074
    // Phase 2E). Hit → open annotation card; miss → fall through.
    const panoramaSkybox = ctx.getPanoramaSkybox();
    if (ctx.getPanoramaActive() && panoramaSkybox) {
      const rect = el3d.getBoundingClientRect();
      const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
      const hit = panoramaSkybox.raycastAnnotation(ndcX, ndcY, camera);
      if (hit) {
        ctx.onPanoramaAnnotation(hit);
        return;
      }
    }
    // #290 Slice 6b — Earth satellites win over surface sites. Sat
    // hit-spheres are 3u radius and lie outside the planet, so a
    // click landing on both means the user is targeting the
    // satellite. Mutual selection: opening a sat clears the surface-
    // site selection, and selectSite clears selectedSat above.
    const satId = pickSatAt(clientX, clientY);
    if (satId) {
      const o = ctx.getEarthObjects().find((x) => x.id === satId);
      if (o) {
        ctx.onSatPicked(o);
        return;
      }
    }
    const observatoryId = pickObservatoryAt(clientX, clientY);
    if (observatoryId) {
      ctx.onObservatoryPicked(observatoryId);
      return;
    }
    const museumId = pickMuseumAt(clientX, clientY);
    if (museumId) {
      ctx.onMuseumPicked(museumId);
      return;
    }
    const id = pickSiteAt(clientX, clientY);
    if (id) ctx.onSitePicked(id);
  }

  // Raycast against every traverse-stop pin sprite, the
  // traverse-end dot, and the patch-pin landing marker across
  // all loaded rovers / hotspots. Returns a compact tooltip
  // payload (title + optional sol + optional lat/lon).
  // Hover anywhere on a visible sol-carrying path: "Sol N" + date + km.
  function pickPathAt(clientX: number, clientY: number, rect: DOMRect): StopPickHit | null {
    const v = new THREE.Vector3();
    const toCam = new THREE.Vector3();
    const outward = new THREE.Vector3();
    const project = (w: THREE.Vector3): [number, number] | null => {
      v.copy(w).applyMatrix4(planetWorld);
      // Far side of the globe: the path vertex faces away from the camera, so it is hidden.
      if (toCam.copy(camera.position).sub(v).dot(outward.copy(v).sub(planetCentre)) <= 0)
        return null;
      v.project(camera);
      if (v.z > 1) return null;
      return [rect.left + ((v.x + 1) / 2) * rect.width, rect.top + ((1 - v.y) / 2) * rect.height];
    };
    for (const tl of ctx.traverseLines) {
      if (!tl.line?.visible || !tl.pathWorld || !tl.pointSols || !tl.pointKm) continue;
      planetWorld.copy(tl.line.parent?.matrixWorld ?? new THREE.Matrix4());
      planetCentre.setFromMatrixPosition(planetWorld);
      const i = nearestPathVertex(tl.pathWorld, project, clientX, clientY);
      if (i < 0) continue;
      const sol = tl.pointSols[i];
      const km = tl.pointKm[i];
      return {
        title: m.traverse_sol({ sol: formatNumber(sol, getLocale() as LocaleCode) }),
        label: m.traverse_hover_detail({
          date: tl.dateOfSol?.(sol) ?? '',
          km: formatNumber(km, getLocale() as LocaleCode, km < 10 ? 2 : 1),
        }),
      };
    }
    return null;
  }
  const planetWorld = new THREE.Matrix4();
  const planetCentre = new THREE.Vector3();

  function pickStopAt(clientX: number, clientY: number): StopPickHit | null {
    const rect = el3d.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const targets: THREE.Object3D[] = [];
    // (a) in-between traverse-stop pin sprites + end dot. Only the VISIBLE
    // ones — the pins are hidden at wide zoom (detailOpacity gate), but
    // raycasting ignores `visible`, so without this filter the tooltip
    // leaks at planetary level where the pins aren't even drawn (#360).
    for (const tl of ctx.traverseLines) {
      for (const sp of tl.stopPins) if (sp.visible) targets.push(sp);
      if (tl.endDot.visible) targets.push(tl.endDot);
    }
    // (b) per-hotspot patch-pin (landing marker, green flat disc)
    for (const h of ctx.hotspots) {
      if (!h.tier2Group || !h.tier2Group.visible) continue;
      h.tier2Group.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.userData?.kind === 'patch-pin') {
          targets.push(obj);
        }
      });
    }
    const hits = targets.length ? ray.intersectObjects(targets, false) : [];
    const hit = hits.find((h) => h.object.userData?.kind);
    if (!hit) return pickPathAt(clientX, clientY, rect);
    const ud = hit.object.userData;
    if (ud.kind === 'traverse-stop') {
      // "Sol N" once, as the title (the card's sol line repeated it); a stop
      // without a sol (the Moon's stations) is titled by its name.
      return Number.isFinite(ud.stopSol)
        ? {
            title: m.traverse_sol({ sol: formatNumber(ud.stopSol, getLocale() as LocaleCode) }),
            label: ud.stopLabel,
          }
        : { title: ud.stopLabel ?? '', label: undefined };
    }
    if (ud.kind === 'traverse-photo') {
      return {
        title: m.traverse_sol({
          sol: `${ud.stopSolApprox ? '≈' : ''}${formatNumber(ud.stopSol, getLocale() as LocaleCode)}`,
        }),
        label: getImageAlt(ud.image, getLocale()),
        image: ud.image,
        thumb: ud.thumb,
      };
    }
    if (ud.kind === 'traverse-landing') {
      return {
        title: m.surface_landing_site(),
        label: ud.stopLabel,
        lat: ud.stopLat,
        lon: ud.stopLon,
      };
    }
    if (ud.kind === 'traverse-end') {
      return {
        title: ud.stopLabel ?? m.traverse_current_position(),
        sol: ud.stopSol,
        lat: ud.stopLat,
        lon: ud.stopLon,
      };
    }
    if (ud.kind === 'patch-pin') {
      const site = ctx.getSites().find((s) => s.id === ud.siteId);
      if (!site) return null;
      return {
        title: m.surface_landing_site(),
        label: site.landing_date ? m.surface_landed_on({ date: site.landing_date }) : undefined,
        lat: site.lat,
        lon: site.lon,
      };
    }
    return null;
  }

  return { pickSiteAt, pickSatAt, pickMuseumAt, pickObservatoryAt, pickStopAt, tryPick3d };
}
