import { describe, it, expect } from 'vitest';
import { deepLinkTarget } from './deep-links';

describe('deepLinkTarget', () => {
  it('maps scheme host → first path segment, carrying query', () => {
    expect(deepLinkTarget('orrery://fly?mission=curiosity')).toBe('/fly?mission=curiosity');
    expect(deepLinkTarget('orrery://missions?dest=MARS')).toBe('/missions?dest=MARS');
  });
  it('handles a bare host with no query', () => {
    expect(deepLinkTarget('orrery://explore')).toBe('/explore');
  });
  it('carries a deeper path (host + pathname)', () => {
    expect(deepLinkTarget('orrery://science/transfers/hohmann')).toBe('/science/transfers/hohmann');
  });
  it('carries a hash', () => {
    expect(deepLinkTarget('orrery://fly#capcom')).toBe('/fly#capcom');
  });
  it('preserves `//` inside query/hash values (the collapse-path-only fix)', () => {
    expect(deepLinkTarget('orrery://fly?ref=https://example.com')).toBe(
      '/fly?ref=https://example.com',
    );
  });
  it('collapses duplicate slashes in the path only', () => {
    // A stray double slash in the path is normalised…
    expect(deepLinkTarget('orrery://fly//sub')).toBe('/fly/sub');
  });
  it('returns null on a malformed URL', () => {
    expect(deepLinkTarget('not a url')).toBeNull();
    expect(deepLinkTarget('')).toBeNull();
  });
});
