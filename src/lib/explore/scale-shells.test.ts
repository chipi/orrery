import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SCALE_GLYPHS } from '$lib/components/ScaleGlyph.svelte';
import { SCIENCE_LINK_MAX } from '$lib/science-links';
import { computeLensPanel } from './lens-panel';
import { CTX_ORDER } from './scale-shell-controller';
import { SCALE_SHELL_LIST, SCALE_SHELLS, shellScienceRefs } from './scale-shells';

const index: { tab: string; section: string }[] = JSON.parse(
  readFileSync('static/data/science-index.json', 'utf8'),
);
const known = new Set(index.map((s) => `${s.tab}/${s.section}`));

describe('SCALE_SHELLS', () => {
  it('has one record per ladder level, in ladder order', () => {
    expect(Object.keys(SCALE_SHELLS).sort()).toEqual([...CTX_ORDER].sort());
    expect(SCALE_SHELL_LIST.map((s) => s.id)).toEqual([...CTX_ORDER]);
    for (const id of CTX_ORDER) expect(SCALE_SHELLS[id].id).toBe(id);
  });

  it('draws every level with a glyph ScaleGlyph knows, and jumps by ?context=<id>', () => {
    for (const s of SCALE_SHELL_LIST) {
      expect(SCALE_GLYPHS.has(s.glyph), s.id).toBe(true);
      expect(s.query).toBe(`?context=${s.id}`);
    }
    expect(SCALE_GLYPHS.size).toBe(CTX_ORDER.length);
  });

  it('names, titles and describes every level', () => {
    for (const s of SCALE_SHELL_LIST) {
      for (const f of [s.name, s.navName, s.title, s.desc, s.storyTitle, s.storyBody])
        expect(f().length, s.id).toBeGreaterThan(0);
    }
    expect(SCALE_SHELLS['solar-system'].navName()).not.toBe(SCALE_SHELLS['solar-system'].name());
    expect(new Set(SCALE_SHELL_LIST.map((s) => s.name())).size).toBe(CTX_ORDER.length);
  });

  it('lists at most five science sections per level, each one in the science index', () => {
    for (const s of SCALE_SHELL_LIST) {
      expect(s.science.length, s.id).toBeGreaterThan(0);
      expect(s.science.length, s.id).toBeLessThanOrEqual(SCIENCE_LINK_MAX);
      expect(new Set(s.science).size, `${s.id} repeats a link`).toBe(s.science.length);
      for (const slug of s.science) expect(known.has(slug), `${s.id}: ${slug}`).toBe(true);
    }
  });

  it('gives no two levels the same list, so no level repeats its neighbour card', () => {
    const lists = SCALE_SHELL_LIST.map((s) => s.science.join('|'));
    expect(new Set(lists).size).toBe(lists.length);
    const firsts = SCALE_SHELL_LIST.map((s) => s.science[0]);
    // Virgo and the cosmic web open on the same section by design; the rest of the list differs.
    expect(new Set(firsts).size).toBeGreaterThanOrEqual(firsts.length - 1);
  });

  it('splits slugs into tab and section', () => {
    expect(shellScienceRefs('milky-way')[0]).toEqual({ tab: 'observation', section: 'our-galaxy' });
  });

  it('feeds the Science Lens story: its title, body and own section are the table’s', () => {
    for (const s of SCALE_SHELL_LIST) {
      const p = computeLensPanel({
        blackHoleActive: false,
        contextId: s.id,
        activeBodyHostId: null,
        exoplanetHostIds: new Set(),
      });
      expect(p.title, s.id).toBe(s.storyTitle());
      expect(p.body, s.id).toBe(s.storyBody());
      expect(`${p.tab}/${p.section}`, s.id).toBe(s.science[0]);
    }
  });
});

describe('the consumers read the table', () => {
  const files = [
    'src/lib/components/Nav.svelte',
    'src/lib/components/ExploreScalePicker.svelte',
    'src/routes/+page.svelte',
    'src/routes/explore/hub/+page.svelte',
    'src/lib/explore/lens-panel.ts',
  ];
  it('keeps the level names and card texts out of every copy', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/m\.explore_ctx_(?!back)\w+/);
      expect(src, f).not.toMatch(/m\.explore_hub_(desc|shortcut)_\w+/);
      expect(src, f).not.toMatch(/m\.explore_lens_story_(?!bh_)\w+/);
    }
  });
});
