import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  createHotspotEntry,
  HOTSPOT_FADE_MS,
  HOTSPOT_LRU_CEILING,
  setHotspotMode,
  updateHotspotLOD,
  type HotspotEntry,
} from './hotspot-lod-dispatcher';

// Camera on +Z looking at the origin; fov 50 and a 1000 px canvas give
// projected radius ≈ 1072 / distance, so these distances land in each band.
const CANVAS_H = 1000;
const D_TIER0 = 100; // ≈ 10.7 px  (< 20)
const D_TIER1 = 20; //  ≈ 53.6 px  (20..120)
const D_TIER2 = 5; //   ≈ 214 px   (>= 120)

function cameraAt(distance: number): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  cam.position.set(0, 0, distance);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld(true);
  return cam;
}

function solidGroup(): THREE.Group {
  const g = new THREE.Group();
  g.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ opacity: 1, transparent: false }),
    ),
  );
  return g;
}

function opacityOf(g: THREE.Group): number {
  let o = NaN;
  g.traverse((obj) => {
    if (obj instanceof THREE.Mesh) o = (obj.material as THREE.MeshBasicMaterial).opacity;
  });
  return o;
}

function makeEntry(
  siteId: string,
  maxTier: 0 | 1 | 2 | 3,
  builders: { t1?: () => THREE.Group; t2?: () => THREE.Group } = {},
): HotspotEntry {
  const group = new THREE.Group();
  const tier0Group = solidGroup();
  group.add(tier0Group);
  return createHotspotEntry({
    siteId,
    maxTier,
    group,
    tier0Group,
    tier1Builder: builders.t1,
    tier2Builder: builders.t2,
  });
}

afterEach(() => setHotspotMode('auto'));

describe('updateHotspotLOD (auto mode)', () => {
  it('keeps a far hotspot on Tier 0 and builds nothing', () => {
    const t1 = vi.fn(solidGroup);
    const t2 = vi.fn(solidGroup);
    const e = makeEntry('far', 2, { t1, t2 });
    updateHotspotLOD([e], cameraAt(D_TIER0), CANVAS_H, 1000, 16);
    expect(e.targetTier).toBe(0);
    expect(e.currentTier).toBe(0);
    expect(t1).not.toHaveBeenCalled();
    expect(t2).not.toHaveBeenCalled();
    expect(e.tier0Group.visible).toBe(true);
    expect(opacityOf(e.tier0Group)).toBe(1);
  });

  it('lazily builds Tier 1 on first promotion and tags every mesh with the siteId', () => {
    const t1 = vi.fn(solidGroup);
    const e = makeEntry('apollo-11', 2, { t1 });
    updateHotspotLOD([e], cameraAt(D_TIER1), CANVAS_H, 5000, 0);
    expect(t1).toHaveBeenCalledTimes(1);
    expect(e.targetTier).toBe(1);
    expect(e.lastPromotedAt).toBe(5000);
    expect(e.tier1Group?.parent).toBe(e.group);
    expect(e.tier1Group?.userData.siteId).toBe('apollo-11');
    e.tier1Group!.traverse((o) => {
      if (o instanceof THREE.Mesh) expect(o.userData.siteId).toBe('apollo-11');
    });
    // A second frame at the same tier must not rebuild.
    updateHotspotLOD([e], cameraAt(D_TIER1), CANVAS_H, 5016, 16);
    expect(t1).toHaveBeenCalledTimes(1);
  });

  it('cross-fades 0 -> 2 over HOTSPOT_FADE_MS with eased opacities', () => {
    const e = makeEntry('mars', 2, { t2: solidGroup });
    const cam = cameraAt(D_TIER2);
    updateHotspotLOD([e], cam, CANVAS_H, 0, 0);
    expect(e.targetTier).toBe(2);
    expect(e.fadeProgress).toBe(0);
    expect(e.tier2Group?.parent).toBe(e.group);
    // progress 0: still fully tier 0
    expect(opacityOf(e.tier0Group)).toBe(1);
    expect(e.tier2Group!.visible).toBe(false);

    // halfway: ease-in-out of 0.5 is exactly 0.5 on both sides
    updateHotspotLOD([e], cam, CANVAS_H, 16, HOTSPOT_FADE_MS / 2);
    expect(e.currentTier).toBe(0);
    expect(e.fadeProgress).toBeCloseTo(0.5, 10);
    expect(opacityOf(e.tier0Group)).toBeCloseTo(0.5, 10);
    expect(opacityOf(e.tier2Group!)).toBeCloseTo(0.5, 10);
    const mat = (e.tier2Group!.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
    expect(mat.transparent).toBe(true);

    // quarter-way eased value is 4t^3 = 0.0625 (first-half branch)
    const e2 = makeEntry('q', 2, { t2: solidGroup });
    updateHotspotLOD([e2], cam, CANVAS_H, 0, 0);
    updateHotspotLOD([e2], cam, CANVAS_H, 1, HOTSPOT_FADE_MS / 4);
    expect(opacityOf(e2.tier2Group!)).toBeCloseTo(4 * 0.25 ** 3, 10);

    // done: tier 2 solid, tier 0 hidden
    updateHotspotLOD([e], cam, CANVAS_H, 32, HOTSPOT_FADE_MS);
    expect(e.currentTier).toBe(2);
    expect(e.fadeProgress).toBe(1);
    expect(e.tier0Group.visible).toBe(false);
    expect(e.tier2Group!.visible).toBe(true);
    expect(opacityOf(e.tier2Group!)).toBe(1);
    expect(mat.transparent).toBe(false);
  });

  it('caps the target tier at the site maxTier', () => {
    const t2 = vi.fn(solidGroup);
    const e = makeEntry('capped', 1, { t1: solidGroup, t2 });
    updateHotspotLOD([e], cameraAt(D_TIER2), CANVAS_H, 0, 0);
    expect(e.targetTier).toBe(1);
    expect(t2).not.toHaveBeenCalled();
  });

  it('demotes back to Tier 0 when the camera pulls away and keeps the built group', () => {
    const e = makeEntry('back', 2, { t1: solidGroup });
    updateHotspotLOD([e], cameraAt(D_TIER1), CANVAS_H, 0, 0);
    updateHotspotLOD([e], cameraAt(D_TIER1), CANVAS_H, 1, HOTSPOT_FADE_MS);
    expect(e.currentTier).toBe(1);
    updateHotspotLOD([e], cameraAt(D_TIER0), CANVAS_H, 2, 0);
    expect(e.targetTier).toBe(0);
    expect(e.fadeProgress).toBe(0);
    updateHotspotLOD([e], cameraAt(D_TIER0), CANVAS_H, 3, HOTSPOT_FADE_MS);
    expect(e.currentTier).toBe(0);
    expect(e.tier0Group.visible).toBe(true);
    expect(e.tier1Group!.visible).toBe(false);
  });
});

describe('updateHotspotLOD (forced modes)', () => {
  it("'low' pins every hotspot to Tier 0 even when zoomed in", () => {
    setHotspotMode('low');
    const t2 = vi.fn(solidGroup);
    const e = makeEntry('low', 2, { t2 });
    updateHotspotLOD([e], cameraAt(D_TIER2), CANVAS_H, 0, 16);
    expect(e.targetTier).toBe(0);
    expect(t2).not.toHaveBeenCalled();
  });

  it("'high' promotes to maxTier but never past Tier 2", () => {
    setHotspotMode('high');
    const far = cameraAt(D_TIER0);
    const showcase = makeEntry('showcase', 3, { t2: solidGroup });
    const one = makeEntry('one', 1, { t1: solidGroup });
    const zero = makeEntry('zero', 0);
    updateHotspotLOD([showcase, one, zero], far, CANVAS_H, 0, 0);
    expect(showcase.targetTier).toBe(2);
    expect(one.targetTier).toBe(1);
    expect(zero.targetTier).toBe(0);
  });

  it("'high' bypasses the LRU ceiling", () => {
    setHotspotMode('high');
    const many = Array.from({ length: HOTSPOT_LRU_CEILING + 3 }, (_, i) =>
      makeEntry(`h${i}`, 2, { t2: solidGroup }),
    );
    updateHotspotLOD(many, cameraAt(D_TIER0), CANVAS_H, 0, HOTSPOT_FADE_MS);
    updateHotspotLOD(many, cameraAt(D_TIER0), CANVAS_H, 1, HOTSPOT_FADE_MS);
    expect(many.every((h) => h.currentTier === 2 && h.tier2Group)).toBe(true);
  });
});

describe('updateHotspotLOD LRU eviction', () => {
  it('demotes and disposes the least-recently-promoted hotspots over the ceiling', () => {
    const cam = cameraAt(D_TIER2);
    const total = HOTSPOT_LRU_CEILING + 2;
    const hs = Array.from({ length: total }, (_, i) => makeEntry(`h${i}`, 2, { t2: solidGroup }));
    // Promote one at a time so each gets a distinct, increasing lastPromotedAt.
    hs.forEach((h, i) => updateHotspotLOD([h], cam, CANVAS_H, i + 1, HOTSPOT_FADE_MS));
    expect(hs.every((h) => h.currentTier === 2)).toBe(true);

    const oldestGeo = (hs[0].tier2Group!.children[0] as THREE.Mesh).geometry;
    const disposeSpy = vi.spyOn(oldestGeo, 'dispose');
    const oldestTier2 = hs[0].tier2Group!;

    updateHotspotLOD(hs, cam, CANVAS_H, 1000, 0);

    for (const evicted of [hs[0], hs[1]]) {
      expect(evicted.currentTier).toBe(0);
      expect(evicted.targetTier).toBe(0);
      expect(evicted.tier2Group).toBeUndefined();
      expect(evicted.tier0Group.visible).toBe(true);
    }
    expect(disposeSpy).toHaveBeenCalled();
    expect(oldestTier2.parent).toBeNull();
    for (const kept of hs.slice(2)) {
      expect(kept.currentTier).toBe(2);
      expect(kept.tier2Group).toBeDefined();
    }
  });

  it('does nothing when the promoted count is at or below the ceiling', () => {
    const cam = cameraAt(D_TIER2);
    const hs = Array.from({ length: HOTSPOT_LRU_CEILING }, (_, i) =>
      makeEntry(`h${i}`, 2, { t2: solidGroup }),
    );
    updateHotspotLOD(hs, cam, CANVAS_H, 1, HOTSPOT_FADE_MS);
    updateHotspotLOD(hs, cam, CANVAS_H, 2, 0);
    expect(hs.every((h) => h.currentTier === 2 && h.tier2Group)).toBe(true);
  });
});
