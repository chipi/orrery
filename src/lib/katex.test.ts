import { describe, it, expect } from 'vitest';
import { renderKatex } from './katex';

describe('renderKatex', () => {
  it('renders a simple expression to KaTeX HTML', () => {
    const html = renderKatex('v = \\sqrt{\\mu \\left(\\frac{2}{r} - \\frac{1}{a}\\right)}');
    // Output is the standard KaTeX wrapper with mathml + html spans.
    expect(html).toContain('class="katex-display"');
    expect(html).toContain('class="katex"');
    // The canonical bits should survive the round-trip — the variables
    // `v`, `r`, `a`, and the Greek `μ` (mu) should all appear.
    expect(html).toContain('mathnormal" style="margin-right:0.0359em;">v');
    expect(html).toContain('μ');
  });

  it('produces inline (non-displayMode) markup when asked', () => {
    const html = renderKatex('a^2 + b^2 = c^2', false);
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('katex-display');
  });

  it('throws on malformed LaTeX (build fails fast)', () => {
    expect(() => renderKatex('\\unknownmacro{x}')).toThrow();
  });
});
