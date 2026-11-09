import { describe, it, expect } from 'vitest';
import { inAzimuth, syntheticRegionAt, type SyntheticRegion } from './panorama-regions';

const wedge = (min: number, max: number): SyntheticRegion => ({
  pitch_min_deg: -90,
  pitch_max_deg: 90,
  azimuth_min_deg: min,
  azimuth_max_deg: max,
  kind: 'unphotographed',
});

describe('inAzimuth', () => {
  it('a plain range', () => {
    const viking1 = wedge(270, 287.5);
    expect(inAzimuth(viking1, 280)).toBe(true);
    expect(inAzimuth(viking1, 300)).toBe(false);
  });

  it('a range that wraps through 0 (min > max)', () => {
    const chandrayaan3 = wedge(270, 220); // 50° photographed, 310° gap
    expect(inAzimuth(chandrayaan3, 300)).toBe(true);
    expect(inAzimuth(chandrayaan3, 10)).toBe(true);
    expect(inAzimuth(chandrayaan3, 240)).toBe(false); // the photographed slice
    expect(inAzimuth(chandrayaan3, -100)).toBe(false); // −100 ≡ 260: inside the photograph
  });

  it('no azimuth range = every yaw', () => {
    expect(inAzimuth({ pitch_min_deg: 50, pitch_max_deg: 90, kind: 'synthetic_sky' }, 123)).toBe(
      true,
    );
  });
});

describe('syntheticRegionAt', () => {
  const regions: SyntheticRegion[] = [
    wedge(270, 90),
    { pitch_min_deg: -90, pitch_max_deg: -30, kind: 'no_data' },
  ];

  it('needs both pitch and yaw inside', () => {
    expect(syntheticRegionAt(regions, 0, 0)?.kind).toBe('unphotographed');
    expect(syntheticRegionAt(regions, 0, 180)).toBeNull();
    expect(syntheticRegionAt(regions, -60, 180)?.kind).toBe('no_data');
  });

  it('null regions → null', () => {
    expect(syntheticRegionAt(null, 0, 0)).toBeNull();
  });
});
