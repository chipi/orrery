import { describe, it, expect } from 'vitest';
import { dvToRGB, dvToCss, dayToDate, dayToLongDate, dayToShortDate } from './porkchop';

describe('dvToRGB', () => {
  it('clamps below DV_MIN to deep blue', () => {
    const [r, g, b] = dvToRGB(0);
    expect(r).toBeCloseTo(8);
    expect(g).toBeCloseTo(14);
    expect(b).toBeCloseTo(90);
  });

  it('clamps above DV_MAX to deep red', () => {
    const [r, g, b] = dvToRGB(99);
    expect(r).toBeCloseTo(120);
    expect(g).toBeCloseTo(10);
    expect(b).toBeCloseTo(10);
  });

  it('moves through the gradient monotonically', () => {
    const cheap = dvToRGB(4);
    const moderate = dvToRGB(8);
    const expensive = dvToRGB(14);
    // Red component should rise as Δv climbs.
    expect(moderate[0]).toBeGreaterThan(cheap[0]);
    expect(expensive[0]).toBeGreaterThan(moderate[0]);
  });
});

describe('dvToCss', () => {
  it('produces an rgb() CSS string', () => {
    const css = dvToCss(7);
    expect(css).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
  });
});

describe('day-to-date helpers', () => {
  it('day 0 of epoch 2026 is Jan 1, 2026', () => {
    const d = dayToDate(0);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });

  it('day 31 of epoch 2026 is Feb 1, 2026', () => {
    const d = dayToDate(31);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(1);
  });

  it('long form contains the year', () => {
    expect(dayToLongDate(0)).toContain('2026');
  });

  it('short form is two-digit year', () => {
    // 'en-US' locale formatting yields either "Jan 26" or "Jan '26"
    // depending on ICU version. We just verify the year suffix is two
    // digits (not "2026").
    const s = dayToShortDate(0);
    expect(s).toMatch(/26$/);
    expect(s).not.toContain('2026');
  });
});
