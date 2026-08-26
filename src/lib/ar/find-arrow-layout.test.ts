import { describe, it, expect } from 'vitest';
import { arrowScreenAngle, arrowEdgePlacement, spreadByAngle } from './find-arrow-layout';

// Camera space (Three.js): +x right, +y up, −z forward. A body IN FRONT has z < 0.
// The screen-space angle is x-right / y-DOWN, CW positive: 0 = right, +90° = down,
// −90° = up, 180° = left.
const deg = (rad: number) => (rad * 180) / Math.PI;

describe('arrowScreenAngle — the direction a find-arrow points', () => {
  it('a body to the RIGHT points right (0°)', () => {
    expect(deg(arrowScreenAngle(1, 0))).toBeCloseTo(0, 5);
  });

  it('a body straight UP points up (−90°), NOT down — the on-device inversion bug', () => {
    // Regression guard for #51: the old single-pass double-negated the vertical
    // axis, so a body overhead pointed the arrow to the bottom of the screen.
    expect(deg(arrowScreenAngle(0, 1))).toBeCloseTo(-90, 5);
  });

  it('a body straight DOWN points down (+90°)', () => {
    expect(deg(arrowScreenAngle(0, -1))).toBeCloseTo(90, 5);
  });

  it('a body to the LEFT points left (±180°)', () => {
    expect(Math.abs(deg(arrowScreenAngle(-1, 0)))).toBeCloseTo(180, 5);
  });

  it('an up-and-to-the-right body points into the top-right quadrant', () => {
    const a = deg(arrowScreenAngle(1, 1));
    expect(a).toBeGreaterThan(-90);
    expect(a).toBeLessThan(0); // between up (−90) and right (0)
  });

  it('a body behind-and-up points UP — the shortest turn, not a 180° reflection', () => {
    // Regression guard for B1: the transverse component (vx, vy) is the shortest
    // turn toward the body whether it's in front or behind. Behind-and-up (vy>0)
    // must still point up (−90°); the old code reflected it to down (+90°).
    expect(deg(arrowScreenAngle(0, 1))).toBeCloseTo(-90, 5);
  });

  it('a body behind-and-right points RIGHT — turn the short way, not the long way', () => {
    // A body behind + to the right is reached by turning right (~170°), not left
    // (~190°); its arrow points right (0°), matching its transverse component.
    expect(deg(arrowScreenAngle(1, 0))).toBeCloseTo(0, 5);
  });
});

describe('arrowEdgePlacement — clamp onto the screen-edge rounded rect', () => {
  const W = 400;
  const H = 800;
  const M = 46;

  it('a right-pointing arrow lands on the right edge, ▲ rotated to point right', () => {
    const p = arrowEdgePlacement(0, W, H, M);
    expect(p.px).toBeCloseTo(W / 2 + (W / 2 - M), 3); // right edge, inside margin
    expect(p.py).toBeCloseTo(H / 2, 3);
    expect(p.rightSide).toBe(true);
    expect(p.rotDeg).toBeCloseTo(90, 3); // ▲ (up at 0°) rotated 90° CW → right
  });

  it('an up-pointing arrow lands ABOVE centre with the ▲ upright', () => {
    const p = arrowEdgePlacement(-Math.PI / 2, W, H, M);
    expect(p.py).toBeLessThan(H / 2); // above the centre — the fixed behaviour
    expect(p.px).toBeCloseTo(W / 2, 3);
    expect(((p.rotDeg % 360) + 360) % 360).toBeCloseTo(0, 3); // ▲ points up
  });

  it('a down-pointing arrow lands BELOW centre', () => {
    const p = arrowEdgePlacement(Math.PI / 2, W, H, M);
    expect(p.py).toBeGreaterThan(H / 2);
    expect(p.px).toBeCloseTo(W / 2, 3);
  });

  it('a left arrow reports rightSide=false so the label grows inward', () => {
    const p = arrowEdgePlacement(Math.PI, W, H, M);
    expect(p.rightSide).toBe(false);
    expect(p.px).toBeCloseTo(M, 3); // left edge, inside margin
  });
});

describe('spreadByAngle — declutter so labels never overlap', () => {
  it('pushes near-identical angles apart by at least minGap', () => {
    const gap = 0.2;
    const out = spreadByAngle(
      [
        { key: 'moon', ang: 1.0 },
        { key: 'sun', ang: 1.01 },
        { key: 'mars', ang: 1.02 },
      ],
      gap,
    );
    for (let i = 1; i < out.length; i++) {
      expect(out[i].ang - out[i - 1].ang).toBeGreaterThanOrEqual(gap - 1e-9);
    }
  });

  it('sorts ascending and leaves already-separated angles untouched', () => {
    const out = spreadByAngle(
      [
        { key: 'b', ang: 1.0 },
        { key: 'a', ang: -1.0 },
        { key: 'c', ang: 2.5 },
      ],
      0.2,
    );
    expect(out.map((o) => o.key)).toEqual(['a', 'b', 'c']);
    expect(out.map((o) => o.ang)).toEqual([-1.0, 1.0, 2.5]);
  });

  it('does not reorder the caller’s input array', () => {
    const input = [
      { key: 'b', ang: 1.0 },
      { key: 'a', ang: -1.0 },
    ];
    spreadByAngle(input, 0.2);
    expect(input.map((o) => o.key)).toEqual(['b', 'a']);
  });
});
