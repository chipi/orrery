import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { keepKey, locPattern, normalize } from './term-match.mjs';

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
        for (const s of stems) expect(() => new RegExp(s, 'iu'), `${loc} stem ${s}`).not.toThrow();
        const re = locPattern(e, loc)!;
        expect(re.test(form as string), `${loc}: "${form}" must match its own stems`).toBe(true);
      }
    });
  }

  it('Arabic vowel marks do not decide a match', () => {
    expect(normalize('ar', 'أشعِل')).toBe('أشعل');
    expect(normalize('fr', 'é')).toBe('é');
    const e = { _match: { ar: ['أشعل'] } };
    expect(locPattern(e, 'ar')!.test('ثم أشعِلْ المحرك')).toBe(true);
  });
});

describe('glossary · reviewed keeps', () => {
  const keeps = JSON.parse(readFileSync('scripts/i18n-tools/term-keeps.json', 'utf8')) as Record<
    string,
    { why: string; tr: string }
  >;
  it('every keep names a glossary term, a locale, an existing overlay and a reason', () => {
    const bad: string[] = [];
    for (const [k, v] of Object.entries(keeps)) {
      const [term, loc, where] = k.split('|');
      const [rel] = where.split(' :: ');
      if (k !== keepKey(term, loc, where)) bad.push(`${k}: malformed`);
      if (!terms[term]) bad.push(`${k}: unknown term`);
      if (!LOCALES.includes(loc)) bad.push(`${k}: unknown locale`);
      if (!existsSync(path.join('i18n-src', loc, rel))) bad.push(`${k}: no such file`);
      if (!v.why || !/^[0-9a-f]{10}$/.test(v.tr)) bad.push(`${k}: needs why + text hash`);
    }
    expect(bad, bad.slice(0, 20).join('\n')).toEqual([]);
  });
});

// Trees that reached zero unreviewed misses are gated: a new translation that drops a
// binding form fails here until it is fixed or recorded as a keep (term-consistency skill).
const GATED_TREES = ['science', 'essays', 'programs', 'fleet'];
describe('glossary · term gate', () => {
  it(`no unreviewed term misses in ${GATED_TREES.join(', ')}`, () => {
    const run = () => {
      try {
        return execFileSync(
          'node',
          ['scripts/i18n-tools/term-drift.mjs', `--trees=${GATED_TREES.join(',')}`, '--gate'],
          { encoding: 'utf8' },
        );
      } catch (e) {
        const out = (e as { stdout?: string }).stdout ?? String(e);
        return expect.fail(`term-drift --gate failed:\n${out.split('\n').slice(-3).join('\n')}`);
      }
    };
    expect(run()).toContain('unreviewed misses: 0');
  }, 30_000);
});
