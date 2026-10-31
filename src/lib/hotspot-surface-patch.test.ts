// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  aspectFromRegion,
  buildHotspotSurfacePatch,
  buildRegionalPatch,
  REGIONAL_PATCH_DIAMETER_WORLD_UNITS,
} from './hotspot-surface-patch';
import type { HotspotAnnotation } from '$types/surface-site';

type LoadArgs = {
  url: string;
  onLoad: (t: THREE.Texture) => void;
  onError: (e: unknown) => void;
};
let loads: LoadArgs[] = [];

beforeEach(() => {
  loads = [];
  vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(((
    url: string,
    onLoad: (t: THREE.Texture) => void,
    _p: unknown,
    onError: (e: unknown) => void,
  ) => {
    loads.push({ url, onLoad, onError });
    return new THREE.Texture();
  }) as unknown as typeof THREE.TextureLoader.prototype.load);
});
afterEach(() => vi.restoreAllMocks());

function size(mesh: THREE.Mesh): THREE.Vector3 {
  mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox!.getSize(new THREE.Vector3());
}
function layer(g: THREE.Group, name: string): THREE.Mesh | undefined {
  return g.children.find((c) => c.userData.layer === name) as THREE.Mesh | undefined;
}
const region = { lat_min: 0, lat_max: 1, lon_min: 0, lon_max: 1 };

describe('aspectFromRegion', () => {
  it('is 1 (square) with no region', () => {
    expect(aspectFromRegion(undefined)).toBe(1);
  });

  it('shrinks the longitude extent by cos(centroid latitude)', () => {
    const a = aspectFromRegion({ lat_min: 59, lat_max: 61, lon_min: 0, lon_max: 4 });
    expect(a).toBeCloseTo((4 * Math.cos((60 * Math.PI) / 180)) / 2, 10);
  });

  it('clamps to [0.25, 4]', () => {
    expect(aspectFromRegion({ lat_min: 0, lat_max: 1, lon_min: 0, lon_max: 100 })).toBe(4);
    expect(aspectFromRegion({ lat_min: 0, lat_max: 100, lon_min: 0, lon_max: 1 })).toBe(0.25);
  });

  it('survives a degenerate zero-extent region', () => {
    const a = aspectFromRegion({ lat_min: 5, lat_max: 5, lon_min: 5, lon_max: 5 });
    expect(Number.isFinite(a)).toBe(true);
    expect(a).toBeGreaterThanOrEqual(0.25);
    expect(a).toBeLessThanOrEqual(4);
  });
});

describe('buildRegionalPatch', () => {
  it('is a single flat regional layer carrying the site id', () => {
    const g = buildRegionalPatch({ siteId: 'curiosity' });
    expect(g.userData.siteId).toBe('curiosity');
    expect(g.children).toHaveLength(1);
    const m = layer(g, 'regional')!;
    expect(m.userData.siteId).toBe('curiosity');
    expect(m.position.y).toBe(0.02);
    const s = size(m);
    expect(s.y).toBeCloseTo(0, 8); // laid flat in XZ
    expect(s.x * s.z).toBeCloseTo((Math.PI / 4) * REGIONAL_PATCH_DIAMETER_WORLD_UNITS ** 2, 4);
    expect(loads).toHaveLength(0); // no url -> placeholder, no fetch
  });

  it('uses a placeholder grey material without a texture url', () => {
    const m = layer(buildRegionalPatch({ siteId: 's' }), 'regional')!;
    const mat = m.material as THREE.MeshStandardMaterial;
    expect(mat.map).toBeNull();
    expect(mat.color.getHex()).toBe(0x9a9a90);
    expect(mat.polygonOffsetFactor).toBe(-1);
  });

  it('requests the texture and honours region aspect', () => {
    const g = buildRegionalPatch({
      siteId: 's',
      textureUrl: '/images/hotspots/mars/x/ctx.jpg',
      regionBounds: { lat_min: 0, lat_max: 1, lon_min: 0, lon_max: 2 },
    });
    expect(loads).toHaveLength(1);
    expect(loads[0].url).toContain('/images/hotspots/mars/x/ctx.jpg');
    const s = size(layer(g, 'regional')!);
    expect(s.x / s.z).toBeCloseTo(
      aspectFromRegion({ lat_min: 0, lat_max: 1, lon_min: 0, lon_max: 2 }),
      5,
    );
  });

  it('spins the patch about the normal by orientationDeg', () => {
    const plain = size(
      layer(
        buildRegionalPatch({ siteId: 's', regionBounds: { ...region, lon_max: 3 } }),
        'regional',
      )!,
    );
    const spun = size(
      layer(
        buildRegionalPatch({
          siteId: 's',
          regionBounds: { ...region, lon_max: 3 },
          orientationDeg: 90,
        }),
        'regional',
      )!,
    );
    expect(spun.x).toBeCloseTo(plain.z, 5);
    expect(spun.z).toBeCloseTo(plain.x, 5);
  });
});

describe('buildHotspotSurfacePatch', () => {
  it('without textures builds detail + two invisible pins and no regional', () => {
    const g = buildHotspotSurfacePatch({ siteId: 'apollo-11', accentColor: '#fff' });
    expect(g.userData.siteId).toBe('apollo-11');
    expect(layer(g, 'regional')).toBeUndefined();
    const detail = layer(g, 'detail')!;
    expect(detail.position.y).toBe(0.02);
    const kinds = g.children.map((c) => c.userData.kind).filter(Boolean);
    expect(kinds.sort()).toEqual(['patch-pin', 'patch-pin-halo']);
    for (const c of g.children.filter((c) => c.userData.kind)) {
      expect(c.visible).toBe(false);
      expect(c.userData.siteId).toBe('apollo-11');
    }
    expect(loads).toHaveLength(0);
  });

  it('legacy detail diameter is 1.0u (area of a unit-diameter circle)', () => {
    const s = size(
      layer(buildHotspotSurfacePatch({ siteId: 's', accentColor: '#fff' }), 'detail')!,
    );
    expect(s.x * s.z).toBeCloseTo(Math.PI / 4, 4);
  });

  it('co-scales the detail layer against the regional by ground metres', () => {
    const g = buildHotspotSurfacePatch({
      siteId: 's',
      accentColor: '#fff',
      textureUrl: '/d.jpg',
      regionalTextureUrl: '/r.jpg',
      groundMeters: 1536,
      regionalGroundMeters: 15360,
    });
    const reg = size(layer(g, 'regional')!);
    const det = size(layer(g, 'detail')!);
    // area ratio is the square of the diameter ratio (1/10)^2
    expect((det.x * det.z) / (reg.x * reg.z)).toBeCloseTo(0.01, 4);
    expect(loads.map((l) => l.url).sort()).toEqual([
      expect.stringContaining('/d.jpg'),
      expect.stringContaining('/r.jpg'),
    ]);
    // regional is added first so it renders underneath
    expect(g.children[0].userData.layer).toBe('regional');
  });

  it('patchScale multiplies both layers', () => {
    const base = buildHotspotSurfacePatch({
      siteId: 's',
      accentColor: '#fff',
      regionalTextureUrl: '/r.jpg',
    });
    const half = buildHotspotSurfacePatch({
      siteId: 's',
      accentColor: '#fff',
      regionalTextureUrl: '/r.jpg',
      patchScale: 0.5,
    });
    for (const name of ['regional', 'detail']) {
      expect(size(layer(half, name)!).x).toBeCloseTo(size(layer(base, name)!).x * 0.5, 5);
    }
  });

  it('adds a dot + accent halo per annotation, converting metres to world units, and drops those outside the patch', () => {
    const ann = (id: string, lat: number, lon: number) =>
      ({ id, lat_offset_m: lat, lon_offset_m: lon }) as unknown as HotspotAnnotation;
    const g = buildHotspotSurfacePatch({
      siteId: 's',
      accentColor: '#ff8800',
      groundMeters: 500,
      regionalGroundMeters: 15000,
      annotations: [ann('in', 100, 50), ann('out', 0, 100000)],
    });
    const dots = g.children.filter((c) => c.userData.annotationId === 'in');
    expect(dots).toHaveLength(2);
    expect(g.children.some((c) => c.userData.annotationId === 'out')).toBe(false);
    const detailDiameter = REGIONAL_PATCH_DIAMETER_WORLD_UNITS * (500 / 15000);
    const mToU = detailDiameter / 500;
    const dot = dots[0];
    expect(dot.position.x).toBeCloseTo(50 * mToU, 10); // east = +X
    expect(dot.position.z).toBeCloseTo(-100 * mToU, 10); // north = -Z
    const halo = dots[1] as THREE.Mesh;
    expect((halo.material as THREE.MeshBasicMaterial).color.getHexString()).toBe('ff8800');
  });

  it('assumes a 1 km patch for annotations when groundMeters is absent', () => {
    const g = buildHotspotSurfacePatch({
      siteId: 's',
      accentColor: '#fff',
      annotations: [
        { id: 'a', lat_offset_m: 0, lon_offset_m: 250 } as unknown as HotspotAnnotation,
      ],
    });
    const dot = g.children.find((c) => c.userData.annotationId === 'a')!;
    expect(dot.position.x).toBeCloseTo(250 * (1.0 / 1000), 10);
  });
});

describe('patch texture loading', () => {
  function patchMaterial(): THREE.MeshStandardMaterial {
    const g = buildRegionalPatch({ siteId: 's', textureUrl: '/t.jpg' });
    return layer(g, 'regional')!.material as THREE.MeshStandardMaterial;
  }

  it('binds a loaded texture with clamp wrapping, sRGB and anisotropy', () => {
    const mat = patchMaterial();
    const tex = new THREE.Texture();
    loads[0].onLoad(tex);
    expect(mat.map).toBe(tex);
    expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(tex.wrapS).toBe(THREE.ClampToEdgeWrapping);
    expect(tex.anisotropy).toBe(16);
  });

  it('drops a texture that arrives after the material was disposed', () => {
    const mat = patchMaterial();
    mat.dispose();
    const tex = new THREE.Texture();
    const spy = vi.spyOn(tex, 'dispose');
    loads[0].onLoad(tex);
    expect(spy).toHaveBeenCalled();
    expect(mat.map).toBeNull();
  });

  it('keeps the placeholder when the texture fails to load', () => {
    const mat = patchMaterial();
    expect(() => loads[0].onError(new Error('404'))).not.toThrow();
    expect(mat.map).toBeNull();
  });
});
