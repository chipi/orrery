import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { buildIndex } from './build-science-index';

describe('per-locale science search indexes', () => {
  const en = buildIndex();
  const locales = readdirSync('i18n-src').filter((l) => l !== 'en-US');

  it('every locale has an index with the same sections as English', () => {
    for (const loc of locales) {
      const idx = buildIndex(loc);
      expect(idx.map((e) => `${e.tab}/${e.section}`)).toEqual(
        en.map((e) => `${e.tab}/${e.section}`),
      );
    }
  });

  it("shows the locale's titles and still matches English titles", () => {
    const ru = buildIndex('ru');
    const i = ru.findIndex((e) => e.section === en[0].section);
    expect(ru[i].title).not.toBe(en[i].title);
    expect(ru[i].title).toMatch(/[А-Яа-я]/);
    expect(ru[i].haystack).toContain(en[i].title.toLowerCase());
  });
});
