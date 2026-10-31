import { describe, expect, it } from 'vitest';
import { equirectLayout, equirectProject, lunarDiscProject } from './surface-2d-map';

describe('equirectLayout', () => {
  it('fits a 2:1 map centred in a wide canvas (height-limited)', () => {
    const l = equirectLayout(1000, 500);
    expect(l.mapW).toBe(840);
    expect(l.mapH).toBe(420);
    expect(l.mapX).toBe(80);
    expect(l.mapY).toBe(40);
  });

  it('is width-limited with a 40px side margin on a narrow canvas', () => {
    const l = equirectLayout(400, 800);
    expect(l.mapW).toBe(360);
    expect(l.mapH).toBe(180);
    expect(l.mapX).toBe(20);
    expect(l.mapY).toBe(310);
  });
});

describe('equirectProject', () => {
  const layout = { mapW: 360, mapH: 180, mapX: 10, mapY: 20 };

  it('maps lat 0 / lon 0 to the left-edge vertical middle', () => {
    expect(equirectProject(0, 0, layout)).toEqual({ x: 10, y: 110 });
  });

  it('maps the north pole to the top edge and the south pole to the bottom', () => {
    expect(equirectProject(90, 0, layout).y).toBe(20);
    expect(equirectProject(-90, 0, layout).y).toBe(200);
  });

  it('wraps negative longitudes into 0-360', () => {
    expect(equirectProject(0, -90, layout).x).toBeCloseTo(equirectProject(0, 270, layout).x, 10);
    expect(equirectProject(0, -90, layout).x).toBe(10 + 270);
  });

  it('puts lon 180 at the horizontal middle', () => {
    expect(equirectProject(0, 180, layout).x).toBe(10 + 180);
  });
});

describe('lunarDiscProject', () => {
  const cx = 100;
  const cy = 100;
  const R = 50;

  it('puts the sub-Earth point (0,0) on the near disc centre', () => {
    const p = lunarDiscProject(0, 0, false, cx, cy, R);
    expect(p?.x).toBeCloseTo(cx, 10);
    expect(p?.y).toBeCloseTo(cy, 10);
  });

  it('hides near-side points on the far disc and vice versa', () => {
    expect(lunarDiscProject(0, 0, true, cx, cy, R)).toBeNull();
    expect(lunarDiscProject(0, 180, false, cx, cy, R)).toBeNull();
    expect(lunarDiscProject(0, 180, true, cx, cy, R)).not.toBeNull();
  });

  it('puts +lat above centre (canvas y grows downward)', () => {
    const p = lunarDiscProject(45, 0, false, cx, cy, R);
    expect(p!.y).toBeLessThan(cy);
    expect(p!.y).toBeCloseTo(cy - Math.sin(Math.PI / 4) * R, 10);
  });

  it('puts east longitude right of centre on the near disc and mirrors it on the far disc', () => {
    const near = lunarDiscProject(0, 45, false, cx, cy, R);
    expect(near!.x).toBeGreaterThan(cx);
    const far = lunarDiscProject(0, 135, true, cx, cy, R);
    expect(far!.x).toBeLessThan(cx);
  });

  it('keeps every visible point inside the disc', () => {
    for (let lat = -80; lat <= 80; lat += 20) {
      for (let lon = -170; lon <= 170; lon += 20) {
        const side = Math.cos(lon * (Math.PI / 180)) > 0 ? false : true;
        const p = lunarDiscProject(lat, lon, side, cx, cy, R);
        if (!p) continue;
        expect(Math.hypot(p.x - cx, p.y - cy)).toBeLessThanOrEqual(R + 1e-9);
      }
    }
  });
});
