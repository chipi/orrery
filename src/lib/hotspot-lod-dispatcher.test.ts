/**
 * Tests for the PURE exported helpers in hotspot-lod-dispatcher.ts.
 *
 * updateHotspotLOD is excluded: it needs a live THREE.PerspectiveCamera
 * with a working world-matrix stack (getWorldPosition depends on the
 * object3d matrixWorld being up-to-date, which normally happens inside a
 * renderer tick). Faking that correctly would duplicate the renderer
 * lifecycle and add no regression signal beyond what the pure functions
 * below already cover.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  pickTargetTier,
  projectedPixelRadius,
  createHotspotEntry,
  setHotspotMode,
  getHotspotMode,
  registerHotspotModelBuilder,
  getHotspotModelBuilder,
  HOTSPOT_FADE_MS,
  HOTSPOT_TIER_THRESHOLDS_PX,
  HOTSPOT_LRU_CEILING,
} from './hotspot-lod-dispatcher';
import * as THREE from 'three';

// ─── exported constants ───────────────────────────────────────────────────────

describe('exported constants', () => {
  it('HOTSPOT_FADE_MS is 600', () => {
    expect(HOTSPOT_FADE_MS).toBe(600);
  });

  it('HOTSPOT_TIER_THRESHOLDS_PX has tier1Min=20 and tier2Min=120', () => {
    expect(HOTSPOT_TIER_THRESHOLDS_PX.tier1Min).toBe(20);
    expect(HOTSPOT_TIER_THRESHOLDS_PX.tier2Min).toBe(120);
  });

  it('HOTSPOT_LRU_CEILING is 28', () => {
    expect(HOTSPOT_LRU_CEILING).toBe(28);
  });
});

// ─── setHotspotMode / getHotspotMode ─────────────────────────────────────────

describe('setHotspotMode / getHotspotMode', () => {
  afterEach(() => {
    // Restore the default so other tests don't inherit a changed mode.
    setHotspotMode('auto');
  });

  it('defaults to auto', () => {
    expect(getHotspotMode()).toBe('auto');
  });

  it('round-trips all three modes', () => {
    for (const mode of ['auto', 'low', 'high'] as const) {
      setHotspotMode(mode);
      expect(getHotspotMode()).toBe(mode);
    }
  });
});

// ─── pickTargetTier ───────────────────────────────────────────────────────────

describe('pickTargetTier', () => {
  it('returns Tier 0 for projectedRadius < tier1Min (20)', () => {
    expect(pickTargetTier(0, 3)).toBe(0);
    expect(pickTargetTier(10, 3)).toBe(0);
    expect(pickTargetTier(19.9, 3)).toBe(0);
  });

  it('returns Tier 1 at tier1Min threshold (20)', () => {
    expect(pickTargetTier(20, 3)).toBe(1);
    expect(pickTargetTier(50, 3)).toBe(1);
    expect(pickTargetTier(119.9, 3)).toBe(1);
  });

  it('returns Tier 2 at tier2Min threshold (120)', () => {
    expect(pickTargetTier(120, 3)).toBe(2);
    expect(pickTargetTier(500, 3)).toBe(2);
  });

  it('caps at maxTier — Tier 1 site never gets promoted to Tier 2', () => {
    expect(pickTargetTier(200, 1)).toBe(1);
  });

  it('caps at maxTier 0 regardless of projected radius', () => {
    expect(pickTargetTier(200, 0)).toBe(0);
    expect(pickTargetTier(500, 0)).toBe(0);
  });

  it('caps at maxTier 2 even when projected radius would give Tier 2', () => {
    expect(pickTargetTier(150, 2)).toBe(2);
  });

  it('at exactly tier1Min with maxTier=0 → Tier 0', () => {
    expect(pickTargetTier(20, 0)).toBe(0);
  });

  it('at exactly tier2Min with maxTier=1 → Tier 1 (capped)', () => {
    expect(pickTargetTier(120, 1)).toBe(1);
  });
});

// ─── projectedPixelRadius ─────────────────────────────────────────────────────

describe('projectedPixelRadius', () => {
  function makeCamera(fovDeg: number, position: [number, number, number]): THREE.PerspectiveCamera {
    const cam = new THREE.PerspectiveCamera(fovDeg, 1, 0.1, 10000);
    cam.position.set(...position);
    cam.updateMatrixWorld();
    return cam;
  }

  it('returns Infinity when camera is at the world position', () => {
    const cam = makeCamera(60, [0, 0, 0]);
    const pos = new THREE.Vector3(0, 0, 0);
    expect(projectedPixelRadius(pos, cam, 800)).toBe(Infinity);
  });

  it('returns a positive number for a point at a finite distance', () => {
    const cam = makeCamera(60, [0, 0, 10]);
    const pos = new THREE.Vector3(0, 0, 0);
    const r = projectedPixelRadius(pos, cam, 800);
    expect(r).toBeGreaterThan(0);
    expect(isFinite(r)).toBe(true);
  });

  it('pixel radius doubles when canvas height doubles (same FOV + distance)', () => {
    const cam = makeCamera(60, [0, 0, 10]);
    const pos = new THREE.Vector3(0, 0, 0);
    const r1 = projectedPixelRadius(pos, cam, 400);
    const r2 = projectedPixelRadius(pos, cam, 800);
    expect(r2).toBeCloseTo(r1 * 2, 5);
  });

  it('pixel radius halves when distance doubles (same canvas + FOV)', () => {
    const cam1 = makeCamera(60, [0, 0, 10]);
    const cam2 = makeCamera(60, [0, 0, 20]);
    const pos = new THREE.Vector3(0, 0, 0);
    const r1 = projectedPixelRadius(pos, cam1, 800);
    const r2 = projectedPixelRadius(pos, cam2, 800);
    expect(r1).toBeCloseTo(r2 * 2, 5);
  });

  it('scales linearly with referenceRadiusWorld', () => {
    const cam = makeCamera(60, [0, 0, 10]);
    const pos = new THREE.Vector3(0, 0, 0);
    const r1 = projectedPixelRadius(pos, cam, 800, 1);
    const r3 = projectedPixelRadius(pos, cam, 800, 3);
    expect(r3).toBeCloseTo(r1 * 3, 5);
  });

  it('narrows when FOV narrows (telephoto → larger projected radius)', () => {
    // Narrower FOV = more zoom = larger projected radius for same distance
    const camWide = makeCamera(90, [0, 0, 10]);
    const camTele = makeCamera(30, [0, 0, 10]);
    const pos = new THREE.Vector3(0, 0, 0);
    const rWide = projectedPixelRadius(pos, camWide, 800);
    const rTele = projectedPixelRadius(pos, camTele, 800);
    expect(rTele).toBeGreaterThan(rWide);
  });
});

// ─── createHotspotEntry ───────────────────────────────────────────────────────

describe('createHotspotEntry', () => {
  it('returns an entry with sane defaults', () => {
    const group = new THREE.Group();
    const tier0 = new THREE.Group();
    const entry = createHotspotEntry({
      siteId: 'apollo11',
      maxTier: 1,
      group,
      tier0Group: tier0,
    });

    expect(entry.siteId).toBe('apollo11');
    expect(entry.maxTier).toBe(1);
    expect(entry.group).toBe(group);
    expect(entry.tier0Group).toBe(tier0);
    expect(entry.currentTier).toBe(0);
    expect(entry.targetTier).toBe(0);
    expect(entry.fadeProgress).toBe(1);
    expect(entry.lastPromotedAt).toBe(0);
    expect(entry.tier1Group).toBeUndefined();
    expect(entry.tier2Group).toBeUndefined();
    expect(entry.tier3Group).toBeUndefined();
  });

  it('stores tier1Builder + tier2Builder factories', () => {
    const tier1Builder = () => new THREE.Group();
    const tier2Builder = () => new THREE.Group();
    const entry = createHotspotEntry({
      siteId: 'jezero',
      maxTier: 2,
      group: new THREE.Group(),
      tier0Group: new THREE.Group(),
      tier1Builder,
      tier2Builder,
    });
    expect(entry.tier1Builder).toBe(tier1Builder);
    expect(entry.tier2Builder).toBe(tier2Builder);
  });

  it('accepts maxTier values 0-3', () => {
    for (const tier of [0, 1, 2, 3] as const) {
      const e = createHotspotEntry({
        siteId: 'x',
        maxTier: tier,
        group: new THREE.Group(),
        tier0Group: new THREE.Group(),
      });
      expect(e.maxTier).toBe(tier);
    }
  });
});

// ─── registerHotspotModelBuilder / getHotspotModelBuilder ────────────────────

describe('registerHotspotModelBuilder / getHotspotModelBuilder', () => {
  it('returns undefined for an unknown id', () => {
    expect(getHotspotModelBuilder('__nonexistent__')).toBeUndefined();
  });

  it('stores and retrieves a builder by id', () => {
    const builder = (_accentColor: string) => new THREE.Group();
    registerHotspotModelBuilder('test-lander', builder);
    expect(getHotspotModelBuilder('test-lander')).toBe(builder);
  });

  it('overwrites a previous registration for the same id', () => {
    const b1 = (_c: string) => new THREE.Group();
    const b2 = (_c: string) => new THREE.Group();
    registerHotspotModelBuilder('overwrite-test', b1);
    registerHotspotModelBuilder('overwrite-test', b2);
    expect(getHotspotModelBuilder('overwrite-test')).toBe(b2);
  });

  it('the stored builder can be called and returns a Group', () => {
    const builder = (_c: string) => {
      const g = new THREE.Group();
      g.name = 'built';
      return g;
    };
    registerHotspotModelBuilder('callable-test', builder);
    const fn = getHotspotModelBuilder('callable-test')!;
    const group = fn('#ff0000');
    expect(group).toBeInstanceOf(THREE.Group);
    expect(group.name).toBe('built');
  });
});
