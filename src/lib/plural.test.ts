import { describe, expect, it } from 'vitest';
import { plural, planetCountLabel } from './plural';

const tag =
  (form: string) =>
  ({ n }: { n: number }) =>
    `${n}:${form}`;
const forms = { one: tag('one'), two: tag('two'), few: tag('few'), many: tag('many') };

describe('plural', () => {
  it('picks the locale plural form and falls back to the plain key', () => {
    const ru = plural(tag('other'), forms, 'ru');
    expect([1, 3, 5, 21, 1.5].map(ru)).toEqual(['1:one', '3:few', '5:many', '21:one', '1.5:other']);
    const ar = plural(tag('other'), forms, 'ar');
    expect([1, 2, 3, 11, 100].map(ar)).toEqual(['1:one', '2:two', '3:few', '11:many', '100:other']);
    const ja = plural(tag('other'), forms, 'ja');
    expect([1, 2].map(ja)).toEqual(['1:other', '2:other']);
  });

  it('says "1 known planet", not "1 known planets" (kepler-16)', () => {
    expect(planetCountLabel(1, 'en-US')).toBe('1 known planet');
    expect(planetCountLabel(3, 'en-US')).toBe('3 known planets');
  });
});
