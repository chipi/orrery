import { describe, expect, it } from 'vitest';
import { MOON_MISSION_DEST_IDS } from '$lib/physics/transfer/lambert-grid.constants';
import { moonPeriodDays, select2dTargets } from './fly-2d-targets';

describe('select2dTargets (G-12a)', () => {
  it('a Jupiter flight draws Jupiter, never Mars', () => {
    expect(select2dTargets('jupiter', null, false)).toEqual({ bodyId: 'jupiter', moonId: null });
  });

  it('a Mars flight draws Mars', () => {
    expect(select2dTargets('mars', null, false).bodyId).toBe('mars');
  });

  it('a Europa flight draws Jupiter plus the named Europa', () => {
    expect(select2dTargets('jupiter', 'europa', false)).toEqual({
      bodyId: 'jupiter',
      moonId: 'europa',
    });
  });

  it('resolves the host from the moon even when the active destination is a stand-in', () => {
    expect(select2dTargets('mars', 'titan', false)).toEqual({ bodyId: 'saturn', moonId: 'titan' });
  });

  it('every one of the nine moons has a host body and a period', () => {
    expect(MOON_MISSION_DEST_IDS).toHaveLength(9);
    for (const id of MOON_MISSION_DEST_IDS) {
      expect(select2dTargets('mars', id, false).bodyId).not.toBeNull();
      expect(moonPeriodDays(id)).toBeGreaterThan(0);
    }
  });

  it('a Sun-target mission draws no destination body', () => {
    expect(select2dTargets('mars', null, true)).toEqual({ bodyId: null, moonId: null });
  });
});
