import { describe, expect, it } from 'vitest';
import { AGENCIES, agencyColor, agencyDataColor } from './agencies';
import { CARD_BG, PAGE_BG, contrast } from './colour-math';

// The dot and bar colour of an agency on /missions and /fleet: the palette colour, or a brand
// colour lifted toward white; either way 4.5:1 on the page and on the card.
describe('agencyDataColor', () => {
  const coloured = AGENCIES.filter((a) => a.color && /^#[0-9a-f]{6}$/i.test(a.color));

  it.each(coloured.map((a) => [a.short, a.color!]))(
    '%s (%s) clears 4.5:1 on page and card',
    (short) => {
      const c = agencyDataColor(short)!;
      expect(contrast(c, PAGE_BG)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c, CARD_BG)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('leaves a colour that already clears the floor as it is', () => {
    expect(agencyDataColor('NASA')).toBe(agencyColor('NASA'));
  });

  it('is null when the agency has no colour', () => {
    expect(agencyDataColor('Nobody')).toBeNull();
  });
});
