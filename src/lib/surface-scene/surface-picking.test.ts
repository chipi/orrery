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

  it('a marker whose visible stand-in has faded out catches no clicks', () => {
    let fade = 0;
    const { ctx } = makeCtx({
      markers: [{ group: target({ siteId: 'perseverance' }), siteId: 'perseverance' }],
      getSiteFade: () => fade,
    });
    const picking = createSurfacePicking(ctx);
    expect(picking.pickSiteAt(CX, CY)).toBeNull();
    fade = 1;
    expect(picking.pickSiteAt(CX, CY)).toBe('perseverance');
  });

  it('hidden or fully transparent parts of a marker are no target (raycasting ignores both)', () => {
    const group = target({ siteId: 'a' });
    const mesh = group.children[0] as THREE.Mesh;
    const { ctx } = makeCtx({ markers: [{ group, siteId: 'a' }] });
    const picking = createSurfacePicking(ctx);
    mesh.visible = false;
    expect(picking.pickSiteAt(CX, CY)).toBeNull();
    mesh.visible = true;
    const mat = mesh.material as THREE.MeshBasicMaterial;
    mat.transparent = true;
    mat.opacity = 0;
    expect(picking.pickSiteAt(CX, CY)).toBeNull();
    mat.opacity = 1;
    expect(picking.pickSiteAt(CX, CY)).toBe('a');
  });

  it("a marker's invisible hit sphere reaches a touch-sized spot, not the whole disc it covers", () => {
    const group = new THREE.Group();
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(3, 8, 8),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    sphere.userData = { siteId: 'a' };
    group.add(sphere);
    group.updateMatrixWorld(true);
    const { ctx } = makeCtx({ markers: [{ group, siteId: 'a' }] });
    const picking = createSurfacePicking(ctx);
    expect(picking.pickSiteAt(CX + 10, CY)).toBe('a');
    expect(picking.pickSiteAt(CX + 45, CY)).toBeNull();
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

describe('pickStopAt (#641 kinds)', () => {
  const mesh = (userData: Record<string, unknown>) => {
    const o = new THREE.Mesh(
      new THREE.SphereGeometry(1, 8, 8),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    );
    o.userData = userData;
    o.updateMatrixWorld(true);
    return o;
  };
  const hidden = () => Object.assign(new THREE.Mesh(), { visible: false });

  it('a photo pin returns its image, thumb and an approximate sol mark', () => {
    const pin = mesh({
      kind: 'traverse-photo',
      stopSol: 18,
      stopSolApprox: true,
      image: '/images/x.webp',
      thumb: '/images/x-320.webp',
    });
    const { ctx } = makeCtx({
      traverseLines: [{ stopPins: [pin as unknown as THREE.Sprite], endDot: hidden() }],
    });
    const hit = createSurfacePicking(ctx).pickStopAt(CX, CY);
    expect(hit?.image).toBe('/images/x.webp');
    expect(hit?.thumb).toBe('/images/x-320.webp');
    expect(hit?.title).toContain('≈18');
  });

  it('a stop shows its sol once; a Moon stop without a sol is titled by its name', () => {
    const pick = (ud: Record<string, unknown>) => {
      const { ctx } = makeCtx({
        traverseLines: [{ stopPins: [mesh(ud) as unknown as THREE.Sprite], endDot: hidden() }],
      });
      return createSurfacePicking(ctx).pickStopAt(CX, CY);
    };
    const mars = pick({ kind: 'traverse-stop', stopSol: 952, stopLabel: 'Victoria Crater' });
    expect(mars).toMatchObject({ title: 'Sol 952', label: 'Victoria Crater' });
    expect(mars?.sol).toBeUndefined();
    expect(pick({ kind: 'traverse-stop', stopLabel: 'Station 5' })).toMatchObject({
      title: 'Station 5',
    });
  });

  it('the landing ring returns the landing-site card', () => {
    const pin = mesh({ kind: 'traverse-landing', stopLabel: 'Landed', stopLat: 3, stopLon: 4 });
    const { ctx } = makeCtx({
      traverseLines: [{ stopPins: [pin as unknown as THREE.Sprite], endDot: hidden() }],
    });
    expect(createSurfacePicking(ctx).pickStopAt(CX, CY)).toMatchObject({
      label: 'Landed',
      lat: 3,
      lon: 4,
    });
  });

  it('falls back to the path: the vertex under the pointer gives sol + date + km', () => {
    const line = new THREE.Group();
    line.updateMatrixWorld(true);
    const { ctx } = makeCtx({
      traverseLines: [
        {
          stopPins: [],
          endDot: hidden(),
          line,
          // On a globe of radius 2 at the origin, the second vertex faces the camera (z = +10).
          pathWorld: [new THREE.Vector3(1.6, 1.2, 0), new THREE.Vector3(0, 0, 2)],
          pointSols: [1, 66],
          pointKm: [0, 0.36],
          dateOfSol: (s: number) => `D${s}`,
        },
      ],
    });
    const hit = createSurfacePicking(ctx).pickStopAt(CX, CY);
    expect(hit?.title).toContain('66');
    expect(hit?.label).toContain('D66');
    expect(hit?.label).toContain('0.36');
  });

  it('ignores path vertices on the far side of the globe', () => {
    const line = new THREE.Group();
    line.updateMatrixWorld(true);
    const { ctx } = makeCtx({
      traverseLines: [
        {
          stopPins: [],
          endDot: hidden(),
          line,
          // Behind the globe: projects to the pointer, but faces away from the camera.
          pathWorld: [new THREE.Vector3(0, 0, -2)],
          pointSols: [9],
          pointKm: [1],
          dateOfSol: (s: number) => `D${s}`,
        },
      ],
    });
    expect(createSurfacePicking(ctx).pickStopAt(CX, CY)).toBeNull();
  });
});

describe('nearestPathVertex (#641)', () => {
  it('returns the closest projected vertex within maxPx, else -1', async () => {
    const { nearestPathVertex } = await import('./surface-picking');
    const pts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(10, 0, 0),
      new THREE.Vector3(20, 0, 0),
    ];
    const project = (v: THREE.Vector3): [number, number] | null => (v.x === 20 ? null : [v.x, v.y]);
    expect(nearestPathVertex(pts, project, 9, 1)).toBe(1);
    expect(nearestPathVertex(pts, project, 1, 0)).toBe(0);
    // behind the camera (null) is skipped; nothing else within 10 px
    expect(nearestPathVertex(pts, project, 21, 0)).toBe(-1);
  });
});
