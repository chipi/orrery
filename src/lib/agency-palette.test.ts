// The agency palette of /missions (UXD-048): one colour per agency, on the cards, the badges and
// the agency filter dots. Every colour has to be readable on the page and on the card, be told
// apart from the others (also under colour-blind simulation) and not be cyan or teal.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { agencyColor, splitAgencies } from './agencies';
import { CARD_BG, PAGE_BG, contrast, hexToRgb, isCyanTeal, minPairDelta } from './colour-math';
import { contrastRatio, readableTextOn } from './readable-text';

const index = JSON.parse(readFileSync('static/data/missions/index.json', 'utf8')) as {
  agency: string;
}[];
// The filter row: every agency of the index, as the page lists them (a default sort of the names).
const names = Array.from(new Set(index.flatMap((m) => splitAgencies(m.agency)))).sort();

describe('agency palette on /missions', () => {
  it('has a colour for every agency in the mission index', () => {
    expect(names.length).toBeGreaterThanOrEqual(14);
    for (const n of names) expect(agencyColor(n), n).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('gives each agency its own colour', () => {
    const colours = names.map((n) => agencyColor(n)!.toLowerCase());
    expect(new Set(colours).size).toBe(names.length);
  });

  it.each(names)(
    '%s: 4.5:1 on the page and on the card, badge text 4.5:1, not cyan or teal',
    (n) => {
      const c = agencyColor(n)!;
      expect(contrast(c, PAGE_BG)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c, CARD_BG)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(hexToRgb(readableTextOn(c)), hexToRgb(c))).toBeGreaterThanOrEqual(4.5);
      expect(isCyanTeal(c)).toBe(false);
    },
  );

  it('tells every pair apart under normal and colour-blind vision (CIEDE2000 above 5)', () => {
    for (let i = 0; i < names.length; i++)
      for (let j = i + 1; j < names.length; j++) {
        const r = minPairDelta(agencyColor(names[i])!, agencyColor(names[j])!);
        expect(r.de, `${names[i]} / ${names[j]} (${r.kind})`).toBeGreaterThan(5);
      }
  });

  it('keeps neighbours in the filter row at 7 or more', () => {
    for (let i = 0; i < names.length - 1; i++) {
      const r = minPairDelta(agencyColor(names[i])!, agencyColor(names[i + 1])!);
      expect(r.de, `${names[i]} / ${names[i + 1]}`).toBeGreaterThanOrEqual(7);
    }
  });
});
