import { getLocale } from '$lib/paraglide/runtime';
import * as m from '$lib/paraglide/messages';

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

/** "3 known planets" in the locale's plural form (star panel, star pages, the stars hub). */
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
