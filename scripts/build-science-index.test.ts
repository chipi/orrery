import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

type Entry = { tab: string; section: string; title: string; intro: string; haystack: string };
const read = (p: string) => JSON.parse(readFileSync(p, 'utf8')) as Entry[];

describe('per-locale science search indexes', () => {
  const en = read('static/data/science-index.json');
  const locales = readdirSync('i18n-src').filter((l) => l !== 'en-US');

  it('every locale has an index with the same sections as English', () => {
    for (const loc of locales) {
      const idx = read(`static/data/science-index.${loc}.json`);
      expect(idx.map((e) => `${e.tab}/${e.section}`)).toEqual(
        en.map((e) => `${e.tab}/${e.section}`),
      );
    }
  });

  it("shows the locale's titles and still matches English titles", () => {
    const ru = read('static/data/science-index.ru.json');
    const i = ru.findIndex((e) => e.section === en[0].section);
    expect(ru[i].title).not.toBe(en[i].title);
    expect(ru[i].title).toMatch(/[А-Яа-я]/);
    expect(ru[i].haystack).toContain(en[i].title.toLowerCase());
  });
});
