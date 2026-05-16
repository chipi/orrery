import * as THREE from 'three';

/**
 * Surface Hotspots LOD dispatcher (PRD-014 / RFC-017 ADR-059).
 *
 * Per-frame selection of the right tier for each hotspot marker based
 * on its screen-projected pixel size. Cross-fades between tiers over
 * 600 ms so the swap is not jarring. LRU eviction at a 6-slot ceiling
 * caps GPU resident textures (relevant once Tier 2 patches land in
 * S2 — this S1 release only renders Tier 0 ↔ Tier 1 swap; the Tier
 * 2/3 hooks are present but inert until those slices implement them).
 *
 * Why a manual dispatcher instead of THREE.LOD: we need
 *   - screen-projected pixel size as the LOD metric (not distance),
 *     because the moon scene's camera frustum makes equal-distance
 *     markers project very differently depending on viewport size +
 *     camera pitch.
 *   - cross-fade transitions (THREE.LOD does instant swaps).
 *   - LRU eviction tied to GPU memory budget per ADR-059.
 *
 * Threshold table (screen-projected radius in pixels):
 *   < 20 px  → Tier 0  (silhouette; today's existing marker)
 *   20-120 px → Tier 1 (hand-authored 3D engineering model)
 *   > 120 px → Tier 2 (orbital surface patch; S2 deferred)
 *   ground-level eye-distance → Tier 3 (panorama skybox; Phase 6)
 *
 * Cap target tier at the site's `hotspot_tier_max`. Sites without a
 * sidecar entry default to max = 0 (Tier 0 only — backward compatible
 * with all pre-v0.7 sites).
 */

export interface HotspotEntry {
  /** Site id from moon-sites.json / mars-sites.json. */
  siteId: string;
  /** Maximum tier this site is configured for (from surface-hotspots.json). */
  maxTier: 0 | 1 | 2 | 3;
  /** The marker's wrapper group (positioned + oriented on the planet surface). */
  group: THREE.Group;
  /** The pre-built Tier 0 silhouette (from moon/mars-lander-models). */
  tier0Group: THREE.Group;
  /** Tier 1 engineering model. Built lazily on first promotion to Tier 1. */
  tier1Group?: THREE.Group;
  /** Factory for the Tier 1 model. Called once on first promotion. */
  tier1Builder?: () => THREE.Group;
  /** Tier 2 surface-patch quad. S2 work; unused in S1. */
  tier2Group?: THREE.Group;
  /** Tier 2 factory. S2 work. */
  tier2Builder?: () => THREE.Group;
  /** Tier 3 ground-view skybox marker. Phase 6 work; unused in S1. */
  tier3Group?: THREE.Group;
  /** The currently-displayed tier (post-fade). */
  currentTier: 0 | 1 | 2 | 3;
  /** Cross-fade target — equal to currentTier when not fading. */
  targetTier: 0 | 1 | 2 | 3;
  /** Cross-fade progress, 0..1 (1 = fully on the target tier). */
  fadeProgress: number;
  /** Last time this hotspot was promoted to ≥ Tier 1, for LRU eviction. */
  lastPromotedAt: number;
}

export const HOTSPOT_FADE_MS = 600;
export const HOTSPOT_TIER_THRESHOLDS_PX = {
  tier1Min: 20,
  tier2Min: 120,
} as const;
export const HOTSPOT_LRU_CEILING = 6;

/**
 * HOTSPOTS chip state (PRD-014 / RFC-017 §S7, sub-issue #115).
 *
 *   'auto' — screen-projected pixel size picks the tier (default).
 *   'low'  — every hotspot pinned to Tier 0 silhouette regardless
 *            of zoom. saves GPU memory, mobile data, and matches
 *            the visual restraint preferred by `prefers-reduced-
 *            motion` users.
 *   'high' — every hotspot pinned to its maxTier from sidecar
 *            (typically Tier 2). Triggers eager loading of all
 *            patch textures up to the LRU ceiling. Power-user mode.
 */
export type HotspotMode = 'auto' | 'low' | 'high';

let currentMode: HotspotMode = 'auto';
export function setHotspotMode(mode: HotspotMode): void {
  currentMode = mode;
}
export function getHotspotMode(): HotspotMode {
  return currentMode;
}

/**
 * Project a world-space point's apparent radius (in pixels) on the
 * canvas. Uses the camera's vertical FOV + canvas height to convert
 * a 1-world-unit reference radius to pixel size at the point's
 * distance from the camera. Approximation: assumes perspective camera
 * + canvas centred on the camera's principal axis.
 */
export function projectedPixelRadius(
  worldPos: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
  canvasHeight: number,
  referenceRadiusWorld = 1,
): number {
  const distance = camera.position.distanceTo(worldPos);
  if (distance <= 0) return Infinity;
  // Half-height of the visible plane at this distance, in world units.
  const halfHeightAtDistance = distance * Math.tan((camera.fov * Math.PI) / 360);
  // Pixels per world unit at this distance.
  const pixelsPerWorldUnit = canvasHeight / (2 * halfHeightAtDistance);
  return referenceRadiusWorld * pixelsPerWorldUnit;
}

/**
 * Decide the target tier for a hotspot based on its projected pixel
 * size and the site's configured maximum tier.
 */
export function pickTargetTier(projectedRadiusPx: number, maxTier: 0 | 1 | 2 | 3): 0 | 1 | 2 | 3 {
  let t: 0 | 1 | 2 | 3 = 0;
  if (projectedRadiusPx >= HOTSPOT_TIER_THRESHOLDS_PX.tier2Min) t = 2;
  else if (projectedRadiusPx >= HOTSPOT_TIER_THRESHOLDS_PX.tier1Min) t = 1;
  if (t > maxTier) t = maxTier;
  return t;
}

/**
 * Set per-tier group visibility + opacity to reflect a cross-fade
 * from `currentTier` to `targetTier` at the given progress (0..1).
 * Progress 0 = fully on currentTier; 1 = fully on targetTier.
 */
function applyTierVisuals(entry: HotspotEntry, progress: number): void {
  const tier0 = entry.tier0Group;
  const tier1 = entry.tier1Group;
  const tier2 = entry.tier2Group;
  const tier3 = entry.tier3Group;
  // Off by default; the active tiers below override.
  setGroupOpacity(tier0, 0, false);
  if (tier1) setGroupOpacity(tier1, 0, false);
  if (tier2) setGroupOpacity(tier2, 0, false);
  if (tier3) setGroupOpacity(tier3, 0, false);
  const fromTier = entry.currentTier;
  const toTier = entry.targetTier;
  if (fromTier === toTier) {
    // Stable: just show the active tier solid.
    setGroupForTier(entry, toTier, 1, true);
    return;
  }
  // Cross-fade.
  setGroupForTier(entry, fromTier, 1 - progress, true);
  setGroupForTier(entry, toTier, progress, true);
}

function setGroupForTier(
  entry: HotspotEntry,
  tier: 0 | 1 | 2 | 3,
  opacity: number,
  visible: boolean,
): void {
  const g =
    tier === 0
      ? entry.tier0Group
      : tier === 1
        ? entry.tier1Group
        : tier === 2
          ? entry.tier2Group
          : entry.tier3Group;
  if (!g) return;
  setGroupOpacity(g, opacity, visible);
}

function setGroupOpacity(g: THREE.Group, opacity: number, visible: boolean): void {
  g.visible = visible && opacity > 0.01;
  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const mat = obj.material;
      if (Array.isArray(mat)) {
        for (const m of mat) applyOpacity(m, opacity);
      } else if (mat) {
        applyOpacity(mat as THREE.Material, opacity);
      }
    }
  });
}

function applyOpacity(mat: THREE.Material, opacity: number): void {
  // Opacity < 1 forces transparency; opacity 1 lets the material stay
  // opaque (better depth sort + cheaper). Be defensive about
  // materials that don't have transparent (e.g. ShaderMaterial w/
  // custom transparency).
  if ('opacity' in mat) {
    mat.opacity = opacity;
    mat.transparent = opacity < 0.99;
    mat.needsUpdate = false; // opacity change alone doesn't need full recompile
  }
}

/**
 * Lazy-build a tier mesh if it hasn't been built yet. Called when
 * the dispatcher promotes a hotspot to a higher tier for the first
 * time.
 */
function ensureTierBuilt(entry: HotspotEntry, tier: 0 | 1 | 2 | 3): void {
  if (tier === 1 && !entry.tier1Group && entry.tier1Builder) {
    entry.tier1Group = entry.tier1Builder();
    entry.tier1Group.visible = false;
    // Inherit pickability tagging from the tier0 group so clicks on
    // the tier-1 mesh still resolve to the same site.
    entry.tier1Group.userData = { ...entry.tier1Group.userData, siteId: entry.siteId };
    entry.tier1Group.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
        obj.userData = { ...(obj.userData ?? {}), siteId: entry.siteId };
      }
    });
    entry.group.add(entry.tier1Group);
  }
  if (tier === 2 && !entry.tier2Group && entry.tier2Builder) {
    entry.tier2Group = entry.tier2Builder();
    entry.tier2Group.visible = false;
    entry.group.add(entry.tier2Group);
  }
  // Tier 3 is built by Phase 6 (panorama) — not in S1.
}

/**
 * LRU eviction: when more than HOTSPOT_LRU_CEILING hotspots are at
 * ≥ Tier 1, dispose of the least-recently-promoted ones (only their
 * Tier 1+ assets; Tier 0 silhouette stays intact). Stub in S1
 * (only Apollo 11 is configured); active starting S2 when Tier 2
 * textures arrive and GPU memory budget matters.
 */
function evictLRUIfNeeded(hotspots: HotspotEntry[]): void {
  const promoted = hotspots.filter((h) => h.currentTier > 0 || h.targetTier > 0);
  if (promoted.length <= HOTSPOT_LRU_CEILING) return;
  const sorted = [...promoted].sort((a, b) => a.lastPromotedAt - b.lastPromotedAt);
  const toEvict = sorted.slice(0, promoted.length - HOTSPOT_LRU_CEILING);
  for (const e of toEvict) {
    // Demote to Tier 0, dispose tier1+ assets.
    e.targetTier = 0;
    e.currentTier = 0;
    e.fadeProgress = 1;
    disposeTierGroup(e.tier1Group);
    e.tier1Group = undefined;
    disposeTierGroup(e.tier2Group);
    e.tier2Group = undefined;
    disposeTierGroup(e.tier3Group);
    e.tier3Group = undefined;
    applyTierVisuals(e, 1);
  }
}

function disposeTierGroup(g: THREE.Group | undefined): void {
  if (!g) return;
  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose();
      const mat = obj.material;
      if (Array.isArray(mat)) for (const m of mat) m.dispose();
      else mat?.dispose();
    }
  });
  g.parent?.remove(g);
}

/**
 * Update all hotspots' LOD state for one frame. Call from the RAF
 * loop. `nowMs` is performance.now(); `deltaMs` is the time since
 * the previous frame.
 */
export function updateHotspotLOD(
  hotspots: HotspotEntry[],
  camera: THREE.PerspectiveCamera,
  canvasHeight: number,
  nowMs: number,
  deltaMs: number,
): void {
  for (const h of hotspots) {
    const worldPos = new THREE.Vector3();
    h.group.getWorldPosition(worldPos);
    let desired: 0 | 1 | 2 | 3;
    if (currentMode === 'low') {
      desired = 0;
    } else if (currentMode === 'high') {
      desired = h.maxTier;
    } else {
      const projected = projectedPixelRadius(worldPos, camera, canvasHeight);
      desired = pickTargetTier(projected, h.maxTier);
    }
    if (desired !== h.targetTier) {
      // Start a new transition.
      h.targetTier = desired;
      h.fadeProgress = 0;
      if (desired > 0) {
        h.lastPromotedAt = nowMs;
        ensureTierBuilt(h, desired);
      }
    }
    // Advance fade.
    if (h.currentTier !== h.targetTier) {
      h.fadeProgress = Math.min(1, h.fadeProgress + deltaMs / HOTSPOT_FADE_MS);
      if (h.fadeProgress >= 1) {
        h.currentTier = h.targetTier;
      }
    }
    applyTierVisuals(h, h.fadeProgress);
  }
  evictLRUIfNeeded(hotspots);
}

/**
 * Build a HotspotEntry for a site that participates in the LOD
 * system. The wrapper group is what the caller adds to the scene;
 * tier0Group is the existing silhouette (already built); the
 * tier1Builder is called lazily on first promotion to Tier 1.
 */
export function createHotspotEntry(input: {
  siteId: string;
  maxTier: 0 | 1 | 2 | 3;
  group: THREE.Group;
  tier0Group: THREE.Group;
  tier1Builder?: () => THREE.Group;
  tier2Builder?: () => THREE.Group;
}): HotspotEntry {
  return {
    siteId: input.siteId,
    maxTier: input.maxTier,
    group: input.group,
    tier0Group: input.tier0Group,
    tier1Builder: input.tier1Builder,
    tier2Builder: input.tier2Builder,
    currentTier: 0,
    targetTier: 0,
    fadeProgress: 1,
    lastPromotedAt: 0,
  };
}

/**
 * Resolve a model builder ID (from surface-hotspots.json
 * `hotspot_model` field) to a factory that builds the Tier 1 model
 * for that site. Adds new entries here as new hotspot model builders
 * land (S3 Apollo 12-17, S4 Mars, Phase 7 V3).
 */
export type HotspotModelBuilder = (accentColor: string) => THREE.Group;
const HOTSPOT_MODEL_BUILDERS: Record<string, HotspotModelBuilder> = {};

export function registerHotspotModelBuilder(id: string, builder: HotspotModelBuilder): void {
  HOTSPOT_MODEL_BUILDERS[id] = builder;
}

export function getHotspotModelBuilder(id: string): HotspotModelBuilder | undefined {
  return HOTSPOT_MODEL_BUILDERS[id];
}
