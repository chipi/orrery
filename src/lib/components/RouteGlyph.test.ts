import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import RouteGlyph, { ROUTE_GLYPHS } from './RouteGlyph.svelte';
import { SCALE_GLYPHS } from './ScaleGlyph.svelte';

const html = (glyph: string, variant?: 'home' | 'hub') =>
  render(RouteGlyph, { props: { glyph, variant } as never }).body;

describe('RouteGlyph glyph map', () => {
  it('draws something for every route glyph, including the Lab', () => {
    expect(ROUTE_GLYPHS.has('lab')).toBe(true);
    for (const glyph of ROUTE_GLYPHS) expect(html(glyph), glyph).toMatch(/<(circle|rect|path|g)\b/);
  });

  it('delegates the Explore scale-level glyphs to ScaleGlyph', () => {
    for (const glyph of SCALE_GLYPHS) expect(html(glyph), glyph).toMatch(/<circle\b/);
  });

  it('draws nothing for an unknown id', () => {
    expect(html('nope').replace(/<!--.*?-->/g, '')).toBe('');
  });

  it('covers every glyph id the home grid names', () => {
    const src = readFileSync('src/routes/+page.svelte', 'utf8');
    const start = src.indexOf('const grid: GridItem[]');
    const grid = src.slice(start, src.indexOf(']);', start));
    const ids = [...grid.matchAll(/^\s+glyph: '([a-z-]+)'/gm)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(10);
    for (const id of ids) expect(ROUTE_GLYPHS.has(id), id).toBe(true);
  });

  it('keeps the hub drawing only where the two copies differed (earth, programs, live, essays)', () => {
    const differing = new Set(['earth', 'programs', 'live', 'essays']);
    for (const glyph of ROUTE_GLYPHS) {
      const same = html(glyph, 'home') === html(glyph, 'hub');
      expect(same, glyph).toBe(!differing.has(glyph));
    }
  });
});
