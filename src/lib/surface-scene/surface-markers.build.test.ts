// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  createSurfaceMarkers,
  type MarkerObj,
  type SurfaceMarkersContext,
} from './surface-markers';
import { registerHotspotModelBuilder, type HotspotEntry } from '$lib/hotspot-lod-dispatcher';
import { REGIONAL_PATCH_DIAMETER_WORLD_UNITS } from '$lib/hotspot-surface-patch';
import type { OrbiterMarker } from '$lib/three/orbiter-group';
import { azimuthToAlignNorth } from '$lib/three/place-on-sphere';
import { colorFor } from '$lib/surface-map/nation-palette';
import { latLonToUnitSphere } from '$lib/moon-projection';
import type { SurfaceSite, Traverse } from '$types/surface-site';

const R = 30;

let texts: string[] = [];
let loadedUrls: string[] = [];

beforeEach(() => {
  texts = [];
  loadedUrls = [];
  const ctx2d = new Proxy({} as Record<string, unknown>, {
    get(t, p: string) {
      if (p in t) return t[p];
      if (p === 'fillText') return (s: string) => texts.push(s);
      if (p === 'measureText') return (s: string) => ({ width: s.length * 10 });
      return () => undefined;
    },
    set(t, p: string, v) {
      t[p] = v;
      return true;
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx2d as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(((url: string) => {
    loadedUrls.push(url);
    return new THREE.Texture();
  }) as never);
});
afterEach(() => vi.restoreAllMocks());

function site(over: Partial<SurfaceSite> & { id: string }): SurfaceSite {
  return {
    kind: 'surface',
    nation: 'USA',
    agency: 'NASA',
    status: 'ACTIVE',
    ...over,
  } as SurfaceSite;
}

function lander(): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial()));
  return g;
}

function setup(
  over: {
    sites?: SurfaceSite[];
    traverses?: Record<string, Traverse>;
    tier2PatchScale?: number;
  } = {},
) {
  const state = { sites: over.sites ?? [], traverses: over.traverses ?? {} };
  const scene = new THREE.Scene();
  const planetMesh = new THREE.Group();
  scene.add(planetMesh);
  const landerModelBuilder = vi.fn(
    (_id: string, _type: string | undefined, _color: string, _agency: string) => lander(),
  );
  const markers: MarkerObj[] = [];
  const orbitalMarkers: OrbiterMarker[] = [];
  const hotspots: HotspotEntry[] = [];
  const originalMaxTier = new Map<string, 0 | 1 | 2 | 3>();
  const ctx: SurfaceMarkersContext = {
    scene,
    planetMesh,
    planetRadius: R,
    config: {
      landerModelBuilder: landerModelBuilder as never,
      tier2PatchScale: over.tier2PatchScale,
    },
    getSites: () => state.sites,
    getTraverses: () => state.traverses,
    markers,
    orbitalMarkers,
    hotspots,
    originalMaxTier,
  };
  const api = createSurfaceMarkers(ctx);
  return {
    ...api,
    state,
    scene,
    planetMesh,
    landerModelBuilder,
    markers,
    orbitalMarkers,
    hotspots,
    originalMaxTier,
  };
}

describe('rebuildOrbitalMarkers', () => {
  const orbiter = (id: string, altitude_km: number, inclination_deg: number, status = 'ACTIVE') =>
    site({ id, kind: 'orbiter', altitude_km, inclination_deg, status: status as never });

  it('builds a ring + dot per orbiter with log-scaled radius and staggered phase', () => {
    const s = setup({
      sites: [
        site({ id: 'lander', lat: 0, lon: 0 }),
        orbiter('lro', 50, 90),
        orbiter('old', 450, 30, 'ENDED'),
        site({ id: 'incomplete', kind: 'orbiter' }),
      ],
    });
    s.rebuildOrbitalMarkers();
    expect(s.orbitalMarkers.map((o) => o.siteId)).toEqual(['lro', 'old']);
    expect(s.scene.children).toContain(s.orbitalMarkers[0].group);
    const [lro, old] = s.orbitalMarkers;
    expect(lro.ringRadius).toBeCloseTo(R + 4 + Math.log10(2) * 5, 10);
    expect(old.ringRadius).toBeCloseTo(R + 4 + Math.log10(10) * 5, 10);
    expect(lro.inclinationRad).toBeCloseTo(Math.PI / 2, 10);
    expect(old.inclinationRad).toBeCloseTo(Math.PI / 6, 10);
    expect(lro.orbitPhase).toBe(0);
    expect(old.orbitPhase).toBeCloseTo(Math.PI / 5, 10);
    // only the non-ACTIVE one is dimmed (slow)
    expect(lro.orbitSpeed).toBe(0.2);
    expect(old.orbitSpeed).toBe(0.06);
  });

  it('replaces the previous build without leaking groups', () => {
    const s = setup({ sites: [orbiter('lro', 50, 90)] });
    s.rebuildOrbitalMarkers();
    const first = s.orbitalMarkers[0];
    const dispose = vi.spyOn(first.ringMesh.geometry, 'dispose');
    s.rebuildOrbitalMarkers();
    expect(s.orbitalMarkers).toHaveLength(1);
    expect(s.orbitalMarkers[0]).not.toBe(first);
    expect(s.scene.children).not.toContain(first.group);
    expect(s.scene.children.filter((c) => c !== s.planetMesh)).toHaveLength(1);
    expect(dispose).toHaveBeenCalled();
  });
});

describe('rebuildMarkers placement', () => {
  it('skips orbiters and sites without coordinates', () => {
    const s = setup({
      sites: [
        site({ id: 'orb', kind: 'orbiter', altitude_km: 100, inclination_deg: 0 }),
        site({ id: 'nolat', lon: 10 }),
        site({ id: 'ok', lat: 10, lon: 10 }),
      ],
    });
    s.rebuildMarkers();
    expect(s.markers.map((m) => m.siteId)).toEqual(['ok']);
    expect(s.landerModelBuilder).toHaveBeenCalledTimes(1);
  });

  it('anchors each marker on the sphere with local +Y pointing radially outward', () => {
    const s = setup({
      sites: [site({ id: 'a', lat: 26.1, lon: 17.5 }), site({ id: 'b', lat: -45, lon: -120 })],
    });
    s.rebuildMarkers();
    for (const [mk, lat, lon] of [
      [s.markers[0], 26.1, 17.5],
      [s.markers[1], -45, -120],
    ] as const) {
      const u = latLonToUnitSphere(lat, lon);
      const expected = new THREE.Vector3(u.x, u.y, u.z);
      expect(mk.group.parent).toBe(s.planetMesh);
      expect(mk.group.position.distanceTo(expected.clone().multiplyScalar(R))).toBeLessThan(1e-9);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(mk.group.quaternion);
      expect(up.distanceTo(expected)).toBeLessThan(1e-9);
    }
  });

  it('asks the lander builder for the site silhouette with nation colour and agency', () => {
    const s = setup({
      sites: [
        site({ id: 'a', lat: 1, lon: 2, mission_type: 'rover', nation: 'China', agency: 'CNSA' }),
      ],
    });
    s.rebuildMarkers();
    expect(s.landerModelBuilder).toHaveBeenCalledWith(
      'a',
      'rover',
      colorFor({ nation: 'China' }),
      'CNSA',
    );
  });

  it('dims the wreckage of crashed and lost missions only', () => {
    const s = setup({
      sites: [
        site({ id: 'ok', lat: 0, lon: 0 }),
        site({ id: 'crash', lat: 10, lon: 10, status: 'CRASHED' }),
        site({ id: 'lost', lat: 20, lon: 20, status: 'LOST' }),
      ],
    });
    s.rebuildMarkers();
    const opacity = (id: string) => {
      let o = NaN;
      const mk = s.markers.find((m) => m.siteId === id)!;
      mk.group.children[0].traverse((c) => {
        if (c instanceof THREE.Mesh) o = (c.material as THREE.MeshBasicMaterial).opacity;
      });
      return o;
    };
    expect(opacity('ok')).toBe(1);
    expect(opacity('crash')).toBe(0.55);
    expect(opacity('lost')).toBe(0.55);
  });

  it('makes the marker pickable by id through an invisible hit sphere', () => {
    const s = setup({ sites: [site({ id: 'a', lat: 0, lon: 0 })] });
    s.rebuildMarkers();
    const g = s.markers[0].group;
    expect(g.userData.siteId).toBe('a');
    const hit = g.children.find(
      (c) => c instanceof THREE.Mesh && !(c.material as THREE.MeshBasicMaterial).visible,
    );
    expect(hit?.userData.siteId).toBe('a');
  });
});

describe('rebuildMarkers labels', () => {
  it('uses the display name (falling back to the id), uppercased on the sprite', () => {
    const s = setup({
      sites: [
        site({ id: 'a11', name: 'Apollo 11', lat: 0, lon: 0 }),
        site({ id: 'luna-9', lat: 50, lon: 50 }),
      ],
    });
    s.rebuildMarkers();
    expect(texts).toContain('APOLLO 11');
    expect(texts).toContain('LUNA-9');
    expect(s.markers[0].labelGroup?.parent).toBe(s.markers[0].group);
  });

  it('gives a solo site the radial-up offset and splays nearby sites apart', () => {
    const spriteOffset = (mk: MarkerObj) =>
      (
        mk.labelGroup!.children.find((c) => c instanceof THREE.Sprite) as THREE.Sprite
      ).position.toArray();
    const solo = setup({ sites: [site({ id: 'solo', lat: 0, lon: 0 })] });
    solo.rebuildMarkers();
    expect(spriteOffset(solo.markers[0])).toEqual([0, 3.2, 0]);

    const cluster = setup({
      sites: [
        site({ id: 'b', lat: 28.56, lon: -80.57 }),
        site({ id: 'a', lat: 28.58, lon: -80.58 }),
      ],
    });
    cluster.rebuildMarkers();
    const byId = Object.fromEntries(cluster.markers.map((m) => [m.siteId, spriteOffset(m)]));
    expect(byId.a).toEqual([0, 3.2, 0]);
    expect(byId.b).toEqual([2.6, -2, 0]);
  });
});

describe('rebuildMarkers halos', () => {
  const planeSize = (halo: THREE.Object3D) => {
    const fill = halo.children[0] as THREE.Mesh;
    const p = (fill.geometry as THREE.PlaneGeometry).parameters;
    return { w: p.width, h: p.height };
  };

  it('creates hidden selection + hover halos that start invisible', () => {
    const s = setup({ sites: [site({ id: 'a', lat: 0, lon: 0 })] });
    s.rebuildMarkers();
    const mk = s.markers[0];
    expect(mk.halo?.visible).toBe(false);
    expect(mk.hoverHalo?.visible).toBe(false);
    expect(mk.hoverHalo?.position.y).toBe(0.02);
  });

  it('sizes the bracket to the outermost visible patch (0.93 of its radius)', () => {
    const regional = setup({
      sites: [site({ id: 'r', lat: 0, lon: 0, hotspot_tier2_regional_source: '/img/ctx.jpg' })],
    });
    regional.rebuildMarkers();
    const { w, h } = planeSize(regional.markers[0].halo!);
    const radius = (REGIONAL_PATCH_DIAMETER_WORLD_UNITS * 0.93) / 2;
    expect(w * h).toBeCloseTo(Math.PI * radius * radius, 4);

    const detailOnly = setup({
      sites: [
        site({
          id: 'd',
          lat: 0,
          lon: 0,
          hotspot_tier2_ground_m: 512,
          hotspot_tier2_regional_ground_m: 15360,
        }),
      ],
    });
    detailOnly.rebuildMarkers();
    const dim = planeSize(detailOnly.markers[0].halo!);
    const detailRadius = (REGIONAL_PATCH_DIAMETER_WORLD_UNITS * (512 / 15360) * 0.93) / 2;
    expect(dim.w * dim.h).toBeCloseTo(Math.PI * detailRadius * detailRadius, 5);
  });

  it('applies tier2PatchScale to the halo size', () => {
    const half = setup({
      tier2PatchScale: 0.5,
      sites: [site({ id: 'r', lat: 0, lon: 0, hotspot_tier2_regional_source: '/img/ctx.jpg' })],
    });
    half.rebuildMarkers();
    const { w, h } = planeSize(half.markers[0].halo!);
    const radius = (REGIONAL_PATCH_DIAMETER_WORLD_UNITS * 0.5 * 0.93) / 2;
    expect(w * h).toBeCloseTo(Math.PI * radius * radius, 4);
  });

  it('matches the region aspect and spins the brackets to geographic north', () => {
    const rb = { lat_min: 10, lat_max: 12, lon_min: 20, lon_max: 24 };
    const s = setup({ sites: [site({ id: 'a', lat: 11, lon: 22, region_bounds: rb })] });
    s.rebuildMarkers();
    const mk = s.markers[0];
    const { w, h } = planeSize(mk.halo!);
    expect(w / h).toBeCloseTo((4 * Math.cos((11 * Math.PI) / 180)) / 2, 4);
    const az = azimuthToAlignNorth(11, 22, mk.group.quaternion);
    expect(Math.abs(az)).toBeGreaterThan(1e-6);
    const spin = mk.halo!.parent!;
    expect(spin).not.toBe(mk.group);
    expect(spin.parent).toBe(mk.group);
    expect(spin.rotation.y).toBeCloseTo((az * Math.PI) / 180, 10);
    // hover halo is a bracket set for region sites, a disc + ring otherwise
    expect(mk.hoverHalo!.children.some((c) => c instanceof THREE.LineSegments)).toBe(true);
  });
});

describe('rebuildMarkers hotspot LOD enrolment', () => {
  beforeEach(() => {
    registerHotspotModelBuilder('test-model', (accent) => {
      const g = lander();
      g.userData.accent = accent;
      return g;
    });
  });

  const hot = (over: Partial<SurfaceSite> = {}) =>
    site({
      id: 'h',
      lat: 5,
      lon: 5,
      hotspot_tier_max: 2,
      hotspot_model: 'test-model',
      hotspot_tier2_source: '/images/hotspots/moon/h/tier2.jpg',
      ...over,
    });

  it('enrols a tier>=1 site with a registered model and records its original max tier', () => {
    const s = setup({ sites: [hot()] });
    s.rebuildMarkers();
    expect(s.hotspots).toHaveLength(1);
    const e = s.hotspots[0];
    expect(e.siteId).toBe('h');
    expect(e.maxTier).toBe(2);
    expect(e.group).toBe(s.markers[0].group);
    expect(e.tier0Group).toBe(s.markers[0].group.children[0]);
    expect(s.originalMaxTier.get('h')).toBe(2);
    expect(e.tier1Builder!().userData.accent).toBe(colorFor({ nation: 'USA' }));
    expect(e.tier2Builder).toBeTypeOf('function');
  });

  it('does not enrol tier-0 sites, sites without a model, or unregistered model ids', () => {
    const s = setup({
      sites: [
        hot({ id: 't0', hotspot_tier_max: 0 }),
        hot({ id: 'nomodel', hotspot_model: undefined }),
        hot({ id: 'unknown', hotspot_model: 'never-registered' }),
      ],
    });
    s.rebuildMarkers();
    expect(s.hotspots).toHaveLength(0);
    expect(s.originalMaxTier.size).toBe(0);
    expect(s.markers).toHaveLength(3);
  });

  it('wires Tier 2 only when maxTier >= 2 and a tier-2 source exists', () => {
    const s = setup({
      sites: [
        hot({ id: 'one', hotspot_tier_max: 1 }),
        hot({ id: 'nosrc', hotspot_tier2_source: undefined, lat: 40 }),
      ],
    });
    s.rebuildMarkers();
    expect(s.hotspots.map((h) => h.tier2Builder)).toEqual([undefined, undefined]);
  });

  it('builds the Tier 2 patch lazily from the 1x1 tile variant, with the regional layer when declared', () => {
    const s = setup({
      sites: [
        hot({
          hotspot_tier2_regional_source: '/images/hotspots/moon/h/regional.jpg',
          hotspot_tier2_ground_m: 500,
          hotspot_tier2_regional_ground_m: 15000,
        }),
      ],
    });
    s.rebuildMarkers();
    expect(loadedUrls).toHaveLength(0); // lazy: nothing fetched on rebuild
    const patch = s.hotspots[0].tier2Builder!();
    expect(loadedUrls).toHaveLength(2);
    expect(loadedUrls.some((u) => u.includes('/images/hotspots/moon/h/tier2.1x1.jpg'))).toBe(true);
    expect(loadedUrls.some((u) => u.includes('/images/hotspots/moon/h/regional.1x1.jpg'))).toBe(
      true,
    );
    expect(patch.userData.siteId).toBe('h');
    expect(patch.children.map((c) => c.userData.layer).filter(Boolean)).toEqual([
      'regional',
      'detail',
    ]);
  });

  it('skips the landing regional for a Mars traverse that tiles route patches, keeps it otherwise', () => {
    const regional = '/images/hotspots/mars/h/ctx.jpg';
    const withPatches = setup({
      sites: [hot({ hotspot_tier2_regional_source: regional })],
      traverses: { h: { rover_id: 'h', route_patches: [{ id: 'p' }] } as unknown as Traverse },
    });
    withPatches.rebuildMarkers();
    const p1 = withPatches.hotspots[0].tier2Builder!();
    expect(p1.children.some((c) => c.userData.layer === 'regional')).toBe(false);

    const noPatches = setup({
      sites: [hot({ hotspot_tier2_regional_source: regional })],
      traverses: { h: { rover_id: 'h' } as unknown as Traverse },
    });
    noPatches.rebuildMarkers();
    const p2 = noPatches.hotspots[0].tier2Builder!();
    expect(p2.children.some((c) => c.userData.layer === 'regional')).toBe(true);
  });

  it('passes the stylization scale and north azimuth through to the patch', () => {
    const rb = { lat_min: 4, lat_max: 6, lon_min: 4, lon_max: 6 };
    const full = setup({ sites: [hot({ region_bounds: rb })] });
    const half = setup({ sites: [hot({ region_bounds: rb })], tier2PatchScale: 0.5 });
    full.rebuildMarkers();
    half.rebuildMarkers();
    const size = (g: THREE.Group) => {
      const d = g.children.find((c) => c.userData.layer === 'detail') as THREE.Mesh;
      d.geometry.computeBoundingBox();
      const v = d.geometry.boundingBox!.getSize(new THREE.Vector3());
      return v.x * v.z;
    };
    // detail area scales with the square of the patch scale
    expect(
      size(half.hotspots[0].tier2Builder!()) / size(full.hotspots[0].tier2Builder!()),
    ).toBeCloseTo(0.25, 4);
  });
});

describe('rebuildMarkers teardown', () => {
  it('replaces the previous markers and hotspot entries, disposing the old meshes', () => {
    registerHotspotModelBuilder('test-model', () => lander());
    const s = setup({
      sites: [
        site({ id: 'a', lat: 0, lon: 0, hotspot_tier_max: 1, hotspot_model: 'test-model' }),
        site({ id: 'b', lat: 40, lon: 40 }),
      ],
    });
    s.rebuildMarkers();
    const old = [...s.markers];
    const oldGroupChildren = s.planetMesh.children.length;
    const spies = old.map((mk) => {
      let geo: THREE.BufferGeometry | undefined;
      mk.group.traverse((o) => {
        if (!geo && o instanceof THREE.Mesh) geo = o.geometry;
      });
      return vi.spyOn(geo!, 'dispose');
    });
    s.rebuildMarkers();
    expect(s.markers).toHaveLength(2);
    expect(s.hotspots).toHaveLength(1);
    expect(s.planetMesh.children).toHaveLength(oldGroupChildren);
    for (const mk of old) expect(s.planetMesh.children).not.toContain(mk.group);
    for (const spy of spies) expect(spy).toHaveBeenCalled();
  });

  it('removes markers for sites that have gone away', () => {
    const s = setup({
      sites: [site({ id: 'a', lat: 0, lon: 0 }), site({ id: 'b', lat: 1, lon: 1 })],
    });
    s.rebuildMarkers();
    s.state.sites = [site({ id: 'a', lat: 0, lon: 0 })];
    s.rebuildMarkers();
    expect(s.markers.map((m) => m.siteId)).toEqual(['a']);
    expect(s.planetMesh.children).toHaveLength(1);
  });
});
