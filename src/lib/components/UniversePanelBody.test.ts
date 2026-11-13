import { describe, it, expect, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';

vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/explore') } }));
vi.mock('$app/environment', () => ({ browser: false }));
vi.mock('$app/paths', () => ({ base: '' }));

// The shell, the lightbox, the gallery grid and the why-popover are tested on their own; stubbing
// them keeps this test on the body's own markup (and out of their coverage).
type Payload = unknown;
type Props = { children?: (p: Payload) => void };
vi.mock('./Panel.svelte', () => ({
  default: (payload: Payload, props: Props) => props.children?.(payload),
}));
vi.mock('./PanelLightbox.svelte', () => ({ default: () => {} }));
vi.mock('./PanelGalleryGrid.svelte', () => ({ default: () => {} }));
vi.mock('./WhyPopover.svelte', () => ({ default: () => {} }));

import UniversePanelBody from './UniversePanelBody.svelte';

const base = { open: true, onClose: () => {}, title: 'Large Magellanic Cloud', entityId: 'lmc' };
const html = (props: Record<string, unknown>) =>
  render(UniversePanelBody, { props: { ...base, ...props } }).body;
const text = (s: string) => createRawSnippet(() => ({ render: () => `<span>${s}</span>` }));

describe('UniversePanelBody (B3, UXD-023)', () => {
  it('no hero: no hero slot and no empty frame', () => {
    const out = html({ kind: 'GALAXY', name: 'Virgo', lead: ['Lead.'] });
    expect(out).not.toContain('panel-hero');
    expect(out).not.toContain('<img');
  });

  it('a hero draws one PanelHeroImage; the portrait slot is not drawn beside it', () => {
    const out = html({
      name: 'Antares',
      hero: { src: '/images/stars/antares/01.webp', full: '/images/stars/antares/01.webp' },
      heroArt: text('portrait'),
    });
    expect(out.match(/class="panel-hero[ "]/g)).toHaveLength(1);
    expect(out).toContain('/images/stars/antares/01');
    expect(out).not.toContain('portrait');
  });

  it('no image hero: the heroArt (a star portrait) is the one hero', () => {
    const out = html({ name: 'Vega', heroArt: text('portrait'), heroCaption: 'Portrait' });
    expect(out.match(/class="panel-hero[ "]/g)).toHaveLength(1);
    expect(out).toContain('portrait');
    expect(out).toContain('Portrait');
  });

  it('the hero caption names what is pictured when the photo shows a part', () => {
    const out = html({
      name: 'Large Magellanic Cloud',
      hero: {
        src: '/images/deep-sky/jwst-tarantula.thumb.jpg',
        full: '/images/deep-sky/jwst-tarantula.jpg',
        pictured: 'Tarantula Nebula',
      },
    });
    expect(out).toContain('hero-caption');
    expect(out).toContain('Tarantula Nebula');
  });

  it('one tab draws no tab row; a second tab draws it', () => {
    expect(html({ name: 'X', lead: ['a'] })).not.toContain('role="tablist"');
    const out = html({ name: 'X', tabs: [{ id: 'technical', label: 'TECHNICAL' }] });
    expect(out).toContain('role="tablist"');
    expect(out).toContain('id="up-tab-technical"');
  });

  it('GALLERY is the second tab, and only with two or more images', () => {
    const tabs = [{ id: 'technical', label: 'TECHNICAL' }];
    const one = html({ name: 'X', tabs, gallery: ['/images/stars/x/01.webp'] });
    expect(one).not.toContain('up-tab-gallery');
    const two = html({
      name: 'X',
      tabs,
      gallery: ['/images/stars/x/01.webp', '/images/stars/x/02.webp'],
    });
    const ids = [...two.matchAll(/id="up-tab-([a-z]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(['overview', 'gallery', 'technical']);
  });

  it('the lead is .editorial and the facts are the planet cell look', () => {
    const out = html({
      name: 'X',
      lead: ['One.', 'Two.'],
      facts: [{ label: 'DISTANCE', value: '163,000 ly', accent: true }],
    });
    expect(out.match(/class="editorial"/g)).toHaveLength(2);
    expect(out).toContain('cell-label');
    expect(out).toContain('163,000 ly');
  });

  it('actions go in the one action row above the hero', () => {
    const out = html({
      name: 'X',
      actions: text('Enter system'),
      hero: { src: '/images/stars/a/01.webp', full: '/images/stars/a/01.webp' },
    });
    expect(out.indexOf('panel-actions')).toBeGreaterThan(-1);
    expect(out.indexOf('panel-actions')).toBeLessThan(out.indexOf('panel-hero'));
  });

  it('the hero src goes through assetUrl, never base (the mobile bundle prunes /images)', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const src = readFileSync(
      fileURLToPath(new URL('./UniversePanelBody.svelte', import.meta.url)),
      'utf8',
    );
    expect(src).toContain("import { assetUrl } from '$lib/asset-url'");
    expect(src).toMatch(/src=\{assetUrl\(hero\.src\)\}/);
    expect(src).not.toMatch(/\{base\}/);
  });
});
