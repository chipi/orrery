import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createSurfacePicking, type SurfacePickingContext } from './surface-picking';

function target(userData: Record<string, unknown>, z = 0): THREE.Group {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 8, 8),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  );
  mesh.userData = userData;
  group.add(mesh);
  group.position.set(0, 0, z);
  group.updateMatrixWorld(true);
  return group;
}

function makeCtx(over: Partial<SurfacePickingContext> = {}) {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const el3d = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }),
  } as unknown as HTMLElement;
  const calls = {
    site: vi.fn(),
    museum: vi.fn(),
    observatory: vi.fn(),
    sat: vi.fn(),
    annotation: vi.fn(),
  };
  const ctx: SurfacePickingContext = {
    el3d,
    camera,
    markers: [],
    orbitalMarkers: [],
    traverseLines: [],
    hotspots: [],
    getSites: () => [],
    getPadsOn: () => true,
    getLayerOrbiters: () => true,
    getEarthSats: () => [],
    getMuseumsOn: () => true,
    getMuseumPins: () => [],
    getTelescopesOn: () => true,
    getObservatoryPins: () => [],
    getPanoramaActive: () => false,
    getPanoramaSkybox: () => null,
    getEarthObjects: () => [],
    onPanoramaAnnotation: calls.annotation,
    onSatPicked: calls.sat,
    onObservatoryPicked: calls.observatory,
    onMuseumPicked: calls.museum,
    onSitePicked: calls.site,
    ...over,
  };
  return { ctx, calls };
}

// Screen centre of the 200x200 element.
const CX = 100;
const CY = 100;

describe('pickSiteAt', () => {
  it('returns the siteId of the marker under the pointer', () => {
    const { ctx } = makeCtx({ markers: [{ group: target({ siteId: 'apollo-11' }) }] });
    expect(createSurfacePicking(ctx).pickSiteAt(CX, CY)).toBe('apollo-11');
  });

  it('returns null when the pointer misses', () => {
    const { ctx } = makeCtx({ markers: [{ group: target({ siteId: 'apollo-11' }) }] });
    expect(createSurfacePicking(ctx).pickSiteAt(5, 5)).toBeNull();
  });

  it('ignores surface markers while the launchpads layer is off, reading the flag at call time', () => {
    let padsOn = false;
    const { ctx } = makeCtx({
      markers: [{ group: target({ siteId: 'apollo-11' }) }],
      getPadsOn: () => padsOn,
    });
    const picking = createSurfacePicking(ctx);
    expect(picking.pickSiteAt(CX, CY)).toBeNull();
    padsOn = true;
    expect(picking.pickSiteAt(CX, CY)).toBe('apollo-11');
  });
});

describe('pickMuseumAt / pickObservatoryAt', () => {
  it('pick museum pins only while the museums layer is on', () => {
    let on = false;
    const pin = { group: target({ museumId: 'louvre' }) };
    const { ctx } = makeCtx({
      getMuseumPins: () => [pin] as never,
      getMuseumsOn: () => on,
    });
    const picking = createSurfacePicking(ctx);
    expect(picking.pickMuseumAt(CX, CY)).toBeNull();
    on = true;
    expect(picking.pickMuseumAt(CX, CY)).toBe('louvre');
  });

  it('pick observatory pins by userData.observatoryId', () => {
    const pin = { group: target({ observatoryId: 'mauna-kea' }) };
    const { ctx } = makeCtx({ getObservatoryPins: () => [pin] as never });
    expect(createSurfacePicking(ctx).pickObservatoryAt(CX, CY)).toBe('mauna-kea');
  });
});

describe('pickSatAt', () => {
  it('skips invisible satellite groups', () => {
    const group = target({ id: 'iss' });
    group.visible = false;
    const { ctx } = makeCtx({ getEarthSats: () => [{ group }] as never });
    expect(createSurfacePicking(ctx).pickSatAt(CX, CY)).toBeNull();
    group.visible = true;
    expect(createSurfacePicking(ctx).pickSatAt(CX, CY)).toBe('iss');
  });
});

describe('tryPick3d precedence', () => {
  it('satellite beats site when both sit under the pointer', () => {
    const sat = { id: 'iss' };
    const { ctx, calls } = makeCtx({
      markers: [{ group: target({ siteId: 'pad' }) }],
      getEarthSats: () => [{ group: target({ id: 'iss' }, 2) }] as never,
      getEarthObjects: () => [sat] as never,
    });
    createSurfacePicking(ctx).tryPick3d(CX, CY);
    expect(calls.sat).toHaveBeenCalledWith(sat);
    expect(calls.site).not.toHaveBeenCalled();
  });

  it('falls through to the site when the sat id has no cached EarthObject', () => {
    const { ctx, calls } = makeCtx({
      markers: [{ group: target({ siteId: 'pad' }) }],
      getEarthSats: () => [{ group: target({ id: 'iss' }, 2) }] as never,
    });
    createSurfacePicking(ctx).tryPick3d(CX, CY);
    expect(calls.site).toHaveBeenCalledWith('pad');
  });

  it('observatory beats museum beats site', () => {
    const { ctx, calls } = makeCtx({
      markers: [{ group: target({ siteId: 'pad' }) }],
      getMuseumPins: () => [{ group: target({ museumId: 'm' }) }] as never,
      getObservatoryPins: () => [{ group: target({ observatoryId: 'o' }) }] as never,
    });
    createSurfacePicking(ctx).tryPick3d(CX, CY);
    expect(calls.observatory).toHaveBeenCalledWith('o');
    expect(calls.museum).not.toHaveBeenCalled();
    expect(calls.site).not.toHaveBeenCalled();
  });

  it('routes a panorama annotation hit first and stops', () => {
    const hit = { id: 'a' };
    const { ctx, calls } = makeCtx({
      markers: [{ group: target({ siteId: 'pad' }) }],
      getPanoramaActive: () => true,
      getPanoramaSkybox: () => ({ raycastAnnotation: () => hit }) as never,
    });
    createSurfacePicking(ctx).tryPick3d(CX, CY);
    expect(calls.annotation).toHaveBeenCalledWith(hit);
    expect(calls.site).not.toHaveBeenCalled();
  });
});

describe('pickStopAt', () => {
  it('ignores hidden stop pins and returns null with no visible targets', () => {
    const pin = new THREE.Sprite();
    pin.userData = { kind: 'traverse-stop', stopSol: 10 };
    pin.visible = false;
    const end = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8));
    end.visible = false;
    const { ctx } = makeCtx({ traverseLines: [{ stopPins: [pin], endDot: end }] });
    expect(createSurfacePicking(ctx).pickStopAt(CX, CY)).toBeNull();
  });

  it('returns the end-dot payload for a visible traverse-end under the pointer', () => {
    const end = new THREE.Mesh(
      new THREE.SphereGeometry(1, 8, 8),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    );
    end.userData = { kind: 'traverse-end', stopLabel: 'Here', stopSol: 42, stopLat: 1, stopLon: 2 };
    end.updateMatrixWorld(true);
    const { ctx } = makeCtx({ traverseLines: [{ stopPins: [], endDot: end }] });
    expect(createSurfacePicking(ctx).pickStopAt(CX, CY)).toEqual({
      title: 'Here',
      sol: 42,
      lat: 1,
      lon: 2,
    });
  });
});
