import { describe, expect, it } from 'vitest';
import { easeShift, framingShiftPx, panelCoverPx } from './panel-framing';

describe('panelCoverPx', () => {
  it('a 400 px drawer docked at the right edge of a 1440 px window covers 400', () => {
    expect(panelCoverPx([{ left: 1040, right: 1440 }], 1440)).toBe(400);
  });

  it('at a 768 px window the drawer covers from x 368 and the look-at point moves 200 left', () => {
    const cover = panelCoverPx([{ left: 368, right: 768 }], 768);
    expect(cover).toBe(400);
    expect(framingShiftPx(cover)).toBe(200);
  });

  it('a full-width bottom sheet moves nothing', () => {
    expect(panelCoverPx([{ left: 0, right: 390 }], 390)).toBe(0);
  });

  it('a panel not docked at the right edge is ignored', () => {
    expect(panelCoverPx([{ left: 100, right: 500 }], 1440)).toBe(0);
  });

  it('with several panels the widest cover wins; none gives 0', () => {
    expect(
      panelCoverPx(
        [
          { left: 1100, right: 1440 },
          { left: 1040, right: 1440 },
        ],
        1440,
      ),
    ).toBe(400);
    expect(panelCoverPx([], 1440)).toBe(0);
  });
});

describe('easeShift', () => {
  it('moves towards the target and lands on it', () => {
    const a = easeShift(0, 200, 1 / 60);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(200);
    let v = 0;
    for (let i = 0; i < 120; i++) v = easeShift(v, 200, 1 / 60);
    expect(v).toBe(200);
  });

  it('eases back to 0 and does not overshoot', () => {
    let v = 200;
    for (let i = 0; i < 120; i++) {
      v = easeShift(v, 0, 1 / 60);
      expect(v).toBeGreaterThanOrEqual(0);
    }
    expect(v).toBe(0);
  });
});
