import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The `term` section of the glossary (technical space terms, 2026-10-31 pilot) feeds
// term-drift.mjs: every entry needs a form, match stems that compile, and a confidence
// for each of the 13 translated locales, and the binding form must match its own stems.
const LOCALES = [
  'ru',
  'ja',
  'zh-CN',
  'ko',
  'hi',
  'ar',
  'sr-Cyrl',
  'de',
  'fr',
  'es',
  'it',
  'nl',
  'pt-BR',
];
type TermEntry = {
  _sense: string;
  _en?: string;
  _match: Record<string, string[]>;
  _confidence: Record<string, string>;
} & Record<string, unknown>;
const terms = JSON.parse(readFileSync('scripts/i18n-tools/native-terms.json', 'utf8'))
  .term as Record<string, TermEntry>;

describe('glossary · technical terms', () => {
  it('has the pilot terms', () => {
    expect(Object.keys(terms).length).toBeGreaterThanOrEqual(20);
  });

  for (const [term, e] of Object.entries(terms)) {
    it(`${term}: complete for every locale, stems compile and match the binding form`, () => {
      expect(e._sense, 'sense note').toBeTruthy();
      if (e._en) expect(() => new RegExp(e._en!, 'i')).not.toThrow();
      for (const loc of LOCALES) {
        const form = e[loc];
        expect(typeof form === 'string' && form.length > 0, `${loc} form`).toBe(true);
        expect(['high', 'medium', 'low']).toContain(e._confidence[loc]);
        const stems = e._match[loc] ?? [];
        expect(stems.length, `${loc} stems`).toBeGreaterThan(0);
        const re = new RegExp(stems.map((s) => `(?:${s})`).join('|'), 'iu');
        expect(re.test(form as string), `${loc}: "${form}" must match its own stems`).toBe(true);
      }
    });
  }
});
