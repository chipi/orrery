import { describe, it, expect } from 'vitest';
import { render } from 'svelte/server';
import EntityThumb from './EntityThumb.svelte';

const SRC = '/credit-thumbs/images/fleet-galleries/lro/03.1x1.webp';
const html = (props: Record<string, unknown>) =>
  render(EntityThumb, { props: props as never }).body;

// The error swap (onerror -> dot) needs a mounted component; the vitest config resolves svelte to
// its server build, so that part is checked in the browser (tests/e2e/orbit-ruler.spec.ts).
describe('EntityThumb markup contract', () => {
  it('is a decorative 28 px lazy async image with the ring as its border colour', () => {
    const out = html({ src: SRC, ring: '#3b82f6' });
    expect(out).toContain(`src="${SRC}"`);
    expect(out).toContain('alt=""');
    expect(out).toContain('width="28"');
    expect(out).toContain('height="28"');
    expect(out).toContain('loading="lazy"');
    expect(out).toContain('decoding="async"');
    expect(out).toContain('border-color: #3b82f6');
  });

  it('takes the size prop', () => {
    const out = html({ src: SRC, size: 40 });
    expect(out).toContain('width="40"');
    expect(out).toContain('height="40"');
  });

  it('draws the neutral ring when the row has no identity colour or a teal one', () => {
    expect(html({ src: SRC })).toContain('border-color: rgba(255,255,255,0.5)');
    expect(html({ src: SRC, ring: '#4ecdc4' })).toContain('border-color: rgba(255,255,255,0.5)');
    expect(html({ src: SRC, ring: '#7de8e8' })).not.toContain('#7de8e8');
  });

  it('shows the centred dot in the same slot when there is no file', () => {
    const out = html({ src: null, ring: '#ef4444' });
    expect(out).not.toContain('<img');
    expect(out).toContain('class="entity-thumb-slot ');
    expect(out).toContain('aria-hidden="true"');
    expect(out).toContain('width: 28px; height: 28px');
    expect(out).toContain('background: #ef4444');
  });

  it('keeps the data colour on the dot even when the ring would be neutral (teal)', () => {
    expect(html({ src: null, ring: '#7de8e8' })).toContain('background: #7de8e8');
  });

  it('fallback="none" draws nothing without a file', () => {
    expect(html({ src: null, fallback: 'none' }).replace(/<!--.*?-->/g, '')).toBe('');
  });
});
