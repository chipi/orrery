import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TRANSLATED_LOCALES } from '../lib/locales.mjs';

// UI-key parity for messages/<loc>.json. Paraglide falls back to English at runtime for a
// key a locale lacks, so a missing key ships English silently; this makes it a test failure.
const read = (loc: string): Record<string, unknown> =>
  JSON.parse(readFileSync(`messages/${loc}.json`, 'utf8'));
const strip = (j: Record<string, unknown>) => Object.keys(j).filter((k) => !k.startsWith('$'));
const placeholders = (s: string): string => (s.match(/\{\w+\}/g) ?? []).sort().join(',');

const en = read('en-US');
const enKeys = strip(en);

describe.each(TRANSLATED_LOCALES)('messages/%s.json', (loc) => {
  const j = read(loc);
  const keys = new Set(strip(j));
  it('has every en-US key', () => {
    expect(enKeys.filter((k) => !keys.has(k))).toEqual([]);
  });
  it('has no key that en-US lacks', () => {
    expect([...keys].filter((k) => !(k in en))).toEqual([]);
  });
  it('has a non-empty value for every key', () => {
    expect([...keys].filter((k) => typeof j[k] !== 'string' || !(j[k] as string).trim())).toEqual(
      [],
    );
  });
  it('uses the same placeholders as en-US', () => {
    expect(
      enKeys.filter(
        (k) =>
          typeof j[k] === 'string' &&
          placeholders(j[k] as string) !== placeholders(en[k] as string),
      ),
    ).toEqual([]);
  });
});
