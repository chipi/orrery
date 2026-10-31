import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BASE_LOCALE, LOCALES, TRANSLATED_LOCALES } from './locales.mjs';
import { LOCALES as MCP_LOCALES } from '../../server/mcp/i18n';
import { SUPPORTED_LOCALES } from '../../src/lib/locale';

const settings = JSON.parse(readFileSync('project.inlang/settings.json', 'utf8'));

describe('scripts/lib/locales', () => {
  it('mirrors project.inlang/settings.json', () => {
    expect(BASE_LOCALE).toBe(settings.baseLocale);
    expect([...LOCALES]).toEqual(settings.locales);
    expect([...TRANSLATED_LOCALES]).toEqual(
      settings.locales.filter((l: string) => l !== settings.baseLocale),
    );
  });

  // These two keep literal lists (a typed tuple in the MCP image, picker
  // metadata in the app), so they cannot import the settings file. Fail when
  // they drift from it.
  it('server/mcp LOCALES has the same set', () => {
    expect([...MCP_LOCALES].sort()).toEqual([...LOCALES].sort());
  });

  it('src/lib/locale SUPPORTED_LOCALES has the same set', () => {
    expect(SUPPORTED_LOCALES.map((l) => l.code).sort()).toEqual([...LOCALES].sort());
  });
});
