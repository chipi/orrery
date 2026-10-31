import { describe, expect, it } from 'vitest';
import {
  fleetStatusLabel,
  missionStatusLabel,
  programStatusLabel,
  surfaceStatusLabel,
} from './status-label';

describe('status labels (en-US)', () => {
  it('labels every known code', () => {
    expect(['ACTIVE', 'FLOWN', 'PLANNED', 'CANCELLED'].map(missionStatusLabel)).toEqual([
      'ACTIVE',
      'FLOWN',
      'PLANNED',
      'CANCELLED',
    ]);
    expect(['ACTIVE', 'FLOWN', 'RETIRED', 'FAILED', 'PLANNED'].map(fleetStatusLabel)).toEqual([
      'ACTIVE',
      'FLOWN',
      'RETIRED',
      'FAILED',
      'PLANNED',
    ]);
    expect(['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map(programStatusLabel)).toEqual([
      'PLANNED',
      'ACTIVE',
      'COMPLETED',
      'CANCELLED',
    ]);
    expect(
      ['ACTIVE', 'FLOWN', 'PLANNED', 'RETIRED', 'ENDED', 'CRASHED', 'LOST'].map(surfaceStatusLabel),
    ).toEqual(['ACTIVE', 'FLOWN', 'PLANNED', 'RETIRED', 'ENDED', 'CRASHED', 'LOST']);
  });

  it('passes an unknown code through instead of throwing', () => {
    expect(missionStatusLabel('MYSTERY')).toBe('MYSTERY');
    expect(surfaceStatusLabel('toString')).toBe('toString');
  });
});
