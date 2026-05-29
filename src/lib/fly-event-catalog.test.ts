/**
 * #107 review finding 8 — i18n catalog walk for the fly_event_* keys.
 *
 * The Step 6b commit added 2 new event labels (fly_event_phasing,
 * fly_event_separation) bringing the catalog to 15 keys total. The
 * fly_event_* labels follow the aerospace-shorthand convention: EN
 * baseline copied verbatim into all 14 locales (same as TCM, EDL,
 * ANOMALY — uppercase shorthand stays English cross-language).
 *
 * This test guards against drift:
 *   - Every fly_event_* key in en-US.json exists in every other locale.
 *   - No key is null / undefined / empty / whitespace-only.
 *
 * If a future label genuinely needs per-locale translation (lower-
 * case or non-shorthand text), update this test's assertions or move
 * the offending key out of this catalog and into a separately-tested
 * group.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MESSAGES_DIR = join(process.cwd(), 'messages');

function readLocale(filename: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(MESSAGES_DIR, filename), 'utf8'));
}

const allLocales = readdirSync(MESSAGES_DIR).filter((f) => f.endsWith('.json'));
const enUS = readLocale('en-US.json');
const flyEventKeys = Object.keys(enUS).filter((k) => k.startsWith('fly_event_'));

describe('#107 finding 8 — fly_event_* i18n catalog coverage', () => {
  it('en-US carries every fly_event_* key with a non-empty value', () => {
    expect(flyEventKeys.length).toBeGreaterThanOrEqual(13);
    for (const key of flyEventKeys) {
      const v = enUS[key];
      expect(v, `en-US.${key}`).toBeTruthy();
      expect(typeof v, `en-US.${key} type`).toBe('string');
      expect((v as string).trim().length, `en-US.${key} length`).toBeGreaterThan(0);
    }
  });

  it('every non-EN locale carries every fly_event_* key (no missing translations)', () => {
    for (const localeFile of allLocales) {
      if (localeFile === 'en-US.json') continue;
      const locale = readLocale(localeFile);
      for (const key of flyEventKeys) {
        const v = locale[key];
        expect(v, `${localeFile}.${key}`).toBeDefined();
        expect(typeof v, `${localeFile}.${key} type`).toBe('string');
        expect((v as string).trim().length, `${localeFile}.${key} length`).toBeGreaterThan(0);
      }
    }
  });

  it('fly_event_* values use the aerospace shorthand convention (EN-baseline cross-locale)', () => {
    // For these specific shorthand keys, the value should be identical
    // across all locales (uppercase aerospace acronyms — TCM, EDL,
    // ANOMALY, etc.). If a locale genuinely should translate one,
    // remove it from this strict-match list with a justification.
    const STRICT_MATCH_KEYS = [
      'fly_event_tcm',
      'fly_event_edl_or_oi',
      'fly_event_anomaly',
      'fly_event_loi',
      'fly_event_tei',
    ];
    for (const localeFile of allLocales) {
      if (localeFile === 'en-US.json') continue;
      const locale = readLocale(localeFile);
      for (const key of STRICT_MATCH_KEYS) {
        expect(locale[key], `${localeFile}.${key} should mirror en-US`).toBe(enUS[key]);
      }
    }
  });
});
