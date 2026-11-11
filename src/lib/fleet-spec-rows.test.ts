import { describe, it, expect } from 'vitest';
import { fleetSpecRows } from './fleet-spec-rows';
import type { FleetEntry } from '$types/fleet';

const entry = (specs: FleetEntry['specs']) => ({ id: 'x', specs }) as unknown as FleetEntry;

describe('fleetSpecRows', () => {
  it('lists only the specs the entry has, in the fixed order', () => {
    const rows = fleetSpecRows(entry({ stages: 3, height_m: 110.6, crew_capacity: '' }));
    expect(rows.map((r) => r.key)).toEqual(['height_m', 'stages']);
  });

  it('formats numbers for the given locale', () => {
    const [mass] = fleetSpecRows(entry({ mass_kg: 2970000 }), 'de');
    expect(mass.value).toContain('2.970.000');
  });

  it('translates known engine cycle words and keeps unknown ones', () => {
    const rows = fleetSpecRows(entry({ cycle: 'gas-generator' }));
    expect(rows[0].value).not.toBe('gas-generator');
    expect(fleetSpecRows(entry({ cycle: 'pressure-fed' }))[0].value).toBe('pressure-fed');
  });

  it('returns nothing for an entry without specs', () => {
    expect(fleetSpecRows({ id: 'x' } as unknown as FleetEntry)).toEqual([]);
  });
});
