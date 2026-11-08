import { describe, expect, it } from 'vitest';
import { buildTierContext } from './tier-context';

const chip = { label: 'USSR', color: '#c00' };

describe('buildTierContext', () => {
  it('carries the site uncertainty when the position is known', () => {
    const tc = buildTierContext({
      site: { id: 'luna16', name: 'Luna 16', location_uncertainty_m: 50 },
      agencyChip: chip,
      layers: [],
    });
    expect(tc.uncertaintyM).toBe(50);
    expect(tc.locationUnconfirmed).toBeUndefined();
  });

  it('flags a landing spot never confirmed in orbital imagery (Luna 9)', () => {
    const tc = buildTierContext({
      site: { id: 'luna9', name: 'Luna 9', location_unconfirmed: true },
      agencyChip: chip,
      layers: [],
    });
    expect(tc.locationUnconfirmed).toBe(true);
    expect(tc.uncertaintyM).toBeUndefined();
  });
});
