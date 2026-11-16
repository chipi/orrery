import { describe, expect, it } from 'vitest';
import { INDEX_KIND_GLYPHS, indexKindGlyph } from './index-kind-glyph';

describe('indexKindGlyph', () => {
  it.each([
    ['globular-cluster', 'globular'],
    ['galaxy', 'galaxy'],
    ['satellite-galaxy', 'galaxy'],
    ['dwarf-spheroidal', 'galaxy'],
    ['star-cluster', 'cluster'],
    ['galaxy-cluster', 'cluster'],
    ['nebula', 'nebula'],
    ['star-forming-region', 'nebula'],
    ['dark-nebula', 'nebula'],
    ['planetary-nebula', 'shell'],
    ['supernova-remnant', 'shell'],
    ['group', 'group'],
    ['supercluster', 'network'],
    ['wall', 'wall'],
    ['void', 'void'],
    ['attractor', 'attractor'],
    ['spiral-arm', 'arm'],
    ['star', 'star'],
    ['other', 'other'],
  ])('%s draws %s', (kind, glyph) => {
    expect(indexKindGlyph(kind)).toBe(glyph);
  });

  it('draws a black hole for the black-hole kinds and for a black-hole row', () => {
    expect(indexKindGlyph('supermassive', true)).toBe('black-hole');
    expect(indexKindGlyph('fictional')).toBe('black-hole');
    expect(indexKindGlyph('stellar-black-hole')).toBe('black-hole');
  });

  it('an unknown kind falls back to the generic object glyph', () => {
    expect(indexKindGlyph('made-up')).toBe('other');
  });

  it('every glyph of the set is reachable and named once', () => {
    expect(new Set(INDEX_KIND_GLYPHS).size).toBe(INDEX_KIND_GLYPHS.length);
    const reached = new Set(
      [
        'star',
        'galaxy',
        'star-cluster',
        'globular-cluster',
        'nebula',
        'planetary-nebula',
        'group',
        'supercluster',
        'wall',
        'void',
        'attractor',
        'spiral-arm',
        'other',
        'supermassive',
      ].map((k) => indexKindGlyph(k)),
    );
    for (const g of INDEX_KIND_GLYPHS) expect(reached.has(g)).toBe(true);
  });
});
