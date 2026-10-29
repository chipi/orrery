import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSurface2dMap,
  equirectLayout,
  equirectProject,
  lunarDiscProject,
  type Surface2dMapContext,
} from './surface-2d-map';
import { colorFor } from '$lib/surface-map/nation-palette';
import type { SurfaceSite, Traverse } from '$types/surface-site';

type Call = { op: string; args: unknown[] };

/** Recording stand-in for CanvasRenderingContext2D: method calls and property
 *  assignments are appended to `log` in order. */
function makeRecorder() {
  const log: Call[] = [];
  const gradient = { addColorStop: (...args: unknown[]) => log.push({ op: 'addColorStop', args }) };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (prop === 'createRadialGradient' || prop === 'createLinearGradient') {
        return (...args: unknown[]) => {
          log.push({ op: prop, args });
          return gradient;
        };
      }
      return (...args: unknown[]) => {
        log.push({ op: prop, args });
      };
    },
    set(target, prop: string, value) {
      target[prop] = value;
      log.push({ op: `set:${prop}`, args: [value] });
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, log };
}

function makeCanvas(w: number, h: number, rect = { left: 0, top: 0 }) {
  const rec = makeRecorder();
  const canvas = {
    width: w,
    height: h,
    clientWidth: w,
    clientHeight: h,
    getContext: () => rec.ctx,
    getBoundingClientRect: () => ({ ...rect, width: w, height: h }),
  } as unknown as HTMLCanvasElement;
  return { canvas, log: rec.log };
}

function site(over: Partial<SurfaceSite> & { id: string }): SurfaceSite {
  return {
    kind: 'surface',
    nation: 'USA',
    agency: 'NASA',
    status: 'ACTIVE',
    ...over,
  } as unknown as SurfaceSite;
}

function traverse(over: Partial<Traverse> & { rover_id: string }): Traverse {
  return {
    status: 'ENDED',
    points: [],
    ...over,
  } as unknown as Traverse;
}

class FakeImage {
  static all: FakeImage[] = [];
  src = '';
  onload: (() => void) | null = null;
  naturalWidth = 0;
  constructor() {
    FakeImage.all.push(this);
  }
}

beforeEach(() => {
  FakeImage.all = [];
  vi.stubGlobal('Image', FakeImage);
});
afterEach(() => vi.unstubAllGlobals());

function build(over: Partial<Surface2dMapContext> & { canvas: HTMLCanvasElement }) {
  const sitePos2d = new Map<string, { x: number; y: number }>();
  const selectSite = vi.fn();
  const ctx: Surface2dMapContext = {
    twoDMode: 'equirectangular',
    textureUrl: '/textures/mars.jpg',
    base: '/base',
    sitePos2d,
    getView: () => '2d',
    getSites: () => [],
    getSelected: () => null,
    getLayerTraverses: () => true,
    hasTraverses: () => true,
    getTraverses: () => ({}),
    getLayerSurface: () => true,
    getLayerOrbiters: () => false,
    getOrbiterSites: () => [],
    selectSite,
    ...over,
  };
  return { map: createSurface2dMap(ctx), sitePos2d, selectSite };
}

const ops = (log: Call[], op: string) => log.filter((c) => c.op === op);
const arcsAt = (log: Call[], x: number, y: number, r: number) =>
  ops(log, 'arc').filter(
    (c) =>
      Math.abs((c.args[0] as number) - x) < 1e-9 &&
      Math.abs((c.args[1] as number) - y) < 1e-9 &&
      c.args[2] === r,
  );

describe('createSurface2dMap setup', () => {
  it('throws when the canvas has no 2D context', () => {
    const canvas = { getContext: () => null } as unknown as HTMLCanvasElement;
    expect(() => build({ canvas })).toThrow('2D context unavailable');
  });

  it('equirectangular mode loads only the body texture', () => {
    const { canvas } = makeCanvas(100, 100);
    build({ canvas, textureUrl: '/t/mars.jpg' });
    expect(FakeImage.all.map((i) => i.src).filter(Boolean)).toEqual(['/t/mars.jpg']);
  });

  it('lunar mode loads near and far discs under the base path', () => {
    const { canvas } = makeCanvas(100, 100);
    build({ canvas, twoDMode: 'lunar-polar-discs', base: '/orrery' });
    expect(
      FakeImage.all
        .map((i) => i.src)
        .filter(Boolean)
        .sort(),
    ).toEqual(['/orrery/textures/moon_far.jpg', '/orrery/textures/moon_near.jpg']);
  });
});

describe('draw2d equirectangular', () => {
  it('does nothing on a zero-sized canvas', () => {
    const { canvas, log } = makeCanvas(0, 0);
    const { map } = build({ canvas });
    map.draw2d();
    expect(ops(log, 'fillRect')).toHaveLength(0);
  });

  it('resyncs the backing store to the CSS size first', () => {
    const { canvas } = makeCanvas(100, 100);
    (canvas as unknown as { clientWidth: number }).clientWidth = 640;
    (canvas as unknown as { clientHeight: number }).clientHeight = 320;
    const { map } = build({ canvas });
    map.draw2d();
    expect([canvas.width, canvas.height]).toEqual([640, 320]);
  });

  it('paints background, gradient placeholder and frame at the fitted layout', () => {
    const { canvas, log } = makeCanvas(1000, 500);
    const { map } = build({ canvas });
    map.draw2d();
    const L = equirectLayout(1000, 500);
    expect(ops(log, 'clearRect')[0].args).toEqual([0, 0, 1000, 500]);
    expect(ops(log, 'createLinearGradient')[0].args).toEqual([
      L.mapX,
      L.mapY,
      L.mapX,
      L.mapY + L.mapH,
    ]);
    expect(ops(log, 'strokeRect')[0].args).toEqual([L.mapX, L.mapY, L.mapW, L.mapH]);
    // graticule: lat -60..60 step 30 (5 lines) + lon 30..330 step 30 (11 lines)
    expect(ops(log, 'lineTo')).toHaveLength(16);
  });

  it('draws the real texture once it has loaded, and only redraws if the 2D view is active', () => {
    const { canvas, log } = makeCanvas(1000, 500);
    let view: '2d' | '3d' = '3d';
    build({ canvas, getView: () => view });
    const img = FakeImage.all.find((i) => i.src === '/textures/mars.jpg')!;
    img.onload!();
    expect(ops(log, 'drawImage')).toHaveLength(0);
    view = '2d';
    img.onload!();
    const L = equirectLayout(1000, 500);
    expect(ops(log, 'drawImage')[0].args).toEqual([img, L.mapX, L.mapY, L.mapW, L.mapH]);
    expect(ops(log, 'createLinearGradient')).toHaveLength(0);
  });

  it('places surface sites at their projected pixels and records them for hit-testing', () => {
    const { canvas, log } = makeCanvas(1000, 500);
    const sites = [
      site({ id: 'origin', lat: 0, lon: 0 }),
      site({ id: 'west', lat: 45, lon: -90 }),
      site({ id: 'nocoord' }),
      site({ id: 'orb', kind: 'orbiter', lat: 10, lon: 10 }),
    ];
    const { map, sitePos2d } = build({ canvas, getSites: () => sites });
    map.draw2d();
    const L = equirectLayout(1000, 500);
    expect([...sitePos2d.keys()].sort()).toEqual(['origin', 'west']);
    expect(sitePos2d.get('origin')).toEqual(equirectProject(0, 0, L));
    expect(sitePos2d.get('origin')).toEqual({ x: 80, y: 250 });
    expect(sitePos2d.get('west')).toEqual({ x: 710, y: 145 });
    expect(arcsAt(log, 80, 250, 4)).toHaveLength(1);
    expect(arcsAt(log, 710, 145, 4)).toHaveLength(1);
  });

  it('adds a glow ring only for the selected site and a dashed outline for failed ones', () => {
    const { canvas, log } = makeCanvas(1000, 500);
    const a = site({ id: 'a', lat: 0, lon: 0 });
    const b = site({ id: 'b', lat: 0, lon: 90, status: 'CRASHED' });
    const c = site({ id: 'c', lat: 0, lon: 180, status: 'LOST' });
    const { map } = build({ canvas, getSites: () => [a, b, c], getSelected: () => b });
    map.draw2d();
    const L = equirectLayout(1000, 500);
    const pb = equirectProject(0, 90, L);
    const pa = equirectProject(0, 0, L);
    expect(arcsAt(log, pb.x, pb.y, 7)).toHaveLength(1);
    expect(arcsAt(log, pa.x, pa.y, 7)).toHaveLength(0);
    const dashes = ops(log, 'setLineDash').filter((d) => (d.args[0] as number[]).length === 2);
    expect(dashes).toHaveLength(2); // b and c only
    expect(ops(log, 'set:shadowColor')[0].args[0]).toBe(colorFor(b));
  });

  it('hides surface markers when the surface layer is off', () => {
    const { canvas } = makeCanvas(1000, 500);
    const { map, sitePos2d } = build({
      canvas,
      getSites: () => [site({ id: 'a', lat: 0, lon: 0 })],
      getLayerSurface: () => false,
    });
    map.draw2d();
    expect(sitePos2d.size).toBe(0);
  });

  it('draws the IN ORBIT strip with one dot per orbiter, spaced 14px, and registers them', () => {
    const { canvas, log } = makeCanvas(1000, 500);
    const orbs = [site({ id: 'o1', kind: 'orbiter' }), site({ id: 'o2', kind: 'orbiter' })];
    const { map, sitePos2d } = build({
      canvas,
      getLayerOrbiters: () => true,
      getOrbiterSites: () => orbs,
    });
    map.draw2d();
    const L = equirectLayout(1000, 500);
    const strip = L.mapY - 16;
    const text = ops(log, 'fillText')[0];
    expect(text.args).toEqual(['IN ORBIT', L.mapX, strip]);
    expect(sitePos2d.get('o1')).toEqual({ x: L.mapX + 60, y: strip - 3 });
    expect(sitePos2d.get('o2')).toEqual({ x: L.mapX + 74, y: strip - 3 });
  });

  it('strokes each traverse polyline through its projected vertices with status-dependent alpha', () => {
    const { canvas, log } = makeCanvas(1000, 500);
    const rover = site({ id: 'rover', nation: 'China', lat: 0, lon: 0 });
    const trs = {
      rover: traverse({
        rover_id: 'rover',
        status: 'ACTIVE',
        points: [
          [0, 0],
          [10, 20],
          [20, 40],
        ],
      }),
      short: traverse({ rover_id: 'short', points: [[1, 1]] }),
      orphan: traverse({
        rover_id: 'nosite',
        points: [
          [0, 0],
          [0, 5],
        ],
      }),
    };
    const { map } = build({ canvas, getSites: () => [rover], getTraverses: () => trs });
    map.draw2d();
    const L = equirectLayout(1000, 500);
    const strokeStyles = ops(log, 'set:strokeStyle').map((c) => c.args[0]);
    expect(strokeStyles).toContain(colorFor(rover));
    expect(strokeStyles).toContain('#ffffff'); // orphan traverse falls back to white
    const alphas = ops(log, 'set:globalAlpha').map((c) => c.args[0]);
    expect(alphas.filter((a) => a === 0.95)).toHaveLength(1);
    expect(alphas.filter((a) => a === 0.7)).toHaveLength(1);
    // the 3-point ACTIVE polyline: first vertex moveTo, rest lineTo
    const p0 = equirectProject(0, 0, L);
    const p2 = equirectProject(20, 40, L);
    const moves = ops(log, 'moveTo').map((c) => c.args);
    expect(moves).toContainEqual([p0.x, p0.y]);
    const lines = ops(log, 'lineTo').map((c) => c.args);
    expect(lines).toContainEqual([p2.x, p2.y]);
  });

  it('skips traverses when the layer is off or no loader exists', () => {
    for (const over of [{ getLayerTraverses: () => false }, { hasTraverses: () => false }]) {
      const { canvas, log } = makeCanvas(1000, 500);
      const { map } = build({
        canvas,
        getTraverses: () => ({
          r: traverse({
            rover_id: 'r',
            points: [
              [0, 0],
              [1, 1],
            ],
          }),
        }),
        ...over,
      });
      map.draw2d();
      expect(ops(log, 'set:globalAlpha')).toHaveLength(0);
    }
  });
});

describe('draw2d lunar discs', () => {
  const W = 1000;
  const H = 500;
  const discR = Math.min(W * 0.2, H * 0.42);
  const yMid = H * 0.46;

  function lunar(sites: SurfaceSite[], selected: SurfaceSite | null = null) {
    const { canvas, log } = makeCanvas(W, H);
    const built = build({
      canvas,
      twoDMode: 'lunar-polar-discs',
      getSites: () => sites,
      getSelected: () => selected,
    });
    built.map.draw2d();
    return { ...built, log };
  }

  it('paints the starfield background, both disc labels and gradient fallbacks before images load', () => {
    const { log } = lunar([]);
    expect(ops(log, 'fillRect')[0].args).toEqual([0, 0, W, H]);
    const labels = ops(log, 'fillText').map((c) => c.args[0]);
    expect(labels).toEqual(['NEAR SIDE · EARTH-FACING', 'FAR SIDE']);
    expect(ops(log, 'createRadialGradient').length).toBe(2);
    expect(ops(log, 'drawImage')).toHaveLength(0);
    expect(ops(log, 'clip')).toHaveLength(2);
  });

  it('puts each site on exactly the disc facing it, mirrored on the far side', () => {
    const near = site({ id: 'near', lat: 10, lon: 20 });
    const far = site({ id: 'far', lat: -30, lon: 150 });
    const { sitePos2d } = lunar([near, far, site({ id: 'orbiter-ish' })]);
    expect([...sitePos2d.keys()].sort()).toEqual(['far', 'near']);
    expect(sitePos2d.get('near')).toEqual(lunarDiscProject(10, 20, false, W * 0.27, yMid, discR));
    expect(sitePos2d.get('far')).toEqual(lunarDiscProject(-30, 150, true, W * 0.73, yMid, discR));
    expect(sitePos2d.get('near')!.x).toBeLessThan(W / 2);
    expect(sitePos2d.get('far')!.x).toBeGreaterThan(W / 2);
  });

  it('labels each site with its name (falling back to id) next to its dot', () => {
    const named = site({ id: 'a11', name: 'Apollo 11', lat: 0, lon: 0 });
    const unnamed = site({ id: 'luna-9', lat: 5, lon: 5 });
    const { log, sitePos2d } = lunar([named, unnamed]);
    const texts = ops(log, 'fillText').filter(
      (c) => c.args[0] === 'Apollo 11' || c.args[0] === 'luna-9',
    );
    expect(texts.map((t) => t.args[0]).sort()).toEqual(['Apollo 11', 'luna-9']);
    const p = sitePos2d.get('a11')!;
    expect(texts.find((t) => t.args[0] === 'Apollo 11')!.args.slice(1)).toEqual([p.x + 6, p.y + 3]);
  });

  it('rings only the selected site', () => {
    const a = site({ id: 'a', lat: 0, lon: 0 });
    const b = site({ id: 'b', lat: 20, lon: 20 });
    const { log, sitePos2d } = lunar([a, b], b);
    const pb = sitePos2d.get('b')!;
    const pa = sitePos2d.get('a')!;
    expect(arcsAt(log, pb.x, pb.y, 9)).toHaveLength(1);
    expect(arcsAt(log, pa.x, pa.y, 9)).toHaveLength(0);
  });

  it('draws the moon photo (not the gradient) once both discs have loaded', () => {
    const { canvas, log } = makeCanvas(W, H);
    build({ canvas, twoDMode: 'lunar-polar-discs' });
    const near = FakeImage.all.find((i) => i.src.endsWith('moon_near.jpg'))!;
    const far = FakeImage.all.find((i) => i.src.endsWith('moon_far.jpg'))!;
    near.naturalWidth = 512;
    far.naturalWidth = 512;
    near.onload!();
    far.onload!();
    const drawn = ops(log, 'drawImage');
    expect(drawn.length).toBeGreaterThanOrEqual(1);
    const last = ops(log, 'drawImage').slice(-2);
    expect(last.map((d) => d.args[0])).toEqual([near, far]);
    expect(last[0].args.slice(1)).toEqual([W * 0.27 - discR, yMid - discR, discR * 2, discR * 2]);
  });
});

describe('on2dClick', () => {
  function drawn() {
    const { canvas } = makeCanvas(1000, 500, { left: 10, top: 20 });
    const sites = [site({ id: 'origin', lat: 0, lon: 0 }), site({ id: 'near', lat: 0, lon: 40 })];
    const built = build({ canvas, getSites: () => sites });
    built.map.draw2d();
    return built;
  }

  it('selects the site within 20px, accounting for the canvas offset', () => {
    const { map, selectSite } = drawn();
    // origin is at canvas (80, 250) -> client (90, 270)
    map.on2dClick({ clientX: 95, clientY: 275 } as MouseEvent);
    expect(selectSite).toHaveBeenCalledWith('origin');
  });

  it('picks the closest of two candidates', () => {
    const { map, selectSite, sitePos2d } = drawn();
    const near = sitePos2d.get('near')!;
    map.on2dClick({ clientX: near.x + 10 + 1, clientY: near.y + 20 } as MouseEvent);
    expect(selectSite).toHaveBeenCalledTimes(1);
    expect(selectSite).toHaveBeenCalledWith('near');
  });

  it('ignores clicks further than 20px from every site', () => {
    const { map, selectSite } = drawn();
    map.on2dClick({ clientX: 500, clientY: 400 } as MouseEvent);
    expect(selectSite).not.toHaveBeenCalled();
  });

  it('uses the 20px tolerance exactly (19 hits, 21 misses)', () => {
    const { map, selectSite } = drawn();
    map.on2dClick({ clientX: 90 + 19, clientY: 270 } as MouseEvent);
    expect(selectSite).toHaveBeenCalledWith('origin');
    selectSite.mockClear();
    map.on2dClick({ clientX: 90 + 21 + 30, clientY: 270 + 30 } as MouseEvent);
    expect(selectSite).not.toHaveBeenCalled();
  });
});
