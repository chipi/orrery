import { describe, expect, it } from 'vitest';
import { featherMask } from './feather-mask';

describe('featherMask', () => {
  it('gives each caller its own texture over the same pixels', () => {
    const a = featherMask(0.12);
    const b = featherMask(0.12);
    expect(a).not.toBe(b);
    expect(a.image).toBe(b.image);
  });

  it('a disposed mask leaves the next one usable', () => {
    const a = featherMask(0.2);
    a.dispose();
    const b = featherMask(0.2);
    expect(b.version).toBeGreaterThan(0);
    expect(b).not.toBe(a);
  });

  it('is opaque in the centre and clear at the edge', () => {
    const img = featherMask(0.18).image as { data: Uint8Array; width: number };
    const n = img.width;
    const g = (x: number, y: number) => img.data[(y * n + x) * 4 + 1];
    expect(g(n / 2, n / 2)).toBe(255);
    expect(g(0, n / 2)).toBeLessThan(10);
  });
});
