import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { latLonToUnitSphere } from '$lib/moon-projection';
import {
  CONTEXT_SHELL_OFFSET,
  buildContextCap,
  contextBounds,
  contextCapGeometry,
  contextOpacity,
  polarToLatLon,
} from './surface-context';

const MOON_R = 1737.4;
const MARS_R = 3389.5;

describe('contextBounds', () => {
  it('spans km of true ground north–south', () => {
    const b = contextBounds(20.19, 30.77, 400, MOON_R);
    const kmPerDeg = (MOON_R * Math.PI) / 180;
    expect((b.lat_max - b.lat_min) * kmPerDeg).toBeCloseTo(400, 0);
  });

  it('widens in longitude by 1/cos(lat) so the box is km wide on the ground', () => {
    const lat = 60;
    const b = contextBounds(lat, 0, 400, MARS_R);
    const kmPerDeg = (MARS_R * Math.PI) / 180;
    const eastWestKm = (b.lon_max - b.lon_min) * kmPerDeg * Math.cos((lat * Math.PI) / 180);
    expect(eastWestKm).toBeCloseTo(400, 0);
  });

  it('is centred on the site', () => {
    const b = contextBounds(-4.59, 137.44, 400, MARS_R);
    expect((b.lat_min + b.lat_max) / 2).toBeCloseTo(-4.59, 3);
    expect((b.lon_min + b.lon_max) / 2).toBeCloseTo(137.44, 3);
  });

  it('clamps latitude at the poles', () => {
    const b = contextBounds(-89, 0, 400, MOON_R);
    expect(b.lat_min).toBe(-90);
  });
});

describe('contextCapGeometry', () => {
  const b = { lat_min: -2, lat_max: 2, lon_min: 10, lon_max: 16 };
  const r = 30.02;
  const g = contextCapGeometry(b, r, 8);
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv');

  it('puts every vertex on the sphere of the given radius', () => {
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      expect(v.length()).toBeCloseTo(r, 4);
    }
  });

  it('maps the box corners to the same frame as the site markers, with linear UVs', () => {
    // vertex 0 = (lat_min, lon_min) at uv (0,0); last = (lat_max, lon_max) at uv (1,1)
    const first = new THREE.Vector3().fromBufferAttribute(pos, 0);
    const last = new THREE.Vector3().fromBufferAttribute(pos, pos.count - 1);
    const p0 = latLonToUnitSphere(b.lat_min, b.lon_min);
    const p1 = latLonToUnitSphere(b.lat_max, b.lon_max);
    expect(first.x / r).toBeCloseTo(p0.x, 5);
    expect(first.z / r).toBeCloseTo(p0.z, 5);
    expect(last.y / r).toBeCloseTo(p1.y, 5);
    expect([uv.getX(0), uv.getY(0)]).toEqual([0, 0]);
    expect([uv.getX(uv.count - 1), uv.getY(uv.count - 1)]).toEqual([1, 1]);
  });

  it('faces outward (normals point away from the planet centre)', () => {
    const n = g.getAttribute('normal');
    const mid = Math.floor(pos.count / 2);
    const p = new THREE.Vector3().fromBufferAttribute(pos, mid).normalize();
    const nn = new THREE.Vector3().fromBufferAttribute(n, mid).normalize();
    expect(p.dot(nn)).toBeGreaterThan(0.99);
  });

  it('has (segments+1)² vertices and 2·segments² triangles', () => {
    expect(pos.count).toBe(81);
    expect(g.getIndex()!.count).toBe(8 * 8 * 6);
  });
});

describe('polar context (box reaching a pole)', () => {
  const b = contextBounds(-89.5, 0, 400, MOON_R);
  const kmPerDeg = (MOON_R * Math.PI) / 180;

  it('becomes a stereographic square centred on the pole, its cap holding the corners', () => {
    expect(b.polar_half_km).toBe(200);
    expect(b.lat_min).toBe(-90);
    expect([b.lon_min, b.lon_max]).toEqual([-180, 180]);
    expect((b.lat_max + 90) * kmPerDeg).toBeCloseTo(200 * Math.SQRT2, 0);
    // A site whose box stays clear of the pole keeps the lat/lon box.
    expect(contextBounds(-69.37, 32.32, 400, MOON_R).polar_half_km).toBeUndefined();
  });

  it('inverts south polar stereographic: x east of 0°… y toward 0°E', () => {
    const c = polarToLatLon(0, 0, MOON_R, true);
    expect(c.lat).toBe(-90);
    // y > 0 lies on the 0° meridian, x > 0 on 90°E (x = ρ sin λ, y = ρ cos λ).
    const onY = polarToLatLon(0, 100, MOON_R, true);
    expect(onY.lon).toBeCloseTo(0, 6);
    expect((onY.lat + 90) * kmPerDeg).toBeCloseTo(100, 0);
    expect(polarToLatLon(100, 0, MOON_R, true).lon).toBeCloseTo(90, 6);
    expect(polarToLatLon(0, -100, MOON_R, false).lon).toBeCloseTo(0, 6);
  });

  it('builds the cap over the square: on the sphere, outward, corners at uv (0,0) and (1,1)', () => {
    const r = 30.02;
    const g = contextCapGeometry(b, r, 8, MOON_R);
    const pos = g.getAttribute('position');
    const uv = g.getAttribute('uv');
    const n = g.getAttribute('normal');
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i);
      expect(v.length()).toBeCloseTo(r, 4);
      expect(
        v.clone().normalize().dot(new THREE.Vector3().fromBufferAttribute(n, i)),
      ).toBeGreaterThan(0.99);
    }
    const corner = polarToLatLon(-200, -200, MOON_R, true);
    const p0 = latLonToUnitSphere(corner.lat, corner.lon);
    const first = new THREE.Vector3().fromBufferAttribute(pos, 0);
    expect(first.x / r).toBeCloseTo(p0.x, 5);
    expect(first.y / r).toBeCloseTo(p0.y, 5);
    expect(first.z / r).toBeCloseTo(p0.z, 5);
    expect([uv.getX(0), uv.getY(0)]).toEqual([0, 0]);
    expect([uv.getX(uv.count - 1), uv.getY(uv.count - 1)]).toEqual([1, 1]);
    // The grid centre (uv 0.5, 0.5) is the pole itself.
    const mid = new THREE.Vector3().fromBufferAttribute(pos, (pos.count - 1) / 2);
    expect(mid.y / r).toBeCloseTo(-1, 5);
  });
});

describe('contextOpacity', () => {
  it('is 0 far away, 1 close in, linear between', () => {
    expect(contextOpacity(120)).toBe(0);
    expect(contextOpacity(90)).toBe(0);
    expect(contextOpacity(60)).toBe(1);
    expect(contextOpacity(31)).toBe(1);
    expect(contextOpacity(75)).toBeCloseTo(0.5, 6);
  });
});

describe('buildContextCap', () => {
  it('sits just above the planet, transparent until the scene fades it in, tagged for its site', () => {
    vi.spyOn(THREE.TextureLoader.prototype, 'load').mockReturnValue(new THREE.Texture());
    const cap = buildContextCap({
      siteId: 'apollo17',
      textureUrl: '/images/hotspots/moon/apollo17/context.webp',
      bounds: { lat_min: 19, lat_max: 21, lon_min: 30, lon_max: 32 },
      planetRadius: 30,
    });
    const v = new THREE.Vector3().fromBufferAttribute(cap.geometry.getAttribute('position'), 0);
    expect(v.length()).toBeCloseTo(30 + CONTEXT_SHELL_OFFSET, 4);
    const mat = cap.material as THREE.MeshPhongMaterial;
    expect(mat.transparent).toBe(true);
    expect(mat.opacity).toBe(0);
    expect(mat.depthWrite).toBe(false);
    expect(mat.alphaMap).not.toBeNull();
    expect(cap.userData).toEqual({ siteId: 'apollo17', layer: 'context' });
    mat.dispose();
  });

  it('decodes the loaded texture as sRGB, so the cap matches the encoded output', () => {
    const tex = new THREE.Texture() as unknown as THREE.Texture<HTMLImageElement>;
    vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation((_url, onLoad) => {
      onLoad?.(tex);
      return tex;
    });
    const cap = buildContextCap({
      siteId: 'apollo17',
      textureUrl: '/images/hotspots/moon/apollo17/context.webp',
      bounds: { lat_min: 19, lat_max: 21, lon_min: 30, lon_max: 32 },
      planetRadius: 30,
    });
    const mat = cap.material as THREE.MeshPhongMaterial;
    expect(mat.map).toBe(tex);
    expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);
    mat.dispose();
  });
});
