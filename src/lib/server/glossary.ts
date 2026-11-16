import { readFileSync } from 'node:fs';

type Section = Record<string, Record<string, string>>;

const terms = JSON.parse(readFileSync('scripts/i18n-tools/native-terms.json', 'utf8')) as {
  body: Section;
  star: Section;
};

/** Solar-system body names by English name, then locale (scripts/i18n-tools/native-terms.json). */
export const BODY_NAMES: Section = terms.body;

/**
 * A galaxy, group or structure's name in the reader's language: the glossary's `star` entry for the
 * data's English name, else that name (en-US, or a name the glossary does not hold).
 */
export const outerName = (name: string, locale: string): string =>
  terms.star[name]?.[locale] ?? name;
