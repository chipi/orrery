import { describe, expect, it } from 'vitest';
import type { SurfaceSite } from '$types/surface-site';
import { detailGroundKm, routePatchFlatTarget } from './flat-patch-extent';

const RADIUS_KM = 1737.4;
const M_PER_DEG = (Math.PI / 180) * RADIUS_KM * 1000;

describe('detailGroundKm', () => {
  it('uses the detail image own ground width, so a track vertex lands on the imaged ground point', () => {
    const km = detailGroundKm({ hotspot_tier2_ground_m: 819.2 }, 'moon');
    // The image is drawn across `km` of ground; a point 150 m east of the
    // centre sits at 150/(km*1000) of the half-width from the centre.
    const dLonDeg = 150 / M_PER_DEG;
    const drawnHalfWidthDeg = (km * 1000) / 2 / M_PER_DEG;
    expect(dLonDeg / drawnHalfWidthDeg).toBeCloseTo(150 / 409.6, 6);
  });

  it('falls back to the per-planet default when the site records no extent', () => {
    expect(detailGroundKm({}, 'moon')).toBe(1.0);
    expect(detailGroundKm({}, 'mars')).toBe(1.5);
    expect(detailGroundKm({}, 'earth')).toBe(0.5);
  });
});

describe('routePatchFlatTarget', () => {
  const site = {
    id: 'apollo16',
    lat: -8.9729,
    lon: 15.5001,
    hotspot_tier2_source: '/landing.jpg',
    hotspot_tier2_ground_m: 819.2,
  } as unknown as SurfaceSite;
  const tile = (over: Partial<Parameters<typeof routePatchFlatTarget>[1]> = {}) => ({
    id: 'start',
    lat: -8.97286,
    lon: 15.50369,
    image: '/start.webp',
    ground_m: 512,
    resolution_m_per_px: 2,
    ...over,
  });

  it('keeps the landing detail when it is sharper and covers the tile', () => {
    expect(routePatchFlatTarget(site, tile(), RADIUS_KM)).toBeNull();
  });

  it('uses the tile, at the tile own ground width, when the tile is sharper', () => {
    const t = routePatchFlatTarget(site, tile({ resolution_m_per_px: 0.25 }), RADIUS_KM);
    expect(t?.hotspot_tier2_source).toBe('/start.webp');
    expect(t?.hotspot_tier2_ground_m).toBe(512);
  });

  it('uses a coarse tile far from the landing, where no landing detail exists', () => {
    const t = routePatchFlatTarget(site, tile({ lat: -8.95 }), RADIUS_KM);
    expect(t?.hotspot_tier2_ground_m).toBe(512);
  });
});
