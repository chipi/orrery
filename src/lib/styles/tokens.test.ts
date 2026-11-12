import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

function token(name: string): string | undefined {
  return css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();
}

function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

describe('accent tokens (UX A3)', () => {
  it('has one UI accent, blue D', () => {
    expect(token('color-accent')).toBe('#5070ff');
  });

  it('keeps --color-accent-text as an alias of the accent', () => {
    expect(token('color-accent-text')).toBe('var(--color-accent)');
  });

  it('has no teal token', () => {
    expect(css).not.toContain('--color-teal');
    expect(css).not.toContain('--color-tier-intro');
  });

  it('keeps the UI blues and the ok green outside the teal hue band', () => {
    for (const name of ['color-accent', 'color-accent-hover', 'color-state', 'color-focus']) {
      const h = hue(token(name)!);
      expect(h < 155 || h > 200, `${name} hue ${h}`).toBe(true);
    }
    expect(token('color-ok')).toBe('#2dd4a8');
  });

  it('tints derive from the accent (80,112,255)', () => {
    for (const name of ['color-accent-soft', 'color-accent-edge', 'color-accent-strong']) {
      expect(token(name)).toMatch(/^rgba\(80, 112, 255, /);
    }
  });
});
