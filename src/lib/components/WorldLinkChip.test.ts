import { describe, it, expect, vi } from 'vitest';
import { render } from 'svelte/server';

vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/explore') } }));
vi.mock('$app/environment', () => ({ browser: false }));
vi.mock('$app/paths', () => ({ base: '' }));

import WorldLinkChip from './WorldLinkChip.svelte';

const html = (bodyId: string) => render(WorldLinkChip, { props: { bodyId } }).body;

describe('WorldLinkChip (UXD-028)', () => {
  it.each([
    ['earth', '/earth', 'Go to Earth'],
    ['moon', '/moon', 'Go to the Moon'],
    ['mars', '/mars', 'Go to Mars'],
    ['venus', '/venus', 'Go to Venus'],
  ])('%s: a link chip to %s reading "%s"', (id, href, label) => {
    const out = html(id);
    expect(out).toContain('<a');
    expect(out).toContain(`href="${href}"`);
    expect(out).toContain('class="ui-chip"');
    expect(out).toContain(label);
  });

  it.each(['jupiter', 'sun', 'mercury', 'pluto', 'io'])('%s: no chip', (id) => {
    expect(html(id)).not.toContain('ui-chip');
  });
});
