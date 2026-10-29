// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import {
  createSurfaceTraverses,
  daysBetween,
  traversePathKm,
  type SurfaceTraversesContext,
  type TraverseLine,
} from './surface-traverses';
import { colorFor } from '$lib/surface-map/nation-palette';
import { latLonToUnitSphere } from '$lib/moon-projection';
import { REGIONAL_PATCH_DIAMETER_WORLD_UNITS } from '$lib/hotspot-surface-patch';
import * as m from '$lib/paraglide/messages';
import type { SurfaceSite, Traverse } from '$types/surface-site';

const R = 30;
const RADIUS_KM = 3389.5;

let sets: Array<[string, unknown]> = [];
let texts: string[] = [];

beforeEach(() => {
  sets = [];
  texts = [];
  const ctx2d = new Proxy({} as Record<string, unknown>, {
    get(t, p: string) {
      if (p in t) return t[p];
      if (p === 'fillText') return (s: string) => texts.push(s);
      if (p === 'measureText') return (s: string) => ({ width: s.length * 10 });
      return () => undefined;
    },
    set(t, p: string, v) {
      t[p] = v;
      sets.push([p, v]);
      return true;
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx2d as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(
    () => new THREE.Texture() as never,
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function site(over: Partial<SurfaceSite> & { id: string }): SurfaceSite {
  return {
    kind: 'surface',
    nation: 'USA',
    agency: 'NASA',
    status: 'ACTIVE',
    ...over,
  } as SurfaceSite;
}
function traverse(over: Partial<Traverse> & { rover_id: string }): Traverse {
  return {
    status: 'ENDED',
    snapshot_date: '2021-03-01',
    points: [
      [18.4, 77.4],
      [18.5, 77.5],
      [18.6, 77.7],
    ],
    ...over,
  } as Traverse;
}

function setup(
  over: {
    sites?: SurfaceSite[];
    traverses?: Record<string, Traverse>;
    hasLoader?: boolean;
    selected?: SurfaceSite | null;
  } = {},
) {
  const state = {
    sites: over.sites ?? [],
    traverses: over.traverses ?? {},
    selected: over.selected ?? null,
  };
  const planetMesh = new THREE.Group();
  const ctx: SurfaceTraversesContext = {
    planetMesh,
    planetRadius: R,
    radiusKm: RADIUS_KM,
    getContainer: () => undefined,
    hasLoader: () => over.hasLoader ?? true,
    getTraverses: () => state.traverses,
    getSites: () => state.sites,
    getSelected: () => state.selected,
    traverseLines: [] as TraverseLine[],
    tier2DelayedReveal: [],
    routePatchGroups: [],
    routeDetailGroups: [],
    routeRegionalGroups: [],
    routePatchMaterials: [],
    routeRegionalMaterials: [],
    routeSelectionHalos: [],
    routeViewCenters: new Map(),
    routeFrameCamR: new Map(),
    routePatchBuilders: new Map(),
  };
  const { rebuildTraverses } = createSurfaceTraverses(ctx);
  return { ctx, planetMesh, rebuildTraverses, state };
}

const unit = (lat: number, lon: number, r: number) => {
  const p = latLonToUnitSphere(lat, lon);
  return new THREE.Vector3(p.x, p.y, p.z).multiplyScalar(r);
};
const segments = (line: Line2) => line.geometry.getAttribute('instanceStart').count;

describe('rebuildTraverses basics', () => {
  it('does nothing without a traverse loader', () => {
    const { rebuildTraverses, planetMesh, ctx } = setup({
      hasLoader: false,
      traverses: { r: traverse({ rover_id: 'r' }) },
    });
    rebuildTraverses();
    expect(planetMesh.children).toHaveLength(0);
    expect(ctx.traverseLines).toHaveLength(0);
  });

  it('skips traverses with fewer than two points', () => {
    const { rebuildTraverses, ctx } = setup({
      traverses: {
        a: traverse({ rover_id: 'a', points: [[1, 1]] }),
        b: traverse({ rover_id: 'b', points: undefined as never }),
      },
    });
    rebuildTraverses();
    expect(ctx.traverseLines).toHaveLength(0);
  });

  it('builds the path, dots and two captions for a finished rover', () => {
    const rover = site({ id: 'perseverance', lat: 18.4, lon: 77.4, landing_date: '2021-02-18' });
    const { rebuildTraverses, ctx, planetMesh } = setup({
      sites: [rover],
      traverses: { perseverance: traverse({ rover_id: 'perseverance' }) },
    });
    rebuildTraverses();

    expect(ctx.traverseLines).toHaveLength(1);
    const tl = ctx.traverseLines[0];
    expect(tl.roverId).toBe('perseverance');
    expect(tl.isActive).toBe(false);
    expect(tl.surfaceRadius).toBeCloseTo(R + 0.05, 10);

    // line + startDot + endDot + 2 caption groups
    expect(planetMesh.children).toHaveLength(5);
    expect(tl.line).toBeInstanceOf(Line2);
    expect(tl.line.userData).toEqual({ roverId: 'perseverance', kind: 'traverse' });
    expect(tl.line.renderOrder).toBe(6);
    // first point equals the site → nothing prepended → 3 points = 2 segments
    expect(segments(tl.line)).toBe(2);

    // path colour comes from the nation palette, ended = 0.7 opacity
    expect(tl.lineMaterial.color.getHexString()).toBe(colorFor(rover).slice(1).toLowerCase());
    expect(tl.lineMaterial.opacity).toBe(0.7);
    expect(tl.lineMaterial.linewidth).toBe(4);
    expect(tl.lineMaterial.depthTest).toBe(false);

    // everything is revealed with the tier-2 fade
    for (const o of [tl.line, tl.startDot, tl.endDot, tl.startLabel!, tl.endLabel!]) {
      expect(ctx.tier2DelayedReveal).toContain(o);
      expect(o.parent).toBe(planetMesh);
    }
  });

  it('puts start and end dots on the surface shell above the right lat/lon', () => {
    const { rebuildTraverses, ctx } = setup({
      traverses: { r: traverse({ rover_id: 'r' }) },
    });
    rebuildTraverses();
    const tl = ctx.traverseLines[0];
    const r = R + 0.05;
    expect(tl.startDot.position.distanceTo(unit(18.4, 77.4, r))).toBeLessThan(1e-9);
    expect(tl.endDot.position.distanceTo(unit(18.6, 77.7, r))).toBeLessThan(1e-9);
    expect(tl.startDot.visible).toBe(false);
    expect(tl.startAnchor.distanceTo(tl.startDot.position)).toBeLessThan(1e-12);
    expect(tl.endAnchor.distanceTo(tl.endDot.position)).toBeLessThan(1e-12);
    // tangent runs start -> end
    const expected = tl.endDot.position.clone().sub(tl.startDot.position).normalize();
    expect(tl.tangent.distanceTo(expected)).toBeLessThan(1e-12);
    expect(tl.line.geometry.getAttribute('instanceEnd').getX(1)).toBeCloseTo(
      tl.endDot.position.x,
      4,
    );
  });

  it('prepends the published landing coordinate when the first waypoint is more than 1e-3 deg away', () => {
    const near = site({ id: 'near', lat: 18.4005, lon: 77.4 }); // within threshold
    const far = site({ id: 'far', lat: 18.0, lon: 77.0 });
    const { rebuildTraverses, ctx } = setup({
      sites: [near, far],
      traverses: {
        near: traverse({ rover_id: 'near' }),
        far: traverse({ rover_id: 'far' }),
      },
    });
    rebuildTraverses();
    const byId = Object.fromEntries(ctx.traverseLines.map((t) => [t.roverId, t]));
    expect(segments(byId.near.line)).toBe(2);
    expect(segments(byId.far.line)).toBe(3);
    const firstVertex = byId.far.line.geometry.getAttribute('instanceStart');
    const expected = unit(18.0, 77.0, R + 0.05);
    expect(firstVertex.getX(0)).toBeCloseTo(expected.x, 4);
    expect(firstVertex.getY(0)).toBeCloseTo(expected.y, 4);
    expect(firstVertex.getZ(0)).toBeCloseTo(expected.z, 4);
  });

  it('falls back to a white path for a rover with no site', () => {
    const { rebuildTraverses, ctx } = setup({ traverses: { r: traverse({ rover_id: 'r' }) } });
    rebuildTraverses();
    expect(ctx.traverseLines[0].lineMaterial.color.getHexString()).toBe('ffffff');
  });
});

describe('rebuildTraverses end marker', () => {
  it('ended rover: amber dot, final-position label, sol = landing -> snapshot', () => {
    const rover = site({ id: 'r', lat: 18.4, lon: 77.4, landing_date: '2021-02-18' });
    const { rebuildTraverses, ctx } = setup({
      sites: [rover],
      traverses: { r: traverse({ rover_id: 'r', snapshot_date: '2021-03-01' }) },
    });
    rebuildTraverses();
    const end = ctx.traverseLines[0].endDot;
    expect((end.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0xf59e0b);
    expect(end.userData).toEqual({
      siteId: 'r',
      kind: 'traverse-end',
      stopLat: 18.6,
      stopLon: 77.7,
      stopSol: daysBetween('2021-02-18', '2021-03-01'),
      stopLabel: m.traverse_final_rover_position(),
    });
    expect(end.userData.stopSol).toBe(11);
  });

  it('active rover: red dot, current-position label, sol counted to "now"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2021-03-20T12:00:00Z'));
    const rover = site({ id: 'r', lat: 18.4, lon: 77.4, landing_date: '2021-02-18' });
    const { rebuildTraverses, ctx } = setup({
      sites: [rover],
      traverses: { r: traverse({ rover_id: 'r', status: 'ACTIVE' }) },
    });
    rebuildTraverses();
    const tl = ctx.traverseLines[0];
    expect(tl.isActive).toBe(true);
    expect((tl.endDot.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0xef4444);
    expect(tl.endDot.userData.stopSol).toBe(30);
    expect(tl.endDot.userData.stopLabel).toBe(m.traverse_current_rover_position());
    expect(tl.lineMaterial.opacity).toBe(0.95);
  });

  it('sol is 0 when the site has no landing date', () => {
    const { rebuildTraverses, ctx } = setup({
      sites: [site({ id: 'r', lat: 18.4, lon: 77.4 })],
      traverses: { r: traverse({ rover_id: 'r' }) },
    });
    rebuildTraverses();
    expect(ctx.traverseLines[0].endDot.userData.stopSol).toBe(0);
  });
});

describe('rebuildTraverses captions', () => {
  it('writes LANDED <date> and "<km> KM · <days> D" for a finished rover', () => {
    const pts: Array<[number, number]> = [
      [18.4, 77.4],
      [18.5, 77.5],
      [18.6, 77.7],
    ];
    const { rebuildTraverses } = setup({
      sites: [site({ id: 'r', lat: 18.4, lon: 77.4, landing_date: '2021-02-18' })],
      traverses: { r: traverse({ rover_id: 'r', points: pts, snapshot_date: '2021-03-01' }) },
    });
    rebuildTraverses();
    const km = traversePathKm(pts, RADIUS_KM);
    expect(km).toBeLessThan(100);
    expect(texts).toContain('LANDED 2021-02-18');
    expect(texts).toContain(`${km.toFixed(1)} KM · 11 D`);
  });

  it('active rover caption reads "DAY n" and uses whole km at 100+ km', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2022-02-18T00:00:00Z'));
    const pts: Array<[number, number]> = [
      [0, 0],
      [0, 5],
    ];
    const { rebuildTraverses } = setup({
      sites: [site({ id: 'r', lat: 0, lon: 0, landing_date: '2021-02-18' })],
      traverses: { r: traverse({ rover_id: 'r', status: 'ACTIVE', points: pts }) },
    });
    rebuildTraverses();
    const km = traversePathKm(pts, RADIUS_KM);
    expect(km).toBeGreaterThan(100);
    expect(texts).toContain(`${km.toFixed(0)} KM · DAY 365`);
  });

  it('uses LANDING SITE when no landing date is known', () => {
    const { rebuildTraverses } = setup({ traverses: { r: traverse({ rover_id: 'r' }) } });
    rebuildTraverses();
    expect(texts).toContain('LANDING SITE');
  });

  it('colours the captions green (start) and amber/red (end) and sizes the sprites', () => {
    const { rebuildTraverses, ctx } = setup({
      traverses: {
        done: traverse({ rover_id: 'done' }),
        live: traverse({ rover_id: 'live', status: 'ACTIVE' }),
      },
    });
    rebuildTraverses();
    const fills = sets.filter(([p]) => p === 'fillStyle').map(([, v]) => v);
    expect(fills).toContain('#22c55e');
    expect(fills).toContain('#f59e0b');
    expect(fills).toContain('#ef4444');
    const sprite = ctx.traverseLines[0].startLabel!.children[0] as THREE.Sprite;
    expect(sprite.scale.x).toBeCloseTo(0.32, 10);
    expect(sprite.scale.y).toBeCloseTo(0.32 * (96 / 512), 10);
    expect(sprite.renderOrder).toBe(8);
    const endSprite = ctx.traverseLines[0].endLabel!.children[0] as THREE.Sprite;
    expect(endSprite.scale.x).toBeCloseTo(0.34, 10);
  });

  it('floats captions at the offset distance, on opposite sides of the track', () => {
    const { rebuildTraverses, ctx } = setup({ traverses: { r: traverse({ rover_id: 'r' }) } });
    rebuildTraverses();
    const tl = ctx.traverseLines[0];
    const startCap = tl.startLabel!.position;
    const endCap = tl.endLabel!.position;
    // renormalised to the shell + 0.03 radial offset
    expect(startCap.length()).toBeCloseTo(R + 0.05 + 0.03, 10);
    expect(endCap.length()).toBeCloseTo(R + 0.05 + 0.03, 10);
    // start caption sits before the start dot, end caption beyond the end dot
    expect(startCap.clone().sub(tl.startDot.position).dot(tl.tangent)).toBeLessThan(0);
    expect(endCap.clone().sub(tl.endDot.position).dot(tl.tangent)).toBeGreaterThan(0);
  });
});

describe('rebuildTraverses stops', () => {
  const stops = [
    { id: 'sol-10', sol: 10, lat: 18.45, lon: 77.45, label: 'Sample 1', kind: 'sample' },
    { id: 'sol-20', sol: 20, lat: 18.5, lon: 77.5, label: 'Drill 1', kind: 'drill' },
    { id: 'sol-30', sol: 30, lat: 18.55, lon: 77.6, label: 'Mystery', kind: 'other' },
  ] as unknown as Traverse['stops'];

  it('creates one pin sprite per stop with its metadata, anchored at the tip', () => {
    const { rebuildTraverses, ctx, planetMesh } = setup({
      traverses: { r: traverse({ rover_id: 'r', stops }) },
    });
    rebuildTraverses();
    const tl = ctx.traverseLines[0];
    expect(tl.stopPins).toHaveLength(3);
    expect(tl.stopPinTextures).toHaveLength(3);
    const [p0, p1] = tl.stopPins;
    expect(p0.userData).toEqual({
      roverId: 'r',
      kind: 'traverse-stop',
      stopKind: 'sample',
      stopSol: 10,
      stopLabel: 'Sample 1',
    });
    expect(p1.userData.stopKind).toBe('drill');
    expect(p0.position.distanceTo(unit(18.45, 77.45, R + 0.05))).toBeLessThan(1e-9);
    expect(p0.center.toArray()).toEqual([0.5, 0]);
    expect(p0.renderOrder).toBe(8);
    for (const pin of tl.stopPins) {
      expect(pin.parent).toBe(planetMesh);
      expect(ctx.tier2DelayedReveal).toContain(pin);
    }
  });

  it('tints pins by kind with a yellow fallback for unknown kinds', () => {
    const { rebuildTraverses } = setup({ traverses: { r: traverse({ rover_id: 'r', stops }) } });
    rebuildTraverses();
    const fills = sets.filter(([p]) => p === 'fillStyle').map(([, v]) => v);
    expect(fills).toContain('#fb923c'); // sample
    expect(fills).toContain('#f97316'); // drill
    expect(fills).toContain('#fde047'); // unknown -> feature yellow
  });

  it('has no pins when the traverse lists no stops', () => {
    const { rebuildTraverses, ctx } = setup({ traverses: { r: traverse({ rover_id: 'r' }) } });
    rebuildTraverses();
    expect(ctx.traverseLines[0].stopPins).toEqual([]);
  });
});

describe('rebuildTraverses magnification', () => {
  it('magnifies the path about the landing site when a regional ground extent is known', () => {
    const regionalGroundM = 15360;
    const rover = site({
      id: 'r',
      lat: 18.4,
      lon: 77.4,
      hotspot_tier2_regional_ground_m: regionalGroundM,
    });
    const tr = traverse({ rover_id: 'r' });
    const plain = setup({ sites: [site({ id: 'r', lat: 18.4, lon: 77.4 })], traverses: { r: tr } });
    plain.rebuildTraverses();
    const mag = setup({ sites: [rover], traverses: { r: tr } });
    mag.rebuildTraverses();

    const M = REGIONAL_PATCH_DIAMETER_WORLD_UNITS / regionalGroundM / (R / (RADIUS_KM * 1000));
    expect(M).toBeGreaterThan(1);
    const site0 = latLonToUnitSphere(18.4, 77.4);
    const p = latLonToUnitSphere(18.6, 77.7);
    const expected = new THREE.Vector3(
      site0.x + (p.x - site0.x) * M,
      site0.y + (p.y - site0.y) * M,
      site0.z + (p.z - site0.z) * M,
    )
      .normalize()
      .multiplyScalar(R + 0.05);
    const end = mag.ctx.traverseLines[0].endDot.position;
    expect(end.distanceTo(expected)).toBeLessThan(1e-9);
    expect(end.length()).toBeCloseTo(R + 0.05, 10);
    // the start (== site) is unmoved, the end sits farther from it than at true scale
    const siteWorld = unit(18.4, 77.4, R + 0.05);
    const startMag = mag.ctx.traverseLines[0].startDot.position;
    expect(startMag.distanceTo(siteWorld)).toBeLessThan(1e-9);
    expect(end.distanceTo(siteWorld)).toBeGreaterThan(
      plain.ctx.traverseLines[0].endDot.position.distanceTo(siteWorld) * 10,
    );
  });
});

describe('rebuildTraverses route patches', () => {
  const routePatches = [
    { id: 'km-01', lat: 0.0, lon: 0.1, kind: 'route', image: '/img/a.jpg', ground_m: 512 },
    { id: 'km-02', lat: 0.0, lon: 0.3, kind: 'route', image: '/img/b.jpg', ground_m: 512 },
  ] as unknown as Traverse['route_patches'];
  const pts: Array<[number, number]> = [
    [0, 0],
    [0, 0.2],
    [0, 0.4],
  ];
  const rover = () =>
    site({
      id: 'r',
      lat: 0,
      lon: 0,
      hotspot_tier2_regional_source: '/img/ctx.jpg',
      hotspot_tier2_regional_ground_m: 15360,
    });

  it('defers building until the rover is selected', () => {
    const { rebuildTraverses, ctx } = setup({
      sites: [rover()],
      traverses: { r: traverse({ rover_id: 'r', points: pts, route_patches: routePatches }) },
    });
    rebuildTraverses();
    expect(ctx.routePatchBuilders.has('r')).toBe(true);
    expect(ctx.routePatchGroups).toHaveLength(0);
    expect(ctx.routeViewCenters.size).toBe(0);
  });

  it('builds the CTX midpoint, selection halo and one detail wrap per patch when run', () => {
    const { rebuildTraverses, ctx, planetMesh } = setup({
      sites: [rover()],
      traverses: { r: traverse({ rover_id: 'r', points: pts, route_patches: routePatches }) },
    });
    rebuildTraverses();
    ctx.routePatchBuilders.get('r')!();

    // regional wrap + halo wrap + 2 detail wraps
    expect(ctx.routePatchGroups).toHaveLength(4);
    expect(ctx.routeRegionalGroups).toHaveLength(1);
    expect(ctx.routeDetailGroups).toHaveLength(2);
    for (const g of ctx.routePatchGroups) expect(g.parent).toBe(planetMesh);

    // view centre is the MAGNIFIED arc midpoint of the drive (true midpoint
    // lon 0.2 scaled about the landing site, then re-projected on the sphere)
    const vc = ctx.routeViewCenters.get('r')!;
    const M = REGIONAL_PATCH_DIAMETER_WORLD_UNITS / 15360 / (R / (RADIUS_KM * 1000));
    const mid = latLonToUnitSphere(0, 0.2);
    const sUnit = latLonToUnitSphere(0, 0);
    const mag = new THREE.Vector3(
      sUnit.x + (mid.x - sUnit.x) * M,
      sUnit.y + (mid.y - sUnit.y) * M,
      sUnit.z + (mid.z - sUnit.z) * M,
    ).normalize();
    expect(vc.lat).toBeCloseTo(0, 6);
    expect(vc.lon).toBeCloseTo((Math.atan2(-mag.z, mag.x) * 180) / Math.PI, 6);
    expect(vc.lon).toBeGreaterThan(0.2);

    // halo is registered hidden for the per-frame loop
    expect(ctx.routeSelectionHalos).toHaveLength(1);
    expect(ctx.routeSelectionHalos[0].siteId).toBe('r');
    expect(ctx.routeSelectionHalos[0].obj.visible).toBe(false);

    // detail wraps remember their manifest entry and sit on the high shell
    const wraps = ctx.routeDetailGroups;
    expect(wraps.map((w) => w.userData.routePatch.id)).toEqual(['km-01', 'km-02']);
    expect(wraps[0].userData.roverId).toBe('r');
    expect(wraps[0].position.length()).toBeCloseTo(R + 0.08, 8);

    // reveal ramp materials start transparent; detail ones do not write depth
    expect(ctx.routeRegionalMaterials).toHaveLength(1);
    expect(ctx.routeRegionalMaterials[0].opacity).toBe(0);
    expect(ctx.routePatchMaterials).toHaveLength(2);
    for (const mat of ctx.routePatchMaterials) {
      expect(mat.opacity).toBe(0);
      expect(mat.depthWrite).toBe(false);
      expect(mat.transparent).toBe(true);
    }
  });

  it('skips the regional CTX + halo when the site has no regional source', () => {
    const { rebuildTraverses, ctx } = setup({
      sites: [site({ id: 'r', lat: 0, lon: 0 })],
      traverses: { r: traverse({ rover_id: 'r', points: pts, route_patches: routePatches }) },
    });
    rebuildTraverses();
    ctx.routePatchBuilders.get('r')!();
    expect(ctx.routeRegionalGroups).toHaveLength(0);
    expect(ctx.routeSelectionHalos).toHaveLength(0);
    expect(ctx.routeViewCenters.size).toBe(0);
    expect(ctx.routeDetailGroups).toHaveLength(2);
  });

  it('builds immediately and drops the builder when the rover is already selected', () => {
    const rv = rover();
    const { rebuildTraverses, ctx } = setup({
      sites: [rv],
      selected: rv,
      traverses: { r: traverse({ rover_id: 'r', points: pts, route_patches: routePatches }) },
    });
    rebuildTraverses();
    expect(ctx.routePatchBuilders.has('r')).toBe(false);
    expect(ctx.routeDetailGroups).toHaveLength(2);
  });

  it('orients each detail patch along the nearest path segment, not north', () => {
    // A due-north drive: path-travel direction is geographic north, so the
    // azimuth equals the north alignment. A due-east drive must differ by ~90 deg.
    const north = setup({
      sites: [site({ id: 'r', lat: 10, lon: 0 })],
      traverses: {
        r: traverse({
          rover_id: 'r',
          points: [
            [10, 0],
            [10.2, 0],
          ],
          route_patches: [
            { id: 'p', lat: 10.1, lon: 0, kind: 'route', image: '/a.jpg', ground_m: 512 },
          ] as never,
        }),
      },
    });
    const east = setup({
      sites: [site({ id: 'r', lat: 10, lon: 0 })],
      traverses: {
        r: traverse({
          rover_id: 'r',
          points: [
            [10, 0],
            [10, 0.2],
          ],
          route_patches: [
            { id: 'p', lat: 10, lon: 0.1, kind: 'route', image: '/a.jpg', ground_m: 512 },
          ] as never,
        }),
      },
    });
    for (const s of [north, east]) {
      s.rebuildTraverses();
      s.ctx.routePatchBuilders.get('r')!();
    }
    const geoSize = (g: THREE.Object3D) => {
      const mesh = (g.children[0] as THREE.Group).children.find(
        (c) => c.userData.layer === 'detail',
      ) as THREE.Mesh;
      mesh.geometry.computeBoundingBox();
      return mesh.geometry.boundingBox!.getSize(new THREE.Vector3());
    };
    // Squares keep their size under rotation, so compare the wrapper-local
    // patch rotation via the baked geometry's vertex positions instead.
    const firstVertex = (g: THREE.Object3D) => {
      const mesh = (g.children[0] as THREE.Group).children.find(
        (c) => c.userData.layer === 'detail',
      ) as THREE.Mesh;
      const a = mesh.geometry.getAttribute('position');
      return new THREE.Vector3(a.getX(0), a.getY(0), a.getZ(0));
    };
    expect(geoSize(north.ctx.routeDetailGroups[0]).y).toBeCloseTo(0, 8);
    const vn = firstVertex(north.ctx.routeDetailGroups[0]);
    const ve = firstVertex(east.ctx.routeDetailGroups[0]);
    expect(vn.distanceTo(ve)).toBeGreaterThan(1e-3);
  });
});

describe('rebuildTraverses teardown', () => {
  function twoBuilds() {
    const rv = site({
      id: 'r',
      lat: 0,
      lon: 0,
      hotspot_tier2_regional_source: '/img/ctx.jpg',
    });
    const s = setup({
      sites: [rv],
      traverses: {
        r: traverse({
          rover_id: 'r',
          points: [
            [0, 0],
            [0, 0.2],
            [0, 0.4],
          ],
          stops: [{ id: 's', sol: 1, lat: 0, lon: 0.1, label: 'x', kind: 'sample' }] as never,
          route_patches: [
            { id: 'p', lat: 0, lon: 0.1, kind: 'route', image: '/a.jpg', ground_m: 512 },
          ] as never,
        }),
      },
      selected: rv,
    });
    s.rebuildTraverses();
    return s;
  }

  it('removes and disposes everything from the previous build, leaking nothing', () => {
    const s = twoBuilds();
    const first = s.ctx.traverseLines[0];
    const childCount = s.planetMesh.children.length;
    const oldObjects = [...s.planetMesh.children];
    const lineGeoDispose = vi.spyOn(first.line.geometry, 'dispose');
    const lineMatDispose = vi.spyOn(first.lineMaterial, 'dispose');
    const labelTexDispose = vi.spyOn(first.startLabelTexture!, 'dispose');
    const endTexDispose = vi.spyOn(first.endLabelTexture!, 'dispose');
    const pinTexDispose = vi.spyOn(first.stopPinTextures[0], 'dispose');
    const pinMatDispose = vi.spyOn(first.stopPins[0].material, 'dispose');
    const endDotGeoDispose = vi.spyOn(first.endDot.geometry, 'dispose');

    s.rebuildTraverses();

    expect(s.ctx.traverseLines).toHaveLength(1);
    expect(s.ctx.traverseLines[0]).not.toBe(first);
    expect(s.planetMesh.children).toHaveLength(childCount);
    for (const old of oldObjects) expect(s.planetMesh.children).not.toContain(old);
    expect(lineGeoDispose).toHaveBeenCalled();
    expect(lineMatDispose).toHaveBeenCalled();
    expect(labelTexDispose).toHaveBeenCalled();
    expect(endTexDispose).toHaveBeenCalled();
    expect(pinTexDispose).toHaveBeenCalled();
    expect(pinMatDispose).toHaveBeenCalled();
    expect(endDotGeoDispose).toHaveBeenCalled();
    // route patch bookkeeping is rebuilt, not accumulated
    expect(s.ctx.routeDetailGroups).toHaveLength(1);
    expect(s.ctx.routeSelectionHalos).toHaveLength(1);
    expect(s.ctx.routeRegionalGroups).toHaveLength(1);
    expect(s.ctx.routePatchGroups).toHaveLength(3);
  });

  it('clears all traverses when the data goes away', () => {
    const s = twoBuilds();
    s.state.traverses = {};
    s.rebuildTraverses();
    expect(s.ctx.traverseLines).toHaveLength(0);
    expect(s.planetMesh.children).toHaveLength(0);
    expect(s.ctx.routePatchGroups).toHaveLength(0);
    expect(s.ctx.routeViewCenters.size).toBe(0);
    expect(s.ctx.routePatchBuilders.size).toBe(0);
  });
});
