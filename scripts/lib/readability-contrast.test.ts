import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  lumaPercentiles,
  measureElement,
  pointContrast,
  relLuminance,
  srgbToLinear,
  summarise,
  veil,
} from './readability-contrast.mjs';

/** A w x h RGBA frame filled with one grey, with `paint(x, y)` able to override a pixel. */
function frame(w: number, h: number, bg: number, paint?: (x: number, y: number) => number | null) {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = paint?.(x, y) ?? bg;
      const i = (y * w + x) * 4;
      px[i] = px[i + 1] = px[i + 2] = v;
      px[i + 3] = 255;
    }
  }
  return px;
}

describe('WCAG maths', () => {
  it('black is 0, white is 1', () => {
    expect(relLuminance(0, 0, 0)).toBe(0);
    expect(relLuminance(255, 255, 255)).toBeCloseTo(1, 9);
  });
  it('white on black is the textbook 21:1', () => {
    expect(contrastRatio(1, 0)).toBeCloseTo(21, 9);
    expect(contrastRatio(0, 1)).toBeCloseTo(21, 9);
  });
  it('the sRGB transfer function is the standard one', () => {
    expect(srgbToLinear(0)).toBe(0);
    expect(srgbToLinear(255)).toBeCloseTo(1, 9);
    expect(srgbToLinear(128)).toBeCloseTo(0.2158605, 6);
  });
});

describe('veil', () => {
  it('mixes 12 % white into the rendered pixels and keeps alpha opaque', () => {
    const out = veil(frame(1, 1, 0));
    expect(out[0]).toBe(31); // 255 * 0.12 = 30.6 -> 31 (Uint8ClampedArray rounds)
    expect(out[3]).toBe(255);
    expect(veil(frame(1, 1, 255))[0]).toBe(255);
  });
  it('keeps the line readable but shrinks its sRGB step by the veil share', () => {
    const w = 21;
    const f = frame(w, w, 3, (x) => (x === 10 ? 90 : null));
    const v = veil(f);
    const step = (px: Uint8ClampedArray) => px[(10 * w + 10) * 4] - px[(10 * w + 5) * 4];
    expect(step(v)).toBeCloseTo(step(f) * 0.88, 0);
    expect(pointContrast(v, w, w, 10, 10)!).toBeGreaterThan(1);
  });
});

describe('pointContrast', () => {
  const w = 31;
  it('a vertical 1 px line of grey 90 on grey 3 reads the textbook ratio', () => {
    const f = frame(w, w, 3, (x) => (x === 15 ? 90 : null));
    const expected = contrastRatio(relLuminance(90, 90, 90), relLuminance(3, 3, 3));
    expect(pointContrast(f, w, w, 15, 15)).toBeCloseTo(expected, 9);
  });
  it('a point one pixel off the line still finds it (3 x 3 block)', () => {
    const f = frame(w, w, 3, (x) => (x === 15 ? 90 : null));
    expect(pointContrast(f, w, w, 16, 15)).toBeCloseTo(pointContrast(f, w, w, 15, 15)!, 9);
  });
  it('a diagonal line crosses two ring samples and the median stays the background', () => {
    const f = frame(w, w, 3, (x, y) => (x === y ? 90 : null));
    const expected = contrastRatio(relLuminance(90, 90, 90), relLuminance(3, 3, 3));
    expect(pointContrast(f, w, w, 15, 15)).toBeCloseTo(expected, 9);
  });
  it('a flat frame has no contrast', () => {
    expect(pointContrast(frame(w, w, 40), w, w, 15, 15)).toBeCloseTo(1, 9);
  });
  it('a point near the frame edge is not measured', () => {
    expect(pointContrast(frame(w, w, 3), w, w, 2, 15)).toBeNull();
    expect(pointContrast(frame(w, w, 3), w, w, 15, 29)).toBeNull();
  });
});

describe('summarise and measureElement', () => {
  it('summarise reports the percentiles and the share at target, and skips nulls', () => {
    const s = summarise([1, 2, 3, 4, null, 5], 3);
    expect(s.n).toBe(5);
    expect(s.p50).toBe(3);
    expect(s.shareAtTarget).toBeCloseTo(0.6, 9);
  });
  it('a bright line passes both targets, a dim one fails the 3:1 raw target', () => {
    const w = 41;
    const pts = [10, 15, 20, 25, 30].map((y) => ({ x: 20, y }));
    const bright = frame(w, w, 3, (x) => (x === 20 ? 200 : null));
    const dim = frame(w, w, 3, (x) => (x === 20 ? 40 : null));
    expect(measureElement(bright, w, w, pts).pass).toBe(true);
    const d = measureElement(dim, w, w, pts);
    expect(d.raw.p50).toBeLessThan(3);
    expect(d.pass).toBe(false);
  });
  it('no measurable points is not a pass', () => {
    expect(measureElement(frame(10, 10, 3), 10, 10, [{ x: 0, y: 0 }]).pass).toBe(false);
  });
});

describe('lumaPercentiles', () => {
  it('a half black half white frame has p5 0 and p95 255', () => {
    const w = 10;
    const f = frame(w, w, 0, (x) => (x >= 5 ? 255 : null));
    const p = lumaPercentiles(f);
    expect(p.p5).toBe(0);
    expect(p.p95).toBeCloseTo(255, 0);
  });
});
