import { describe, it, expect } from 'vitest';
import { pickVariant, type ImageVisionEntry } from './image-vision';

/**
 * Image Pipeline v2 — variant selector unit tests (PRD-018 / RFC-022).
 *
 * Post-2026-06-26: 1x1 is the only generated variant. The 4x3 (card) /
 * 16x9 (hero) crops were retired — no UI consumed them (every pickVariant
 * caller passes 'thumbnail'; surface scenes read 1x1). These tests lock
 * the surviving contract: thumbnail → 1x1, every other surface → undefined
 * so the caller falls back to the raw source path.
 */

const sampleEntry: ImageVisionEntry = {
  score: 8,
  subject: 'Sample',
  category: 'spacecraft',
  focal_point: { x: 0.5, y: 0.5 },
  variants: {
    '1x1': '/images/foo.1x1.jpg',
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

  it('card / hero return undefined (4x3/16x9 retired — caller uses source path)', () => {
    expect(pickVariant(sampleEntry, 'card', false)).toBeUndefined();
    expect(pickVariant(sampleEntry, 'card', true)).toBeUndefined();
    expect(pickVariant(sampleEntry, 'hero', false)).toBeUndefined();
    expect(pickVariant(sampleEntry, 'hero', true)).toBeUndefined();
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
