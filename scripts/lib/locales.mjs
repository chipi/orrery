// The locale list, read from project.inlang/settings.json — the one source of
// truth Paraglide compiles from. Scripts import this instead of spelling the
// list out, so adding a locale (Hebrew, plan 9c) is one settings edit.
// Order is the settings order. Do not use it as the column order of a
// positional translation table (scripts/i18n-tools/* keep their own for that).
import { readFileSync } from 'node:fs';

const settings = JSON.parse(
  readFileSync(new URL('../../project.inlang/settings.json', import.meta.url), 'utf8'),
);

export const BASE_LOCALE = settings.baseLocale;
/** Every locale, base first (settings order). */
export const LOCALES = Object.freeze([...settings.locales]);
/** Every locale except the base: the ones that carry translations. */
export const TRANSLATED_LOCALES = Object.freeze(LOCALES.filter((l) => l !== BASE_LOCALE));
