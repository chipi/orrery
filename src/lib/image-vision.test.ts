import { describe, it, expect } from 'vitest';
import { pickVariant, type ImageVisionEntry } from './image-vision';

/**
 * Image Pipeline v2 — variant selector unit tests (PRD-018 / RFC-022).
 *
 * Covers the MOBILE=1 selector (S9) — when isMobile=true, hero surfaces
 * resolve to the 4:3 (portrait-leaning) variant instead of 16:9. This
 * is the bundle-savings lever; if the wiring breaks silently the mobile
 * fleet-gallery bucket regresses ~30 MB (PRD-018 success-criterion #6).
 *
 * Why not pure e2e: the surface→variant mapping is data-only — easier
 * to assert in isolation than to set up a full Capacitor MOBILE=1
 * build and probe the served paths.
 */

const sampleEntry: ImageVisionEntry = {
  score: 8,
  subject: 'Sample',
  category: 'spacecraft',
  focal_point: { x: 0.5, y: 0.5 },
  variants: {
    '1x1': '/images/foo.1x1.jpg',
    '4x3': '/images/foo.4x3.jpg',
    '16x9': '/images/foo.16x9.jpg',
  },
  rejected_by: null,
  fallback: false,
  scored_at: '2026-05-24T00:00:00Z',
  scoring_cost_usd: 0.0077,
};

describe('pickVariant — image-pipeline v2 surface→variant mapping', () => {
  it('thumbnail always returns 1:1 (mobile + desktop)', () => {
    expect(pickVariant(sampleEntry, 'thumbnail', false)).toBe('/images/foo.1x1.jpg');
    expect(pickVariant(sampleEntry, 'thumbnail', true)).toBe('/images/foo.1x1.jpg');
  });

  it('card returns 4:3 on both desktop and mobile', () => {
    expect(pickVariant(sampleEntry, 'card', false)).toBe('/images/foo.4x3.jpg');
    expect(pickVariant(sampleEntry, 'card', true)).toBe('/images/foo.4x3.jpg');
  });

  it('hero returns 16:9 on desktop and 4:3 on mobile (S9 bundle savings)', () => {
    expect(pickVariant(sampleEntry, 'hero', false)).toBe('/images/foo.16x9.jpg');
    expect(pickVariant(sampleEntry, 'hero', true)).toBe('/images/foo.4x3.jpg');
  });

  it('full returns undefined (caller falls back to source path)', () => {
    expect(pickVariant(sampleEntry, 'full', false)).toBeUndefined();
    expect(pickVariant(sampleEntry, 'full', true)).toBeUndefined();
  });

  it('undefined entry returns undefined', () => {
    expect(pickVariant(undefined, 'hero', false)).toBeUndefined();
    expect(pickVariant(undefined, 'thumbnail', true)).toBeUndefined();
  });
});
