import { describe, expect, it } from 'vitest';
import { TOUCH } from 'three';
import {
  ORBIT_CONTROLS_TOUCHES,
  createTwoFingerTracker,
  panWorldPerPx,
  touchDistance,
} from './touch-gestures';

const p = (x: number, y: number) => ({ clientX: x, clientY: y });

describe('createTwoFingerTracker', () => {
  it('is inactive and returns null before a start', () => {
    const t = createTwoFingerTracker();
    expect(t.active).toBe(false);
    expect(t.move(p(0, 0), p(10, 0))).toBeNull();
  });

  it('reports a pure drag as a midpoint move with ratio 1', () => {
    const t = createTwoFingerTracker();
    t.start(p(100, 100), p(200, 100));
    const s = t.move(p(130, 120), p(230, 120))!;
    expect(s.ratio).toBeCloseTo(1);
    expect(s.dx).toBe(30);
    expect(s.dy).toBe(20);
    expect(s.midX).toBe(180);
    expect(s.midY).toBe(120);
  });

  it('reports spreading fingers as ratio < 1 and closing as ratio > 1, midpoint still', () => {
    const t = createTwoFingerTracker();
    t.start(p(150, 100), p(250, 100));
    const spread = t.move(p(100, 100), p(300, 100))!;
    expect(spread.ratio).toBeCloseTo(0.5);
    expect(spread.dx).toBe(0);
    const close = t.move(p(150, 100), p(250, 100))!;
    expect(close.ratio).toBeCloseTo(2);
  });

  it('steps are incremental: a second move measures from the first', () => {
    const t = createTwoFingerTracker();
    t.start(p(0, 0), p(100, 0));
    t.move(p(10, 0), p(110, 0));
    const s = t.move(p(25, 5), p(125, 5))!;
    expect(s.dx).toBe(15);
    expect(s.dy).toBe(5);
  });

  it('goes inactive on end', () => {
    const t = createTwoFingerTracker();
    t.start(p(0, 0), p(100, 0));
    expect(t.active).toBe(true);
    t.end();
    expect(t.active).toBe(false);
    expect(t.move(p(0, 0), p(100, 0))).toBeNull();
  });

  it('survives coincident fingers without NaN or a stuck gesture', () => {
    const t = createTwoFingerTracker();
    t.start(p(0, 0), p(100, 0));
    const s = t.move(p(50, 0), p(50, 0))!;
    expect(s.ratio).toBe(1);
    const next = t.move(p(40, 0), p(140, 0))!;
    expect(Number.isFinite(next.ratio)).toBe(true);
  });
});

describe('panWorldPerPx', () => {
  it('scales with radius and shrinks with a taller viewport', () => {
    expect(panWorldPerPx(200, 60, 800)).toBeCloseTo(2 * panWorldPerPx(100, 60, 800));
    expect(panWorldPerPx(100, 60, 400)).toBeCloseTo(2 * panWorldPerPx(100, 60, 800));
  });
  it('matches the finger-width rule: a full-height drag spans the frustum height', () => {
    const r = 100;
    const fov = 60;
    expect(panWorldPerPx(r, fov, 500) * 500).toBeCloseTo(2 * r * Math.tan((fov * Math.PI) / 360));
  });
});

describe('touchDistance / ORBIT_CONTROLS_TOUCHES', () => {
  it('is the euclidean distance', () => {
    expect(touchDistance(p(0, 0), p(3, 4))).toBe(5);
  });
  it('maps one finger to rotate and two to dolly+pan', () => {
    expect(ORBIT_CONTROLS_TOUCHES.ONE).toBe(TOUCH.ROTATE);
    expect(ORBIT_CONTROLS_TOUCHES.TWO).toBe(TOUCH.DOLLY_PAN);
  });
});
