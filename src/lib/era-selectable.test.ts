import { describe, expect, it } from 'vitest';
import { eraSelectable } from './epoch-bands';

describe('eraSelectable (an era with no entries is dimmed and not selectable)', () => {
  it('an era with entries can be chosen', () => {
    expect(eraSelectable(5, false)).toBe(true);
  });
  it('an era with 0 entries, or none counted, cannot', () => {
    expect(eraSelectable(0, false)).toBe(false);
    expect(eraSelectable(undefined, false)).toBe(false);
  });
  it('an empty era that is already chosen (a link into it) can still be cleared', () => {
    expect(eraSelectable(0, true)).toBe(true);
  });
});
