import { describe, expect, it } from 'vitest';
import { fixedScaleBar, formatBarValue, scaleBarWidth, worldsBarQuantity } from './scale-bar';

describe('scaleBarWidth', () => {
  it('is 120 px on a desktop view and 64 px under 600 px wide', () => {
    expect(scaleBarWidth(1440)).toBe(120);
    expect(scaleBarWidth(600)).toBe(120);
    expect(scaleBarWidth(599)).toBe(64);
    expect(scaleBarWidth(390)).toBe(64);
  });

  it('reads an unmeasured view as desktop', () => {
    expect(scaleBarWidth(0)).toBe(120);
  });
});

describe('fixedScaleBar', () => {
  it('keeps the same pixel width at five very different distances while the value scales', () => {
    const perPx = [1e-6, 0.01, 1, 37, 4e5];
    const bars = perPx.map((p) => fixedScaleBar(p, 120)!);
    for (const b of bars) expect(b.widthPx).toBe(120);
    bars.forEach((b, i) => expect(b.units).toBeCloseTo(perPx[i] * 120, 9));
    expect(bars[4].units / bars[0].units).toBeCloseTo(4e5 / 1e-6, -3);
  });

  it('rejects non-positive or non-finite input', () => {
    expect(fixedScaleBar(0, 120)).toBeNull();
    expect(fixedScaleBar(-1, 120)).toBeNull();
    expect(fixedScaleBar(Number.NaN, 120)).toBeNull();
    expect(fixedScaleBar(1, 0)).toBeNull();
    expect(fixedScaleBar(Infinity, 120)).toBeNull();
  });
});

describe('formatBarValue', () => {
  it('keeps three significant digits, not a round number', () => {
    expect(formatBarValue(1.3721, 'en-US')).toBe('1.37');
    expect(formatBarValue(13.721, 'en-US')).toBe('13.7');
    expect(formatBarValue(137.21, 'en-US')).toBe('137');
    expect(formatBarValue(0.0013721, 'en-US')).toBe('0.00137');
    expect(formatBarValue(1372100, 'en-US')).toBe('1,370,000');
  });

  it('follows the locale separators', () => {
    expect(formatBarValue(1.3721, 'de')).toBe('1,37');
    expect(formatBarValue(13.721, 'ru')).toBe('13,7');
  });
});

describe('worldsBarQuantity', () => {
  it('reads km from 1 km up and metres below', () => {
    expect(worldsBarQuantity(12.5)).toEqual({ value: 12.5, unit: 'km' });
    expect(worldsBarQuantity(1)).toEqual({ value: 1, unit: 'km' });
    const m = worldsBarQuantity(0.25);
    expect(m.unit).toBe('m');
    expect(m.value).toBeCloseTo(250, 9);
  });
});
