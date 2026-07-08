import { describe, it, expect } from 'vitest';
import { srcsetFor } from './image-srcset';

describe('srcsetFor', () => {
  const manifest = {
    '/images/missions/curiosity/01': [1280, 2048, 3072],
    '/images/fleet-galleries/aces/02': [1024],
  };

  it('builds a WebP srcset with the largest as the unsuffixed base + src', () => {
    const r = srcsetFor(
      'https://chipi.github.io/orrery/images/missions/curiosity/01.jpg',
      manifest,
    );
    expect(r).toEqual({
      src: 'https://chipi.github.io/orrery/images/missions/curiosity/01.webp',
      srcset:
        'https://chipi.github.io/orrery/images/missions/curiosity/01-1280.webp 1280w, ' +
        'https://chipi.github.io/orrery/images/missions/curiosity/01-2048.webp 2048w, ' +
        'https://chipi.github.io/orrery/images/missions/curiosity/01.webp 3072w',
    });
  });

  it('preserves a local base prefix + accepts a webp input url', () => {
    const r = srcsetFor('/orrery/images/missions/curiosity/01.webp', manifest);
    expect(r?.srcset).toContain('/orrery/images/missions/curiosity/01-1280.webp 1280w');
    expect(r?.src).toBe('/orrery/images/missions/curiosity/01.webp');
  });

  it('handles a single-rung small image (base only)', () => {
    const r = srcsetFor('/images/fleet-galleries/aces/02.jpg', manifest);
    expect(r).toEqual({
      src: '/images/fleet-galleries/aces/02.webp',
      srcset: '/images/fleet-galleries/aces/02.webp 1024w',
    });
  });

  it('returns null when the image has no ladder (hotspots / unknown)', () => {
    expect(srcsetFor('/images/hotspots/moon/luna9/tier2.jpg', manifest)).toBeNull();
  });

  it('returns null for a non-image URL', () => {
    expect(srcsetFor('/data/foo.json', manifest)).toBeNull();
  });
});
