import { describe, expect, it } from 'vitest';
import { suggestedCorrection } from './url-typo';

describe('suggestedCorrection', () => {
  it('turns the first & into ? on a root deploy', () => {
    expect(suggestedCorrection('/missions&debug=1', '')).toBe('/missions?debug=1');
  });

  it('does not double the base on a subpath deploy (staging /orrery)', () => {
    // Was /orrery/orrery/missions?debug=1 on staging (2026-10-17).
    expect(suggestedCorrection('/orrery/missions&debug=1', '')).toBe('/orrery/missions?debug=1');
  });

  it('keeps an existing query string and joins with &', () => {
    expect(suggestedCorrection('/fly&debug=1', '?mission=apollo11')).toBe(
      '/fly?mission=apollo11&debug=1',
    );
  });

  it('returns null without a typo', () => {
    expect(suggestedCorrection('/missions', '')).toBeNull();
    expect(suggestedCorrection('&x', '')).toBeNull();
  });
});
