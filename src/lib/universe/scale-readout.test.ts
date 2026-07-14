import { describe, it, expect } from 'vitest';
import {
  describeDistanceAu,
  lightTravel,
  niceScaleBar,
  AU_PER_LY,
  AU_PER_PC,
} from './scale-readout';

describe('lightTravel', () => {
  it('reads 1 AU as about 8.3 light-minutes', () => {
    const lt = lightTravel(1);
    expect(lt.unit).toBe('light-minutes');
    expect(lt.value).toBeCloseTo(8.32, 1);
  });

  it('reads a nearby-star distance in light-years', () => {
    const lt = lightTravel(AU_PER_LY * 4.24); // Proxima Centauri
    expect(lt.unit).toBe('light-years');
    expect(lt.value).toBeCloseTo(4.24, 1);
  });

  it('walks up the units as distance grows', () => {
    expect(lightTravel(0.01).unit).toBe('light-seconds');
    expect(lightTravel(30).unit).toBe('light-hours'); // ~30 AU ≈ Neptune
  });
});

describe('describeDistanceAu', () => {
  it('uses kilometres close in', () => {
    const r = describeDistanceAu(0.005); // ~Earth–Moon-ish
    expect(r.rung).toBe('km');
    expect(r.primary.unit).toBe('km');
  });

  it('uses AU across the planetary system', () => {
    const r = describeDistanceAu(30);
    expect(r.rung).toBe('au');
    expect(r.primary.unit).toBe('AU');
    expect(r.primary.value).toBeCloseTo(30, 5);
  });

  it('uses light-years with parsecs alongside for interstellar distances', () => {
    const r = describeDistanceAu(AU_PER_LY * 10); // 10 ly out
    expect(r.rung).toBe('ly');
    expect(r.primary.unit).toBe('ly');
    expect(r.primary.value).toBeCloseTo(10, 1);
    expect(r.companion?.unit).toBe('pc');
    expect(r.companion?.value).toBeCloseTo(10 / 3.2615638, 1);
  });

  it('agrees ly and pc convert consistently', () => {
    const r = describeDistanceAu(AU_PER_PC * 2); // 2 pc
    expect(r.companion?.value).toBeCloseTo(2, 1);
    expect(r.primary.value).toBeCloseTo(2 * 3.2615638, 1);
  });
});

describe('niceScaleBar', () => {
  it('picks a 1/2/5 × 10ⁿ round length near the target width', () => {
    const bar = niceScaleBar(1, 130)!; // 1 AU per pixel, target 130 px
    expect([1, 2, 5, 10, 20, 50, 100].includes(bar.au / 10 ** Math.floor(Math.log10(bar.au)) * 1)).toBeTruthy();
    expect(bar.au).toBeLessThanOrEqual(130);
    expect(bar.px).toBeCloseTo(bar.au / 1, 6);
  });

  it('keeps the bar near the requested pixel width', () => {
    const bar = niceScaleBar(0.037, 130)!;
    expect(bar.px).toBeGreaterThan(40);
    expect(bar.px).toBeLessThanOrEqual(130);
  });

  it('rejects non-positive or non-finite input', () => {
    expect(niceScaleBar(0)).toBeNull();
    expect(niceScaleBar(-1)).toBeNull();
    expect(niceScaleBar(Number.NaN)).toBeNull();
  });
});
