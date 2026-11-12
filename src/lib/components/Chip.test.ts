import { describe, it, expect } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import Chip from './Chip.svelte';

const label = createRawSnippet(() => ({ render: () => '<span>Layer</span>' }));
const html = (props: Record<string, unknown>) =>
  render(Chip, { props: { children: label, ...props } }).body;

describe('Chip markup contract', () => {
  it('toggle renders a button with aria-pressed', () => {
    const out = html({ kind: 'toggle', active: true });
    expect(out).toContain('<button');
    expect(out).toContain('aria-pressed="true"');
    expect(out).toContain('class="ui-chip"');
  });

  it('toggle off renders aria-pressed="false"', () => {
    expect(html({ kind: 'toggle', active: false })).toContain('aria-pressed="false"');
  });

  it('choice renders role=radio, aria-checked and a roving tabindex', () => {
    const on = html({ kind: 'choice', active: true });
    expect(on).toContain('role="radio"');
    expect(on).toContain('aria-checked="true"');
    expect(on).toContain('tabindex="0"');
    expect(html({ kind: 'choice', active: false })).toContain('tabindex="-1"');
  });

  it('action has no pressed state', () => {
    expect(html({ kind: 'action' })).not.toContain('aria-pressed');
  });

  it('link renders an anchor with the href', () => {
    const out = html({ kind: 'link', href: '/live' });
    expect(out).toContain('<a');
    expect(out).toContain('href="/live"');
  });

  it('disabled sets the native attribute', () => {
    const out = html({ kind: 'toggle', disabled: true });
    expect(out).toContain('disabled');
    expect(out).toContain('aria-disabled="true"');
  });

  it('count renders after the label', () => {
    const out = html({ kind: 'choice', count: 12 });
    expect(out.indexOf('Layer')).toBeLessThan(out.indexOf('ui-chip__count'));
    expect(out).toContain('>12<');
  });

  it('tone sets --chip-tone and dot adds the leading dot', () => {
    const out = html({ kind: 'toggle', tone: '#c62f2f', dot: true });
    expect(out).toContain('--chip-tone: #c62f2f');
    expect(out).toContain('ui-chip__dot');
  });

  it('passes data attributes and a title through', () => {
    const out = html({ 'data-testid': 'layer-x', title: 'Show X' });
    expect(out).toContain('data-testid="layer-x"');
    expect(out).toContain('title="Show X"');
  });
});
