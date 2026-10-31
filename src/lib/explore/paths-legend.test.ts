import { describe, expect, it } from 'vitest';
import { INTERSTELLAR_CRAFT, PATHS_LEGEND, iconicTagline } from './paths-legend';

describe('PATHS legend', () => {
  it('has 18 rows with unique mission ids and colours', () => {
    expect(PATHS_LEGEND).toHaveLength(18);
    expect(new Set(PATHS_LEGEND.map((r) => r.mission_id)).size).toBe(18);
    expect(new Set(PATHS_LEGEND.map((r) => r.color)).size).toBe(18);
  });

  it('is ordered oldest -> newest by launch year', () => {
    const years = PATHS_LEGEND.map((r) => r.launch_year);
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });

  it('every row has a tagline; unknown ids get none', () => {
    for (const r of PATHS_LEGEND) expect(iconicTagline(r.mission_id), r.mission_id).not.toBe('');
    expect(iconicTagline('not-a-mission')).toBe('');
  });

  it('every interstellar craft is a legend row', () => {
    const ids = new Set(PATHS_LEGEND.map((r) => r.mission_id));
    for (const c of INTERSTELLAR_CRAFT) expect(ids.has(c), c).toBe(true);
  });
});
