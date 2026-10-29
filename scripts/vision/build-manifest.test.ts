import { describe, expect, it } from 'vitest';
import { computeRejectedBy } from './build-manifest';

describe('computeRejectedBy — renders', () => {
  const render = { score: 9, category: 'render' as const };

  it('keeps renders for missions that never flew (PLANNED, CANCELLED)', () => {
    expect(computeRejectedBy({ ...render, missionStatus: 'PLANNED' })).toBeNull();
    expect(computeRejectedBy({ ...render, missionStatus: 'CANCELLED' })).toBeNull();
  });

  it('rejects renders for missions with real imagery (FLOWN)', () => {
    expect(computeRejectedBy({ ...render, missionStatus: 'FLOWN' })).toBe('score-below-threshold');
  });
});
