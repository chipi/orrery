import { describe, expect, it } from 'vitest';
import { ICON_SHOWCASE } from './index';
import { SCALE_SHELL_LIST } from '$lib/explore/scale-shells';

describe('ICON_SHOWCASE', () => {
  it('has unique ids', () => {
    const ids = ICON_SHOWCASE.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('shows every /explore scale-level glyph (the /colophon grid reads this list)', () => {
    const entry = ICON_SHOWCASE.find((i) => i.id === 'scale-glyphs');
    expect(entry).toBeDefined();
    expect((entry?.variants ?? []).map((v) => v.props.glyph)).toEqual(
      SCALE_SHELL_LIST.map((s) => s.glyph),
    );
  });
});
