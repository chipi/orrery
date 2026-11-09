import { describe, expect, it } from 'vitest';
import { detailGroundKm } from './flat-patch-extent';

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
