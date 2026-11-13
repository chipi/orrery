import { getLocale } from '$lib/paraglide/runtime';
import * as m from '$lib/paraglide/messages';
import type { LocaleCode } from '$lib/locale';

/** A count message: `{n}` is the number. */
export type CountMsg = (p: { n: number }) => string;

/**
 * Picks the locale's plural form of a count message (1 photo; ru 2–4 планеты; ar dual …). The plain
 * key is the "other" form and the fallback; each locale carries `_one`, `_two`, `_few`, `_many`
 * (the same text where its grammar has no such form).
 */
export const plural =
  (other: CountMsg, forms: Partial<Record<Intl.LDMLPluralRule, CountMsg>>, locale?: string) =>
  (n: number): string =>
    (forms[new Intl.PluralRules(locale ?? getLocale()).select(n)] ?? other)({ n });

type LocaleCountMsg = (p: { n: number }, o?: { locale?: LocaleCode }) => string;
const MAJOR_MOON_FORMS: Partial<Record<Intl.LDMLPluralRule, LocaleCountMsg>> = {
  one: m.explore_index_moon_count_one,
  two: m.explore_index_moon_count_two,
  few: m.explore_index_moon_count_few,
  many: m.explore_index_moon_count_many,
};

/**
 * "2 major moons" on a planet's INDEX row. The INDEX rows are built per request locale, so the
 * message language is the locale asked for, not the ambient one `plural` reads.
 */
export const majorMoonCount = (n: number, locale: string): string => {
  const msg =
    MAJOR_MOON_FORMS[new Intl.PluralRules(locale).select(n)] ?? m.explore_index_moon_count;
  return msg({ n }, { locale: locale as LocaleCode });
};

/** "3 known planets" in the locale's plural form (star panel, star pages). */
export const planetCountLabel = (n: number, locale?: string): string =>
  plural(
    m.star_system_planet_count,
    {
      one: m.star_system_planet_count_one,
      two: m.star_system_planet_count_two,
      few: m.star_system_planet_count_few,
      many: m.star_system_planet_count_many,
    },
    locale,
  )(n);
