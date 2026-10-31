import { describe, expect, it } from 'vitest';
import { localHref } from './locale';

describe('localHref in en-US', () => {
  it('leaves the path unprefixed', () => {
    expect(localHref('/fleet?id=mariner-4')).toBe('/fleet?id=mariner-4');
    expect(localHref('/')).toBe('/');
  });
});
