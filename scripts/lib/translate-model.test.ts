import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_TRANSLATION_MODEL,
  PROBLEM_LOCALE_MODEL,
  SONNET_LOCALES,
  translationModel,
} from './translate-model.mjs';

describe('translationModel', () => {
  it('is Haiku for every locale not on the problem list', () => {
    for (const loc of [
      'ar',
      'de',
      'es',
      'fr',
      'hi',
      'it',
      'ja',
      'ko',
      'nl',
      'pt-BR',
      'ru',
      'zh-CN',
    ])
      expect(translationModel(loc)).toBe(DEFAULT_TRANSLATION_MODEL);
    expect(DEFAULT_TRANSLATION_MODEL).toMatch(/haiku/);
  });

  it('is Sonnet for sr-Cyrl, and never Opus', () => {
    expect(SONNET_LOCALES.has('sr-Cyrl')).toBe(true);
    expect(translationModel('sr-Cyrl')).toBe(PROBLEM_LOCALE_MODEL);
    expect(PROBLEM_LOCALE_MODEL).toMatch(/sonnet/);
  });

  it('every translate-*.mjs picks its model through translationModel', () => {
    const dir = join(process.cwd(), 'scripts');
    const scripts = readdirSync(dir).filter((f) => /^translate-.*\.mjs$/.test(f));
    expect(scripts.length).toBeGreaterThan(0);
    for (const f of scripts) {
      const src = readFileSync(join(dir, f), 'utf8');
      expect(src, f).toContain('translationModel(');
      expect(src, f).not.toMatch(/model:\s*['"]claude-/);
      expect(src, f).not.toMatch(/claude-(opus|sonnet)/);
    }
  });
});
