import { describe, it, expect } from 'vitest';
import {
  HIT_PX,
  LEADER_PX,
  RING_MAX_PX,
  RING_MIN_PX,
  estimateLabelWidth,
  groundOffsetToScreen,
  labelRect,
  layoutLabels,
  ringDiameter,
  ringInView,
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
    const narrow = { w: estimateLabelWidth('Descent stage') + 10, h: 600 };
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
    const blocked = [{ x: 0, y: 180, w: 800, h: 40 }];
    expect(layoutLabels([a('lm', 200, 200)], view, ring, blocked).has('lm')).toBe(false);
  });

  it('left chips end a leader length before the ring edge', () => {
    const r = labelRect({ id: 'x', x: 500, y: 100 }, 120, 'left', ring);
    expect(r.x + r.w).toBe(500 - ring / 2 - LEADER_PX);
  });
});
