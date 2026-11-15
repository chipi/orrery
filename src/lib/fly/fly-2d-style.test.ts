import { describe, expect, it } from 'vitest';
import {
  FLY_2D_STYLE,
  hexToRgb,
  lineContrast,
  lineStyle,
  starAlpha,
  compositeOver,
  contrastRatio,
  FLY_2D_BG_RGB,
} from './fly-2d-style';

describe('fly 2D line values (G-10a)', () => {
  it('the rings are neutral white at 0.45 alpha and 1.25 px', () => {
    expect(FLY_2D_STYLE.ring.rgb).toEqual([255, 255, 255]);
    expect(FLY_2D_STYLE.ring.alpha).toBe(0.45);
    expect(FLY_2D_STYLE.ring.width).toBe(1.25);
    expect(lineStyle(FLY_2D_STYLE.ring)).toBe('rgba(255,255,255,0.45)');
  });

  it('stars run 0.15 to 0.51 alpha', () => {
    const all = [0, 1, 2, 3, 4].map(starAlpha);
    expect(Math.min(...all)).toBe(0.15);
    expect(Math.max(...all)).toBe(0.51);
  });

  it.each(['ring', 'anchor', 'futureOut', 'futureRet', 'pastOut', 'pastRet'] as const)(
    '%s clears 3:1 over the canvas background',
    (k) => {
      expect(lineContrast(FLY_2D_STYLE[k])).toBeGreaterThanOrEqual(3);
    },
  );

  it('the brightest star clears 3:1, the faintest is the documented 1.3:1 floor', () => {
    const star = (a: number) =>
      contrastRatio(compositeOver(FLY_2D_STYLE.star.rgb, a), FLY_2D_BG_RGB);
    expect(star(0.51)).toBeGreaterThanOrEqual(3);
    expect(star(0.15)).toBeGreaterThan(1.3);
  });

  it('reads a hex identity colour into channels', () => {
    expect(hexToRgb('#c1440e')).toEqual([193, 68, 14]);
  });

  it('the old values were under the floor (the repro of FY1)', () => {
    expect(lineContrast({ rgb: [193, 68, 14], alpha: 0.35 })).toBeLessThan(1.5);
    expect(lineContrast({ rgb: [75, 156, 211], alpha: 0.35 })).toBeLessThan(2);
    expect(lineContrast({ rgb: [80, 112, 255], alpha: 0.2 })).toBeLessThan(1.3);
  });
});
