import { describe, expect, it } from 'vitest';
import { computeLabelOffsets } from './surface-markers';
import type { SurfaceSite } from '$types/surface-site';

function site(id: string, lat: number | null, lon: number | null, kind = 'surface'): SurfaceSite {
  return { id, lat, lon, kind } as unknown as SurfaceSite;
}

describe('computeLabelOffsets', () => {
  it('gives a solo site the default radial-up offset', () => {
    const out = computeLabelOffsets([site('a', 0, 0)]);
    expect(out.get('a')?.toArray()).toEqual([0, 3.2, 0]);
  });

  it('skips orbiters and sites without coordinates', () => {
    const out = computeLabelOffsets([
      site('orb', 0, 0, 'orbiter'),
      site('nolat', null, 10),
      site('nolon', 10, null),
      site('ok', 20, 20),
    ]);
    expect([...out.keys()]).toEqual(['ok']);
  });

  it('splays a tight cluster across distinct offsets in id order', () => {
    // Florida-style cluster: well within the ~75 km chord threshold.
    const out = computeLabelOffsets([
      site('slc-41', 28.58, -80.58),
      site('slc-40', 28.56, -80.57),
      site('lc-39a', 28.61, -80.6),
      site('lc-39b', 28.62, -80.62),
    ]);
    const ids = ['lc-39a', 'lc-39b', 'slc-40', 'slc-41'];
    const offsets = ids.map((id) => out.get(id)!.toArray().join(','));
    expect(new Set(offsets).size).toBe(4);
    expect(offsets[0]).toBe('0,3.2,0');
    expect(offsets[1]).toBe('2.6,-2,0');
  });

  it('does not cluster distant sites', () => {
    const out = computeLabelOffsets([site('a', 0, 0), site('b', 0, 90)]);
    expect(out.get('a')?.toArray()).toEqual([0, 3.2, 0]);
    expect(out.get('b')?.toArray()).toEqual([0, 3.2, 0]);
  });
});
