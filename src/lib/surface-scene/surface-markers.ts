/**
 * Surface-site and orbiter markers for SurfaceScene: per-site lander
 * silhouette + label + selection / hover halos + hotspot-LOD enrolment
 * (`rebuildMarkers`), and the orbital ring + dot per orbiter site
 * (`rebuildOrbitalMarkers`).
 *
 * Extracted from SurfaceScene's onMount closure. The arrays / maps the
 * animation loop, picker and selection effects also read are owned by the
 * scene and passed by reference (mutated in place, never reassigned);
 * reactive component state is read through `get*` getters.
 */
import * as THREE from 'three';
import { disposeObject3d } from '$lib/three/dispose-object3d';
import { createMarkerHalo } from '$lib/three/marker-halo';
import { attachPickableHit } from '$lib/three/pickable-hit';
import { buildOrbiterGroup, type OrbiterMarker } from '$lib/three/orbiter-group';
import { placeOnSphereTangent, azimuthToAlignNorth } from '$lib/three/place-on-sphere';
import { dimMaterials } from '$lib/three/dim-materials';
import { colorFor } from '$lib/surface-map/nation-palette';
import { latLonToUnitSphere } from '$lib/moon-projection';
import { buildLabel } from '$lib/three-label';
import { getImageEntry, hotspotTileTexture } from '$lib/image-vision';
import {
  createHotspotEntry,
  getHotspotModelBuilder,
  type HotspotEntry,
} from '$lib/hotspot-lod-dispatcher';
import {
  aspectFromRegion,
  buildHotspotSurfacePatch,
  REGIONAL_PATCH_DIAMETER_WORLD_UNITS,
} from '$lib/hotspot-surface-patch';
import type { SurfaceSceneConfig } from '$lib/surface-scene/types';
import type { SurfaceSite, Traverse } from '$types/surface-site';

// Hover-halo factory — bolder + glowing variant of the selection
// halo, in OutlinePass teal. Lays flat against the surface with a
// small Y offset to avoid z-fighting. Two variants:
//   - circular: outer soft disc (radius 2.4, opacity 0.16) + crisp
//     teal ring (1.7–2.4, opacity 0.95). Reads at heliocentric
//     framing where the lander cone is sub-pixel.
//   - rectangular: 4 corner brackets + soft fill, sized via aspect.
//     Brighter / thicker than the selection-style brackets so the
//     "I'm hovering this" cue beats the LROC patch underneath.
const HOVER_TEAL = 0x4ecdc4;
function buildHoverHalo(aspect: number | undefined, diameter = 4.4): THREE.Object3D {
  const group = new THREE.Group();
  // Corner-bracket hover affordance for every region-bounds site, incl.
  // near-square ones — matches the selection halo (no leftover circles).
  const isRect = aspect != null;
  if (isRect) {
    const circleArea = (Math.PI / 4) * diameter * diameter;
    const height = Math.sqrt(circleArea / aspect);
    const width = aspect * height;
    const w2 = width / 2;
    const h2 = height / 2;
    // Soft fill — teal at 0.10 opacity. Subtle but adds the "lit"
    // feeling vs the dim selection halo fill (0.04).
    const fillGeo = new THREE.PlaneGeometry(width, height);
    const fillMat = new THREE.MeshBasicMaterial({
      color: HOVER_TEAL,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    group.add(new THREE.Mesh(fillGeo, fillMat));
    // Corner brackets — same L-shape pattern as the selection halo
    // but in teal at full opacity for the hover cue.
    const armLen = Math.min(width, height) * 0.18;
    // prettier-ignore
    const bracketVerts = new Float32Array([
      -w2, -h2, 0,    -w2 + armLen, -h2, 0,
      -w2, -h2, 0,    -w2, -h2 + armLen, 0,
       w2, -h2, 0,     w2 - armLen, -h2, 0,
       w2, -h2, 0,     w2, -h2 + armLen, 0,
       w2,  h2, 0,     w2 - armLen,  h2, 0,
       w2,  h2, 0,     w2,  h2 - armLen, 0,
      -w2,  h2, 0,    -w2 + armLen,  h2, 0,
      -w2,  h2, 0,    -w2,  h2 - armLen, 0,
    ]);
    const bracketGeo = new THREE.BufferGeometry();
    bracketGeo.setAttribute('position', new THREE.Float32BufferAttribute(bracketVerts, 3));
    const bracketMat = new THREE.LineBasicMaterial({
      color: HOVER_TEAL,
      transparent: true,
      opacity: 1.0,
    });
    group.add(new THREE.LineSegments(bracketGeo, bracketMat));
  } else {
    // Outer glow disc — translucent teal fill, soft radial feel.
    const glowGeo = new THREE.CircleGeometry(2.4, 48);
    const glowMat = new THREE.MeshBasicMaterial({
      color: HOVER_TEAL,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    group.add(new THREE.Mesh(glowGeo, glowMat));
    // Crisp ring — bright teal outline at the disc edge.
    const ringGeo = new THREE.RingGeometry(1.7, 2.4, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: HOVER_TEAL,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    group.add(new THREE.Mesh(ringGeo, ringMat));
  }
  group.position.y = 0.02;
  group.rotation.x = -Math.PI / 2;
  group.visible = false;
  return group;
}

// Site markers — per-category geometry, anchored on the surface,
// parented to planetMesh so they rotate with the sphere (post-v0.1.0
// fix: previously markers floated in scene-space while the moon
// spun underneath, breaking spatial reference). Markers are
// tangent-aligned via lookAt(origin) so they "stand up" from the
// surface instead of pointing along world axes.
export type MarkerObj = {
  group: THREE.Group;
  siteId: string;
  halo?: THREE.Object3D;
  hoverHalo?: THREE.Object3D;
  labelGroup?: THREE.Group;
};

/** Pre-pass for label de-overlap (Florida cluster on /earth: SLC-40,
 *  SLC-41, LC-39A, LC-39B are within ~25 km of each other; their
 *  default radial-up labels stack on the same screen line). Build
 *  small clusters of sites that share a neighbour within
 *  CLUSTER_THRESHOLD on the unit sphere (~75 km at Earth's radius);
 *  within each cluster, cycle through four offset directions so
 *  the labels splay around the dot instead of overlapping. Solo
 *  sites keep the default radial-up offset.  */
export const CLUSTER_THRESHOLD = 0.012; // unit-sphere chord (~75 km on Earth)
const LABEL_OFFSET_CYCLE = [
  new THREE.Vector3(0, 3.2, 0),
  new THREE.Vector3(2.6, -2.0, 0),
  new THREE.Vector3(-2.6, -2.0, 0),
  new THREE.Vector3(0, -3.2, 0),
];
export function computeLabelOffsets(siteList: SurfaceSite[]): Map<string, THREE.Vector3> {
  type Item = { id: string; pos: { x: number; y: number; z: number } };
  const items: Item[] = [];
  for (const s of siteList) {
    if (s.kind === 'orbiter' || s.lat == null || s.lon == null) continue;
    items.push({ id: s.id, pos: latLonToUnitSphere(s.lat, s.lon) });
  }
  const parent = new Map<string, string>();
  for (const it of items) parent.set(it.id, it.id);
  function find(id: string): string {
    let p = parent.get(id) ?? id;
    while (p !== parent.get(p)) p = parent.get(p) ?? p;
    parent.set(id, p);
    return p;
  }
  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }
  const T2 = CLUSTER_THRESHOLD * CLUSTER_THRESHOLD;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const dx = items[i].pos.x - items[j].pos.x;
      const dy = items[i].pos.y - items[j].pos.y;
      const dz = items[i].pos.z - items[j].pos.z;
      if (dx * dx + dy * dy + dz * dz < T2) union(items[i].id, items[j].id);
    }
  }
  const clusters = new Map<string, string[]>();
  for (const it of items) {
    const r = find(it.id);
    const list = clusters.get(r) ?? [];
    list.push(it.id);
    clusters.set(r, list);
  }
  const out = new Map<string, THREE.Vector3>();
  for (const [, ids] of clusters) {
    if (ids.length === 1) {
      out.set(ids[0], LABEL_OFFSET_CYCLE[0]);
      continue;
    }
    ids.sort();
    for (let i = 0; i < ids.length; i++) {
      out.set(ids[i], LABEL_OFFSET_CYCLE[i % LABEL_OFFSET_CYCLE.length]);
    }
  }
  return out;
}

export interface SurfaceMarkersContext {
  scene: THREE.Scene;
  planetMesh: THREE.Object3D;
  planetRadius: number;
  config: Pick<SurfaceSceneConfig, 'landerModelBuilder' | 'tier2PatchScale'>;
  getSites: () => SurfaceSite[];
  getTraverses: () => Record<string, Traverse>;
  markers: MarkerObj[];
  orbitalMarkers: OrbiterMarker[];
  hotspots: HotspotEntry[];
  originalMaxTier: Map<string, 0 | 1 | 2 | 3>;
}

export function createSurfaceMarkers(ctx: SurfaceMarkersContext): {
  rebuildMarkers: () => void;
  rebuildOrbitalMarkers: () => void;
} {
  const { scene, planetMesh, planetRadius, markers, orbitalMarkers, hotspots, originalMaxTier } =
    ctx;

  function rebuildOrbitalMarkers() {
    for (const om of orbitalMarkers) {
      disposeObject3d(om.group);
      scene.remove(om.group);
    }
    orbitalMarkers.length = 0;
    let phase = 0;
    for (const site of ctx.getSites()) {
      if (site.kind !== 'orbiter') continue;
      if (site.altitude_km == null || site.inclination_deg == null) continue;
      const color = colorFor(site);
      // Lunar orbital altitudes range from ~50 km (LRO) to ~470 km
      // (SMART-1). Compress with log scale so all rings fit cleanly
      // around the 30u Moon sphere without overlapping.
      const ringRadius = planetRadius + 4 + Math.log10(1 + site.altitude_km / 50) * 5;
      const dimmed = site.status !== 'ACTIVE';
      const marker = buildOrbiterGroup({
        site,
        color,
        ringRadius,
        inclinationRad: (site.inclination_deg * Math.PI) / 180,
        dimmed,
        orbitPhase: phase,
      });
      scene.add(marker.group);
      orbitalMarkers.push(marker);
      phase += Math.PI / 5;
    }
  }

  // Per-rebuild queue of deferred tier-2 patch builds. Pushed during
  // the main marker loop. Tier-2 patches are no longer pre-warmed at
  // mount (#363 perf) — they build lazily per landing zone via the LOD
  // dispatcher's ensureTierBuilt() when a hotspot is first promoted to
  // Tier 2 (2026-06-17 user note: "on /earth /moon /mars orbits and
  // items load after the planet, sometimes takes few seconds"; #360/#361
  // imagery turned that into a multi-second stall).
  function rebuildMarkers() {
    for (const mk of markers) {
      disposeObject3d(mk.group);
      planetMesh.remove(mk.group);
    }
    markers.length = 0;
    hotspots.length = 0;
    const labelOffsets = computeLabelOffsets(ctx.getSites());
    for (const site of ctx.getSites()) {
      // Skip orbiter entries — they go through rebuildOrbitalMarkers.
      if (site.kind === 'orbiter') continue;
      // Orbiter entries (kind:'orbiter') are filtered out at fetch
      // time on this route, but TS doesn't know that — guard so
      // surface-only positioning math doesn't deal with undefined.
      if (site.lat == null || site.lon == null) continue;
      const { x, y, z } = latLonToUnitSphere(site.lat, site.lon);
      const r = planetRadius;
      // Wrapper group — positions + orients the entire marker on
      // the planet surface. Contains the Tier 0 silhouette sub-group
      // (always present), plus any lazy-built Tier 1+ sub-groups
      // added by the hotspot LOD dispatcher, plus hit sphere + label
      // + halo as siblings.
      const group = new THREE.Group();
      const tier0Group = ctx.config.landerModelBuilder(
        site.id,
        site.mission_type,
        colorFor(site),
        site.agency,
      );
      // Dim crashed/lost markers — the wreckage still has a site but
      // the mission ended on impact, so the marker reads as a fainter
      // historical reference rather than competing for attention with
      // ACTIVE missions. ADR-072 §"True body differences" / lifecycle.
      if (site.status === 'CRASHED' || site.status === 'LOST') {
        dimMaterials(tier0Group, 0.55);
      }
      group.add(tier0Group);
      // Anchor on the surface; orient the group so +Y points away from
      // Moon centre (radially outward), so cone-style markers stand up.
      placeOnSphereTangent(group, { x, y, z }, r);
      // #309 north azimuth — the angle that spins anything laid flat on
      // this site's tangent plane (patch, selection/hover halo brackets)
      // so its local north points to GEOGRAPHIC north. The wrapper quat
      // above leaves the azimuth about the normal arbitrary; this is the
      // single source of truth shared by the halos + the Tier-2 patch so
      // the blue corner brackets line up with the north-aligned imagery.
      const siteOrientationDeg =
        site.lat != null && site.lon != null
          ? azimuthToAlignNorth(site.lat, site.lon, group.quaternion)
          : 0;
      // Spin a flat-laid child (halo etc.) about the surface normal by the
      // north azimuth. A Ry wrapper around the child reproduces the
      // patch's Ry∘Rx orientation exactly (child keeps its rotateX(-90°)
      // flat-lay; wrapper rotates about the wrapper Y = surface normal).
      const northSpun = (child: THREE.Object3D): THREE.Object3D => {
        if (!siteOrientationDeg) return child;
        const spin = new THREE.Group();
        spin.rotation.y = (siteOrientationDeg * Math.PI) / 180;
        spin.add(child);
        return spin;
      };
      attachPickableHit({ dotGroup: group, siteId: site.id });
      // Label with leader line, floating radially outward (along the
      // group's local +Y, which is surface-normal away from Moon
      // centre after the tangent-orient quat above).
      const label = buildLabel({
        text: site.name ?? site.id,
        color: colorFor(site),
        offset: labelOffsets.get(site.id) ?? new THREE.Vector3(0, 3.2, 0),
        size: 1.6,
      });
      group.add(label.group);

      // Selection halo (visible only while site === selected).
      // ADR-061 / ADR-072 Slice 3 §"selection halo as bounding rect":
      // when the site has region_bounds, the halo renders as a thin
      // rectangular outline matching the region's aspect ratio (long
      // for traverse_bbox, square-ish for landing_ellipse near
      // equator, wide for polar ROI). Otherwise falls back to the
      // legacy circular ring.
      const haloAspect = aspectFromRegion(site.region_bounds);
      // Size the bracket to the OUTERMOST visible patch so the corners
      // frame the actual image, not empty surface. Sites WITH a regional
      // CTX/LROC layer show the 3.0u regional disc → bracket ≈ 2.8u
      // (radius 1.4, the historical constant). Sites with only a detail
      // patch (no regional — most /moon landers incl. the Chang'e set,
      // Luna 16-24, SLIM, Beresheet, Chandrayaan-3) show the ~1.0u detail
      // patch, so the 2.8u bracket floated ~2.8× too big and framed bare
      // regolith. Mirror the literal co-scale the patch builder uses.
      const haloHasRegional = site.hotspot_tier2_regional_source != null;
      // Same per-body stylization multiplier the patch builder gets, so
      // the brackets keep hugging the (possibly halved) patch edge.
      const haloPatchScale = ctx.config.tier2PatchScale ?? 1;
      const haloDetailDiam =
        (site.hotspot_tier2_ground_m && site.hotspot_tier2_regional_ground_m
          ? REGIONAL_PATCH_DIAMETER_WORLD_UNITS *
            (site.hotspot_tier2_ground_m / site.hotspot_tier2_regional_ground_m)
          : 1.0) * haloPatchScale;
      const haloOuterDiam = haloHasRegional
        ? REGIONAL_PATCH_DIAMETER_WORLD_UNITS * haloPatchScale
        : haloDetailDiam;
      // 0.93 keeps the bracket a hair INSIDE the patch edge (same ratio
      // the 1.4-radius constant gave against the 3.0u regional).
      const haloRadius = (haloOuterDiam * 0.93) / 2;
      const halo = createMarkerHalo(colorFor(site), haloRadius, {
        lay: true,
        aspect: haloAspect,
      });
      // North-align the corner brackets with the rotated patch (#309).
      group.add(northSpun(halo));

      // Hover halo — same flat-on-ground pose as the selection halo
      // but built with a much thicker stroke + soft inner fill so the
      // "I'm hovering this" cue actually reads at default zoom
      // (2026-06-15 user note: first pass was "almost invisible — make
      // them a bit stronger"). For point sites: an outer teal disc
      // (radius 2.4) at 0.16 opacity for a soft glow, plus a bright
      // teal ring (1.7–2.4) at 0.95 opacity for the crisp outline.
      // For region-bounds sites: same teal corner brackets the
      // selection halo uses, just at full opacity + a slightly
      // wider rectangle so the affordance reads against the LROC
      // patch below.
      // Hover bracket keeps its historical 4.4/3.0 ratio over the
      // selection bracket, scaled to the same outer patch.
      const hoverHalo = buildHoverHalo(haloAspect, haloOuterDiam * (4.4 / 3.0));
      group.add(northSpun(hoverHalo));

      // Surface Hotspot LOD enrolment (PRD-014 / RFC-017 S1).
      // Sites whose surface-hotspots.json sidecar gives
      // hotspot_tier_max >= 1 + a known hotspot_model id get a
      // dispatcher entry. The Tier 1 mesh is built lazily on first
      // promotion (when the user zooms in past the 20-px screen-
      // radius threshold) and added as a sibling of tier0Group
      // inside the wrapper.
      const maxTier = (site.hotspot_tier_max ?? 0) as 0 | 1 | 2 | 3;
      const builderId = site.hotspot_model;
      if (maxTier >= 1 && builderId) {
        const builder = getHotspotModelBuilder(builderId);
        if (builder) {
          const accent = colorFor(site);
          const tier2Source = site.hotspot_tier2_source;
          const tier2RegionalSource = site.hotspot_tier2_regional_source;
          // Tier 2 builder is wired only when the site declares a
          // tier2 source path. The texture is the tile's 512 px 1:1
          // variant (hotspotTileTexture: the vision manifest's, else the
          // tile's .1x1.jpg sibling), never the full-size source (#482).
          const annotations = site.hotspot_annotations;
          const tier2Builder =
            maxTier >= 2 && tier2Source
              ? () => {
                  const textureUrl = hotspotTileTexture(tier2Source, getImageEntry(tier2Source));
                  // Same resolution chain for the regional layer
                  // (Chang'e 2 mosaic or LROC WAC placeholder when
                  // wired; undefined today on /moon — patch builder
                  // skips the regional disc cleanly).
                  // #360: rovers with a traverse render their regional CTX
                  // at the traverse MIDPOINT (rebuildTraverses), not on the
                  // landing patch — so skip the landing regional here to
                  // avoid a duplicate disc centred on the wrong point.
                  let regionalTextureUrl: string | undefined;
                  // #360/#361: Mars rovers tile HiRISE patches along the
                  // magnified route, so their landing regional is rendered at
                  // the traverse midpoint instead (skip it here to avoid a
                  // duplicate disc). Moon traverses no longer tile patches —
                  // the whole short drive fits the single LROC detail /
                  // Kaguya regional — so when a traverse has NO route_patches
                  // we render the landing regional here, exactly like a
                  // non-traverse site, and the polyline overlays it.
                  const siteTrav = ctx.getTraverses()[site.id];
                  if (tier2RegionalSource && (!siteTrav || !siteTrav.route_patches?.length)) {
                    regionalTextureUrl = hotspotTileTexture(
                      tier2RegionalSource,
                      getImageEntry(tier2RegionalSource),
                    );
                  }
                  return buildHotspotSurfacePatch({
                    textureUrl,
                    regionalTextureUrl,
                    accentColor: accent,
                    siteId: site.id,
                    annotations,
                    // ADR-061: when region_bounds is set on the site,
                    // the Tier-2 patch geometry switches from circle
                    // to a stylized rectangle whose aspect matches
                    // the region's lon-extent vs lat-extent ratio.
                    regionBounds: site.region_bounds,
                    // #309 north alignment: spin the north-up HiRISE/CTX
                    // texture so its north points to geographic north on
                    // the globe — same azimuth the halo brackets use, so
                    // imagery + brackets stay locked together.
                    orientationDeg: siteOrientationDeg,
                    // #309 step 2 (option A): true ground extents drive
                    // literal co-scale of the detail patch vs the regional
                    // patch, so a crater is the same size across the seam.
                    groundMeters: site.hotspot_tier2_ground_m,
                    regionalGroundMeters: site.hotspot_tier2_regional_ground_m,
                    patchScale: ctx.config.tier2PatchScale,
                  });
                }
              : undefined;
          const entry = createHotspotEntry({
            siteId: site.id,
            maxTier,
            group,
            tier0Group,
            tier1Builder: () => builder(accent),
            tier2Builder,
          });
          // Tier-2 patch build is LAZY + per-landing-zone (#363 perf).
          // No mount-time pre-warm: the LOD dispatcher's ensureTierBuilt()
          // calls `entry.tier2Builder()` the first time THIS hotspot is
          // promoted to Tier 2 (i.e. the camera zooms into this specific
          // site). Previously every site's tier-2 was pre-built at mount,
          // downloading a flood of multi-MB regional/detail patch textures
          // (moon ~59 MB, mars per-site) while zoomed out where none were
          // visible — stalling the planet's first paint by seconds. Now
          // only the zone you zoom into builds, when you zoom into it.
          hotspots.push(entry);
          originalMaxTier.set(site.id, maxTier);
        }
      }

      planetMesh.add(group);
      markers.push({ group, siteId: site.id, halo, hoverHalo, labelGroup: label.group });
    }
  }

  return { rebuildMarkers, rebuildOrbitalMarkers };
}
