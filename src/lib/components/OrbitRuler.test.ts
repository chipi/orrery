import { describe, it, expect, vi } from 'vitest';
import { render } from 'svelte/server';
import OrbitRuler from './OrbitRuler.svelte';
import type { OrbitRegime } from '$types/orbit-regime';

// No router context in a server render: the ruler only reads the locale off the URL.
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/') } }));

const regimes: OrbitRegime[] = [
  { id: 'LEO', name: 'Low Earth Orbit', short: 'LEO', altitude_km: [160, 2000], color: '#4ecdc4' },
  { id: 'GEO', name: 'Geostationary Orbit', short: 'GEO', altitude_km: 35786, color: '#ffc850' },
  { id: 'L2', name: 'Sun-Earth L2', short: 'L2', altitude_km: 1500000, color: '#ffd700' },
];
const html = (props: Record<string, unknown> = {}) =>
  render(OrbitRuler, { props: { regimes, onSelect: () => {}, ...props } }).body;

describe('OrbitRuler markup contract', () => {
  it('renders one button per regime, tagged with its id and the full name as the title', () => {
    const out = html();
    for (const r of regimes) {
      expect(out).toContain(`data-regime="${r.id}"`);
      expect(out).toContain(`title="${r.name}"`);
    }
  });

  it('stacks the outermost regime first when no order is given', () => {
    const out = html();
    expect(out.indexOf('data-regime="L2"')).toBeLessThan(out.indexOf('data-regime="GEO"'));
    expect(out.indexOf('data-regime="GEO"')).toBeLessThan(out.indexOf('data-regime="LEO"'));
  });

  it('the header is a disclosure button: aria-expanded, aria-controls, an accessible name', () => {
    const out = html();
    expect(out).toContain('data-testid="ruler-toggle"');
    expect(out).toContain('aria-expanded="true"');
    expect(out).toMatch(/aria-controls="ruler-bands-[a-z0-9]+"/);
    // The name is the visible title; the state is aria-expanded, so no flipping aria-label.
    expect(out).toMatch(/data-testid="ruler-toggle"[^>]*>\s*<span[^>]*>ORBIT RULER/);
    expect(out).not.toContain('Collapse the orbit ruler');
    expect(out).toContain('▾');
  });

  it('collapsible={false} (the touch drawer) has no toggle and keeps the rows', () => {
    const out = html({ collapsible: false });
    expect(out).not.toContain('ruler-toggle');
    expect(out).toContain('data-regime="LEO"');
  });

  it('activeRegime and highlightRegime mark the band aria-current', () => {
    expect(html({ activeRegime: 'GEO' })).toMatch(
      /band--active[^>]*aria-current="true"|aria-current="true"[^>]*band--active/,
    );
    expect(html({ highlightRegime: 'LEO' })).toContain('band--highlighted');
    expect(html()).not.toContain('aria-current');
  });

  it('sets the surface row but not for the explore ruler (surfaceAnchor null)', () => {
    expect(html()).toContain('surface-row');
    expect(html({ surfaceAnchor: null })).not.toContain('surface-row');
  });
});
