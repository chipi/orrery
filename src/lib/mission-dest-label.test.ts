import { describe, expect, it } from 'vitest';
import { missionDestLabel } from './mission-dest-label';

describe('missionDestLabel', () => {
  it('labels filter destinations, upper-cases /plan destinations, passes unknown codes through', () => {
    expect(missionDestLabel('MARS')).toBe('MARS');
    expect(missionDestLabel('DIDYMOS')).toBe('DIDYMOS');
    expect(missionDestLabel('VENUS')).toBe('VENUS');
    expect(missionDestLabel('XYZ')).toBe('XYZ');
  });
});
