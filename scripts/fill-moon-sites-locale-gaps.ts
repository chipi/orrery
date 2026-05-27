/**
 * Fill missing per-locale moon-sites overlay files (#42 e2e fix).
 *
 * /moon's data loader fetches `i18n/${locale}/moon-sites/${siteId}.json`
 * for every site and falls back to en-US on 404. The .catch() handles
 * JS-side gracefully, but the network 404 itself is logged as a
 * console.error tripwire in our e2e clean-console assertions AND
 * slows down mobile-chromium init enough to time out the hotspot
 * dispatcher's data-hotspot-tier wait (15 s).
 *
 * Strategy: for each (locale, site) combo where the locale file is
 * missing but en-US has one, copy the en-US content verbatim into
 * the missing-locale file. Preserves user-facing text (the en-US
 * fallback was already serving English; this just makes that
 * explicit) without inventing translations.
 *
 * Idempotent: re-running is a no-op once gaps are filled. Existing
 * locale files are NOT touched (real translations preserved).
 */
import { existsSync, readdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const I18N_ROOT = join(ROOT, 'static/data/i18n');

const LOCALES = [
  'ar',
  'de',
  'en-US',
  'es',
  'fr',
  'hi',
  'it',
  'ja',
  'ko',
  'nl',
  'pt-BR',
  'ru',
  'sr-Cyrl',
  'zh-CN',
] as const;

const EN_DIR = join(I18N_ROOT, 'en-US', 'moon-sites');
const enFiles = readdirSync(EN_DIR).filter((f) => f.endsWith('.json'));

let copied = 0;
let skipped = 0;
for (const locale of LOCALES) {
  if (locale === 'en-US') continue;
  const dir = join(I18N_ROOT, locale, 'moon-sites');
  for (const file of enFiles) {
    const target = join(dir, file);
    if (existsSync(target)) {
      skipped += 1;
      continue;
    }
    copyFileSync(join(EN_DIR, file), target);
    copied += 1;
  }
}

console.log(`en-US source files: ${enFiles.length}`);
console.log(`Locales (excl. en-US): ${LOCALES.length - 1}`);
console.log(`Copied: ${copied} en-US fallback file(s)`);
console.log(`Skipped: ${skipped} existing file(s) (translations preserved)`);
