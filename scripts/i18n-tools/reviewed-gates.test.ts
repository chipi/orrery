import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { reviewKey } from './number-drift.mjs';
import { reviewKey as droppedKey } from './dropped-sentences.mjs';

const LOCALES = [
  'de',
  'es',
  'fr',
  'it',
  'pt-BR',
  'nl',
  'ru',
  'sr-Cyrl',
  'ja',
  'ko',
  'zh-CN',
  'hi',
  'ar',
];

// Both finders are gated at zero: a finding is fixed in i18n-src or recorded, with a reason and a
// hash of the English and of the translation it was judged on, in a reviewed file. An edit to
// either text brings the finding back.
const GATES = [
  { name: 'number-drift', file: 'number-drift-reviewed.json', key: reviewKey },
  { name: 'dropped-sentences', file: 'dropped-sentences-reviewed.json', key: droppedKey },
];

for (const g of GATES) {
  describe(`${g.name} · reviewed exceptions`, () => {
    const reviewed = JSON.parse(readFileSync(`scripts/i18n-tools/${g.file}`, 'utf8')) as Record<
      string,
      { why: string; en: string; tr: string }
    >;
    it('every exception names a locale, an existing file and field, a reason and both text hashes', () => {
      const bad: string[] = [];
      for (const [k, v] of Object.entries(reviewed)) {
        const [loc, rel, at] = k.split('|');
        if (k !== g.key(loc, rel, at)) bad.push(`${k}: malformed`);
        if (!LOCALES.includes(loc)) bad.push(`${k}: unknown locale`);
        if (!existsSync(path.join('i18n-src', 'en-US', rel))) bad.push(`${k}: no such en-US file`);
        if (!existsSync(path.join('i18n-src', loc, rel))) bad.push(`${k}: no such ${loc} file`);
        if (!v.why?.trim()) bad.push(`${k}: needs a reason`);
        if (!/^[0-9a-f]{10}$/.test(v.en) || !/^[0-9a-f]{10}$/.test(v.tr))
          bad.push(`${k}: needs a hash of both texts`);
      }
      expect(bad, bad.slice(0, 20).join('\n')).toEqual([]);
    });
  });

  describe(`${g.name} · gate`, () => {
    it('no unreviewed findings, no stale exceptions, in every tree and locale', () => {
      const run = () => {
        try {
          return execFileSync('node', [`scripts/i18n-tools/${g.name}.mjs`, 'tree=all', '--gate'], {
            encoding: 'utf8',
          });
        } catch (e) {
          const out = (e as { stdout?: string }).stdout ?? String(e);
          return expect.fail(
            `${g.name} --gate failed (fix the text in i18n-src, or record it with --accept=… --why=…):\n${out.split('\n').slice(-12).join('\n')}`,
          );
        }
      };
      expect(run()).toContain(' 0 unreviewed,');
    }, 60_000);
  });
}
