import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { srcsetFor, loadLadder, ladderSources } from './image-srcset';

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

describe('loadLadder (SSR / node)', () => {
  it('resolves to an empty manifest without fetching under SSR (browser=false)', async () => {
    // In the test (node) environment `browser` is false, so loadLadder
    // short-circuits to {} rather than hitting the network — this is the
    // guard that keeps an empty manifest from poisoning the module cache.
    await expect(loadLadder()).resolves.toEqual({});
  });
});

describe('ladderSources', () => {
  it('returns null when the manifest cache is not populated', () => {
    // No successful browser-side loadLadder has run, so the cache is null
    // and callers fall back to the plain <img src>.
    expect(ladderSources('https://x/images/missions/curiosity/01.jpg')).toBeNull();
  });
});

describe('image-ladder manifest — mobile-rung invariant (PRD-035 Part 1 / #482)', () => {
  // Every laddered image MUST expose a rung a phone can use (≤1280px); its base
  // counts as a rung. Guards against a regression re-introducing the over-serve
  // that `scripts/mobile/add-mobile-rung.mjs` fixed. If this fails after adding
  // large images, run: node scripts/mobile/add-mobile-rung.mjs
  const manifest: Record<string, number[]> = JSON.parse(
    readFileSync('static/data/image-ladder.json', 'utf8'),
  );
  it('every ladder entry has a rung ≤ 1280px', () => {
    const overserve = Object.entries(manifest).filter(
      ([, widths]) => !widths.some((w) => w <= 1280),
    );
    expect(overserve).toEqual([]);
  });
});
