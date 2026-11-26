import { describe, it, expect } from 'vitest';
import { moonShown } from './fly-moon-visibility';

describe('moonShown', () => {
  it('the flyby cinema shows only the flown-by body’s moons', () => {
    expect(moonShown('earth', true, 'dinkinesh', false)).toBe(false);
    expect(moonShown('jupiter', true, 'jupiter', false)).toBe(true);
  });

  it('the moons layer shows them all', () => {
    expect(moonShown('earth', true, null, false)).toBe(true);
    expect(moonShown('mars', false, null, false)).toBe(false);
  });

  it('a target moon always shows', () => {
    expect(moonShown('earth', false, 'jupiter', true)).toBe(true);
  });
});
