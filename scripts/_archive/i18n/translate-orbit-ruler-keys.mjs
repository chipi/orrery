/**
 * Translate the orbit-ruler + regime-panel paraglide UI keys (#354)
 * into all 13 non-en-US locales. Mirrors `translate-panel-keys-303.mjs`.
 *
 * Run: set -a; source .env; set +a; node scripts/translate-orbit-ruler-keys.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(import.meta.dirname, '..');
const MESSAGES_DIR = path.join(ROOT, 'messages');
const EN_PATH = path.join(MESSAGES_DIR, 'en-US.json');

const LOCALES = [
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
  'sr-Cyrl',
  'zh-CN',
];

const KEYS = [
  'earth_orbit_ruler_title',
  'earth_orbit_ruler_aria',
  'earth_orbit_ruler_chip',
  'earth_orbit_ruler_chip_aria',
  'earth_orbit_ruler_close',
  'earth_orbit_ruler_surface',
  'earth_orbit_ruler_km_short',
  'earth_regime_panel_aria',
  'earth_regime_panel_close',
  'earth_regime_altitude_label',
  'earth_regime_comparison_label',
  'earth_regime_story_label',
  'earth_regime_residents_label',
  'earth_regime_firsts_label',
  'earth_regime_firsts_label_missions',
  'earth_regime_science_label',
];

const NAMES = {
  ar: 'Modern Standard Arabic',
  de: 'German',
  es: 'European Spanish',
  fr: 'French',
  hi: 'Hindi',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  nl: 'Dutch',
  'pt-BR': 'Brazilian Portuguese',
  ru: 'Russian',
  'sr-Cyrl': 'Serbian (Cyrillic)',
  'zh-CN': 'Simplified Chinese',
};

const SYSTEM = `Translate Orrery /earth orbit-ruler + regime-panel UI labels.

CRITICAL:
- "LEO", "MEO", "GEO", "HEO", "L2", "ORBITS", "SURFACE", "GNSS", "/science" — UNTRANSLATED universal terms in space contexts.
- Short UI strings — keep them tight, idiomatic for the target language.
- Match the labelling tone of the existing detail panels (Space Mono uppercase eyebrows where appropriate — preserve case patterns from the en-US source).
- Output ONE JSON object with the input keys, no markdown fences, no prose.`;

async function tx(client, locale, payload) {
  const msg = `Translate into ${NAMES[locale]}.\n\n${JSON.stringify(payload, null, 2)}`;
  const r = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    system: SYSTEM,
    messages: [{ role: 'user', content: msg }],
  });
  const text = r.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
const payload = {};
for (const k of KEYS) payload[k] = en[k];

for (const loc of LOCALES) {
  process.stdout.write(`  ${loc}... `);
  try {
    const tr = await tx(client, loc, payload);
    const mpath = path.join(MESSAGES_DIR, `${loc}.json`);
    const messages = JSON.parse(fs.readFileSync(mpath, 'utf8'));
    for (const k of KEYS) messages[k] = tr[k];
    fs.writeFileSync(mpath, JSON.stringify(messages, null, 2) + '\n', 'utf8');
    console.log('ok');
  } catch (err) {
    console.log(`FAIL ${err.message}`);
  }
}
console.log('Done');
