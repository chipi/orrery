import { describe, it, expect } from 'vitest';
import { publicShareUrl } from './share';
import { STREAM_ORIGIN } from './asset-url';

describe('publicShareUrl', () => {
  const loc = {
    href: 'capacitor://localhost/fly?mission=curiosity',
    pathname: '/fly',
    search: '?mission=curiosity',
    hash: '',
  };

  it('rebuilds a public deployed URL on native (never the capacitor:// origin)', () => {
    expect(publicShareUrl(loc, true)).toBe(`${STREAM_ORIGIN}/fly?mission=curiosity`);
    expect(publicShareUrl(loc, true)).not.toContain('localhost');
  });

  it('carries the hash', () => {
    expect(publicShareUrl({ ...loc, hash: '#capcom' }, true)).toBe(
      `${STREAM_ORIGIN}/fly?mission=curiosity#capcom`,
    );
  });

  it('uses the real href on web (already a public URL)', () => {
    const web = {
      href: 'https://chipi.github.io/orrery/fly?mission=curiosity',
      pathname: '/orrery/fly',
      search: '?mission=curiosity',
      hash: '',
    };
    expect(publicShareUrl(web, false)).toBe(web.href);
  });
});
