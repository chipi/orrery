import { describe, it, expect } from 'vitest';
import {
  HIT_PX,
  LEADER_PX,
  RING_MAX_PX,
  RING_MIN_PX,
  AREA_HANDLE_PX,
  areaRadiusPx,
  interactivePosition,
  ringPxFor,
  CLUSTER_MIN,
  clusterRings,
  estimateLabelWidth,
  fanOutPositions,
  groundOffsetToScreen,
  labelRect,
  layoutLabels,
  placeCard,
  ringDiameter,
  ringInView,
  separationFactor,
  type PlacedRing,
} from './annotation-rings';

describe('ringDiameter', () => {
  it('is 32 px on a phone, grows a little with the view and stops at 44 px', () => {
    expect(ringDiameter(390)).toBe(RING_MIN_PX);
    expect(ringDiameter(1280)).toBeGreaterThan(36);
    expect(ringDiameter(1280)).toBeLessThanOrEqual(RING_MAX_PX);
    expect(ringDiameter(3840)).toBe(RING_MAX_PX);
  });

  it('never depends on the ground zoom', () => {
    // same view width, any zoom: the diameter is a function of the view only
    expect(ringDiameter(1280)).toBe(ringDiameter(1280));
    expect(HIT_PX).toBeGreaterThanOrEqual(48);
    expect(HIT_PX).toBeGreaterThan(RING_MAX_PX);
  });
});

describe('groundOffsetToScreen', () => {
  const origin = { x: 400, y: 300 };

  it('puts east to the right and north up, scaled by the zoom', () => {
    // 0.002 km/px = 2 m/px: 50 m east, 20 m north
    expect(groundOffsetToScreen(20, 50, 0.002, origin)).toEqual({ x: 425, y: 290 });
    expect(groundOffsetToScreen(-20, -50, 0.002, origin)).toEqual({ x: 375, y: 310 });
  });

  it('spaces rings by ground distance: 10 m apart is 20 px zoomed in, 2.5 px zoomed out', () => {
    const a = groundOffsetToScreen(0, 0, 0.0005, origin);
    expect(groundOffsetToScreen(0, 10, 0.0005, origin).x - a.x).toBeCloseTo(20);
    expect(groundOffsetToScreen(0, 10, 0.004, origin).x - a.x).toBeCloseTo(2.5);
  });
});

describe('ringInView', () => {
  it('keeps a ring whose tap target still touches the view, drops it beyond', () => {
    expect(ringInView(-HIT_PX / 2 + 1, 100, 800, 600)).toBe(true);
    expect(ringInView(-HIT_PX / 2 - 1, 100, 800, 600)).toBe(false);
    expect(ringInView(400, 600 + HIT_PX / 2 + 1, 800, 600)).toBe(false);
  });
});

describe('layoutLabels', () => {
  const view = { w: 800, h: 600 };
  const ring = 40;
  const a = (id: string, x: number, y: number, label = 'Descent stage') => ({ id, x, y, label });

  it('puts the chip right of its ring, a leader length past the ring edge', () => {
    const out = layoutLabels([a('lm', 200, 200)], view, ring);
    expect(out.get('lm')?.side).toBe('right');
    expect(out.get('lm')!.rect.x).toBe(200 + ring / 2 + LEADER_PX);
  });

  it('flips to the left at the right view edge', () => {
    expect(layoutLabels([a('lm', 790, 200)], view, ring).get('lm')?.side).toBe('left');
  });

  it('drops a label that fits on neither side', () => {
    const narrow = { w: estimateLabelWidth('Descent stage') - 10, h: 600 };
    expect(layoutLabels([a('lm', narrow.w / 2, 200)], narrow, ring).has('lm')).toBe(false);
  });

  it('hides the later of two labels that clash and cannot flip', () => {
    const out = layoutLabels([a('first', 30, 200), a('second', 30, 214)], view, ring);
    expect(out.has('first')).toBe(true);
    expect(out.has('second')).toBe(false);
  });

  it('flips a label away from a neighbouring ring instead of covering it', () => {
    const out = layoutLabels([a('first', 200, 200), a('second', 270, 200, 'X')], view, ring);
    expect(out.get('first')?.side).toBe('left');
  });

  it('keeps two labels that do not touch', () => {
    expect(layoutLabels([a('first', 200, 200), a('second', 200, 280)], view, ring).size).toBe(2);
  });

  it('avoids blocked rectangles (HUD)', () => {
    const blocked = [{ x: 0, y: 100, w: 800, h: 200 }];
    expect(layoutLabels([a('lm', 200, 200)], view, ring, blocked).has('lm')).toBe(false);
  });

  it('flips left when the side panel covers the right', () => {
    const panel = [{ x: 600, y: 0, w: 200, h: 600 }];
    expect(layoutLabels([a('lm', 560, 200)], view, ring, panel).get('lm')?.side).toBe('left');
  });

  it('goes above the ring when both sides are clipped or covered', () => {
    const tight = { w: 160, h: 600 };
    const out = layoutLabels([a('lm', 80, 200, 'Lander')], tight, ring);
    expect(out.get('lm')?.side).toBe('top');
    const r = out.get('lm')!.rect;
    expect(r.y + r.h).toBe(200 - ring / 2 - LEADER_PX);
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.w).toBeLessThanOrEqual(tight.w);
  });

  it('prefers the full name on the other side over a shortened chip', () => {
    const panel = [{ x: 600, y: 0, w: 200, h: 600 }];
    const out = layoutLabels([a('lm', 500, 200, 'Laser retroreflector (LRRR)')], view, ring, panel);
    expect(out.get('lm')?.side).toBe('left');
    expect(out.get('lm')?.rect.w).toBe(estimateLabelWidth('Laser retroreflector (LRRR)'));
  });

  it('shows a shortened chip on a narrow phone rather than nothing', () => {
    const long = 'Lunar Module descent stage Eagle';
    const phone = { w: 250, h: 600 };
    const out = layoutLabels([a('lm', 190, 200, long)], phone, 32);
    expect(out.get('lm')).toBeDefined();
    expect(out.get('lm')!.rect.w).toBeLessThan(estimateLabelWidth(long));
    expect(out.get('lm')!.rect.x + out.get('lm')!.rect.w).toBeLessThanOrEqual(phone.w);
  });

  it('flips below the ring at the top edge or under the header', () => {
    const header = [{ x: 0, y: 0, w: 800, h: 60 }];
    const out = layoutLabels([a('alsep', 300, 70, 'ALSEP central station')], view, ring, header);
    expect(out.get('alsep')?.side).toBe('bottom');
    expect(out.get('alsep')!.rect.y).toBe(70 + ring / 2 + LEADER_PX);
  });

  it('flips above the ring at the bottom edge or over the footer bar', () => {
    const footer = [{ x: 0, y: 560, w: 800, h: 40 }];
    const out = layoutLabels([a('lm', 300, 550, 'Descent stage')], view, ring, footer);
    expect(out.get('lm')?.side).toBe('top');
  });

  it('left chips end a leader length before the ring edge', () => {
    const r = labelRect({ id: 'x', x: 500, y: 100 }, 120, 'left', ring);
    expect(r.x + r.w).toBe(500 - ring / 2 - LEADER_PX);
  });
});

describe('clusterRings', () => {
  const ring = 40;
  const at = (id: string, x: number, y: number): PlacedRing => ({
    annotation: { id, label: id, lat_offset_m: 0, lon_offset_m: 0 } as PlacedRing['annotation'],
    x,
    y,
  });

  it('merges ' + CLUSTER_MIN + '+ overlapping rings into one cluster at their centre', () => {
    const { singles, clusters } = clusterRings(
      [at('a', 100, 100), at('b', 110, 100), at('c', 105, 112), at('far', 400, 300)],
      ring,
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0].members.map((r) => r.annotation.id)).toEqual(['a', 'b', 'c']);
    expect(clusters[0].x).toBeCloseTo(105);
    expect(clusters[0].y).toBeCloseTo(104);
    expect(singles.map((r) => r.annotation.id)).toEqual(['far']);
  });

  it('leaves two overlapping rings alone', () => {
    const { singles, clusters } = clusterRings([at('a', 100, 100), at('b', 110, 100)], ring);
    expect(clusters).toHaveLength(0);
    expect(singles).toHaveLength(2);
  });

  it('treats centres exactly one ring diameter apart as separate', () => {
    const { clusters } = clusterRings(
      [at('a', 0, 0), at('b', ring, 0), at('c', 2 * ring, 0)],
      ring,
    );
    expect(clusters).toHaveLength(0);
  });

  it('chains: a-b and b-c overlapping makes one cluster of three', () => {
    const { clusters } = clusterRings([at('a', 0, 0), at('b', 30, 0), at('c', 60, 0)], ring);
    expect(clusters).toHaveLength(1);
  });

  it('keeps the key stable regardless of input order', () => {
    const one = clusterRings([at('a', 0, 0), at('b', 5, 0), at('c', 0, 5)], ring).clusters[0];
    const two = clusterRings([at('c', 0, 5), at('a', 0, 0), at('b', 5, 0)], ring).clusters[0];
    expect(one.key).toBe(two.key);
  });
});

describe('separationFactor', () => {
  const ring = 40;
  const at = (id: string, x: number, y: number): PlacedRing => ({
    annotation: { id } as PlacedRing['annotation'],
    x,
    y,
  });

  it('zooms until the closest pair clears a ring diameter', () => {
    const members = [at('a', 0, 0), at('b', 10, 0), at('c', 40, 0)];
    const f = separationFactor(members, ring);
    expect(10 * f).toBeGreaterThanOrEqual(ring);
  });

  it('is capped so coincident rings do not ask for an unbounded zoom', () => {
    expect(
      separationFactor([at('a', 0, 0), at('b', 0, 0), at('c', 1, 0)], ring),
    ).toBeLessThanOrEqual(12);
  });
});

describe('fanOutPositions', () => {
  const ring = 40;
  const member = (id: string): PlacedRing => ({
    annotation: { id } as PlacedRing['annotation'],
    x: 0,
    y: 0,
  });

  it.each([3, 4, 6])(
    'puts %i rings on a circle, every pair at least a ring diameter apart',
    (n) => {
      const members = Array.from({ length: n }, (_, i) => member('m' + i));
      const out = fanOutPositions({ key: 'k', x: 200, y: 200, members }, ring);
      const pts = [...out.values()];
      expect(pts).toHaveLength(n);
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThanOrEqual(ring);
        }
      }
    },
  );
});

describe('placeCard', () => {
  const view = { w: 1280, h: 800 };
  const size = { w: 224, h: 188 };
  const at = { x: 640, y: 400 };

  it('sits beside the ring on the preferred side', () => {
    const p = placeCard(at, size, 'right', view);
    expect(p.x).toBeGreaterThan(at.x);
    expect(placeCard(at, size, 'left', view).x + size.w).toBeLessThan(at.x);
  });

  it('flips to the other side at a view edge', () => {
    expect(placeCard({ x: 1200, y: 400 }, size, 'right', view).x).toBeLessThan(1200);
  });

  it('flips away from the side panel', () => {
    const panel = [{ x: 880, y: 0, w: 400, h: 800 }];
    const p = placeCard({ x: 830, y: 400 }, size, 'right', view, panel);
    expect(p.x + size.w).toBeLessThanOrEqual(880);
  });

  it('goes above the ring when both sides are blocked, never over the other chip', () => {
    const blocked = [
      { x: 380, y: 380, w: 236, h: 40 },
      { x: 664, y: 380, w: 236, h: 40 },
    ];
    const p = placeCard(at, size, 'right', view, blocked);
    expect(p.y + size.h).toBeLessThan(at.y);
  });

  it('stays inside the view even when nothing is clean', () => {
    const p = placeCard({ x: 10, y: 5 }, size, 'left', { w: 240, h: 200 });
    expect(p.x).toBeGreaterThanOrEqual(8);
    expect(p.y).toBeGreaterThanOrEqual(8);
  });
});

describe('areas and small rings', () => {
  const area = {
    id: 'blast',
    label: 'Blast zone',
    lat_offset_m: 0,
    lon_offset_m: 0,
    area_radius_m: 87,
  };
  const crater = {
    id: 'c',
    label: 'Crater',
    lat_offset_m: 0,
    lon_offset_m: 0,
    ring_size: 'small' as const,
  };
  const hardware = { id: 'h', label: 'Hardware', lat_offset_m: 0, lon_offset_m: 0 };

  it('draws an area at its true ground radius: 87 m at 0.4 m/px is 217.5 px, at 1.6 m/px 54 px', () => {
    expect(areaRadiusPx(area, 0.4)).toBeCloseTo(217.5);
    expect(areaRadiusPx(area, 1.6)).toBeCloseTo(54.375);
  });

  it('gives a point annotation no radius', () => {
    expect(areaRadiusPx(hardware, 0.4)).toBeUndefined();
    expect(areaRadiusPx(area, 0)).toBeUndefined();
  });

  it('makes a crater ring smaller than a hardware ring and leaves hardware alone', () => {
    expect(ringPxFor(crater, 32)).toBeLessThan(32);
    expect(ringPxFor(crater, 32)).toBe(Math.round(32 * 0.6));
    expect(ringPxFor(hardware, 32)).toBe(32);
  });

  it('taps and labels an area at the top of its outline, not at its centre', () => {
    const placed: PlacedRing = { annotation: area, x: 500, y: 400, radiusPx: 100 };
    expect(interactivePosition(placed)).toMatchObject({ x: 500, y: 300 });
    const point: PlacedRing = { annotation: hardware, x: 500, y: 400 };
    expect(interactivePosition(point)).toBe(point);
  });

  it("spaces a label by the anchor's own ring size", () => {
    const base = labelRect({ id: 'a', x: 100, y: 100 }, 80, 'right', 32);
    const small = labelRect({ id: 'a', x: 100, y: 100 }, 80, 'right', AREA_HANDLE_PX);
    expect(base.x - small.x).toBe((32 - AREA_HANDLE_PX) / 2);
    const placed = layoutLabels(
      [{ id: 'a', x: 100, y: 100, label: 'x', ringPx: AREA_HANDLE_PX }],
      { w: 400, h: 300 },
      32,
    );
    expect(placed.get('a')?.rect.x).toBe(small.x);
  });
});
