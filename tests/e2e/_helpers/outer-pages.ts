import { existsSync, readFileSync } from 'node:fs';
import { galaxyPageIds, structurePageIds } from '../../../scripts/site-routes.mjs';

/**
 * What /explore/galaxies/<id> and /explore/structures/<id> exist for, read from the files that
 * decide it (the en-US overlays under i18n-src/en-US/universe/galaxies and structures), so a spec
 * is right with no overlay, with a few and with all 59. Nothing here hard-codes a page count.
 */

const json = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const members = (file: string) =>
  json<{ members: { id: string; name: string }[] }>(`static/data/universe/${file}.json`).members;

export const galaxyPages = new Set<string>(galaxyPageIds() as string[]);
export const structurePages = new Set<string>(structurePageIds() as string[]);

/** The scales of the four structure files, by the `?context=` value that names them. */
export const STRUCTURE_SCALES = {
  'local-sheet': 'local-sheet',
  virgo: 'virgo-cluster',
  laniakea: 'laniakea',
  'cosmic-web': 'cosmic-web',
} as const;

/** The INDEX rows that link a structure page in one scale (a page is one row per scale listing it). */
export const structureRowsOf = (scale: keyof typeof STRUCTURE_SCALES): number =>
  members(STRUCTURE_SCALES[scale]).filter((m) => structurePages.has(m.id)).length;

/** Every INDEX row that links a structure page: local-group counts once in each scale listing it. */
export const structureRows = (): number =>
  (Object.keys(STRUCTURE_SCALES) as (keyof typeof STRUCTURE_SCALES)[]).reduce(
    (n, s) => n + structureRowsOf(s),
    0,
  );

/**
 * Every INDEX row that links a galaxy page: the Local Group members with a galaxy overlay, and the
 * Magellanic Clouds a second time in the Milky Way scale.
 */
export const galaxyRows = (): number => {
  const magellanic = json<{ magellanic: { id: string }[] }>(
    'static/data/universe/milky-way-schematic.json',
  ).magellanic;
  return (
    members('local-group').filter((m) => galaxyPages.has(m.id)).length +
    magellanic.filter((m) => galaxyPages.has(m.id)).length
  );
};

/** The glossary's name for a data name in a locale (the data's own name in en-US). */
export function outerName(dataName: string, locale: string): string {
  if (locale === 'en-US') return dataName;
  const star = json<{ star: Record<string, Record<string, string>> }>(
    'scripts/i18n-tools/native-terms.json',
  ).star;
  return star[dataName]?.[locale] ?? dataName;
}

/** The overlay of a galaxy or structure in a locale, the en-US one where the locale has none. */
export function overlayOf(
  dir: 'galaxies' | 'structures',
  id: string,
  locale: string,
): { fact: string; bio: string } {
  const own = `i18n-src/${locale}/universe/${dir}/${id}.json`;
  return json(existsSync(own) ? own : `i18n-src/en-US/universe/${dir}/${id}.json`);
}

/** Text as the page's HTML holds it (Svelte escapes & and <; an apostrophe stays). */
export const inHtml = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
