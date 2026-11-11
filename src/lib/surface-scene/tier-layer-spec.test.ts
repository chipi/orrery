import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { SurfaceSite } from '$types/surface-site';
import { detailBadgeLabel, detailLayerSpec, regionalCropSpec } from './tier-layer-spec';

const hotspots = JSON.parse(readFileSync('static/data/surface-hotspots.json', 'utf8'));
const site = (planet: string, id: string): SurfaceSite => {
  const h = Object.values(hotspots as Record<string, Record<string, object>>)
    .map((p) => p[id])
    .find(Boolean);
  return { id, ...h } as SurfaceSite;
};

describe('regionalCropSpec', () => {
  it('Earth pad: 32 km at 10 m/px = 3200 px, from the recorded ground extent', () => {
    expect(regionalCropSpec(site('earth', 'kourou-ela-2'), 'earth')).toEqual({
      cropPx: 3200,
      groundKm: 32,
      mPerPx: 10,
    });
  });
  it('Kaguya Moon site follows its recorded extent (luna16 25.5 km over 2560 px)', () => {
    const c = regionalCropSpec(site('moon', 'luna16'), 'moon');
    expect(c.cropPx).toBe(2560);
    expect(c.groundKm).toBeCloseTo(25.497, 3);
    expect(c.mPerPx).toBeCloseTo(9.96, 2);
  });
  it('LROC ROI Moon site: 15.36 km over 3072 px at 5 m/px', () => {
    expect(regionalCropSpec(site('moon', 'apollo11'), 'moon')).toMatchObject({
      cropPx: 3072,
      mPerPx: 5,
    });
  });
});

describe('detail badge', () => {
  it('Earth EOX pad (kourou-ela-2) is Sentinel-2 10 m/px, not commercial 30 cm', () => {
    expect(detailLayerSpec(site('earth', 'kourou-ela-2'), 'earth').kind).toBe('eox');
    expect(detailBadgeLabel(site('earth', 'kourou-ela-2'), 'earth')).toBe('~10 m/px · Sentinel-2');
  });
  it('Earth US pad (cape-canaveral-slc-40) is NAIP 0.5 m/px', () => {
    expect(detailBadgeLabel(site('earth', 'cape-canaveral-slc-40'), 'earth')).toBe(
      '~0.5 m/px · NAIP',
    );
  });
  it('Earth Japan and NZ pads name GSI and LINZ', () => {
    expect(
      detailBadgeLabel({ id: 'uchinoura', hotspot_tier2_ground_m: 512 } as SurfaceSite, 'earth'),
    ).toBe('~0.5 m/px · GSI');
    expect(
      detailBadgeLabel(
        { id: 'rocket-lab-lc-1', hotspot_tier2_ground_m: 512 } as SurfaceSite,
        'earth',
      ),
    ).toBe('~0.25 m/px · LINZ');
  });
  it('Moon Kaguya-detail site (luna9) says Kaguya TC, a LROC site says LROC NAC', () => {
    expect(detailBadgeLabel(site('moon', 'luna9'), 'moon')).toBe('~6 m/px · Kaguya TC');
    expect(detailBadgeLabel(site('moon', 'apollo11'), 'moon')).toBe('~0.5–2 m/px · LROC NAC');
  });
  it('Mars site says HiRISE', () => {
    expect(detailBadgeLabel(site('mars', 'curiosity'), 'mars')).toBe('~0.25 m/px · HiRISE');
  });
});
