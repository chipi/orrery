import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import IndexFiltersToggle from './IndexFiltersToggle.svelte';

const html = (props: Record<string, unknown>) =>
  render(IndexFiltersToggle, { props: { onclick: () => {}, ...props } as never }).body;

describe('IndexFiltersToggle markup contract (C6-F)', () => {
  it('is a button that says whether the fold is open and which region it controls', () => {
    const closed = html({ open: false, count: 0, controls: 'fold-1' });
    expect(closed).toContain('<button');
    expect(closed).toContain('aria-expanded="false"');
    expect(closed).toContain('aria-controls="fold-1"');
    expect(closed).toContain('data-testid="index-filters-toggle"');
    expect(closed).toContain('idx-filters-btn');
    expect(html({ open: true, count: 0, controls: 'fold-1' })).toContain('aria-expanded="true"');
  });

  it('draws the chevron down when closed and up when open, hidden from the accessible name', () => {
    expect(html({ open: false, count: 0, controls: 'f' })).toMatch(
      /idx-filters-chevron[^>]*aria-hidden="true">▾/,
    );
    expect(html({ open: true, count: 0, controls: 'f' })).toMatch(
      /idx-filters-chevron[^>]*aria-hidden="true">▴/,
    );
  });

  it('shows the count of filters on only when there is one', () => {
    expect(html({ open: false, count: 0, controls: 'f' })).not.toContain('idx-filters-n');
    expect(html({ open: false, count: 2, controls: 'f' })).toMatch(/idx-filters-n[^>]*>2</);
  });
});
