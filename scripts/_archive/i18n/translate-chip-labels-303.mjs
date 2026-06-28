/**
 * One-shot translator for the 14 new `chip_label_*` paraglide keys
 * added in the #303 orphan-closing wave. Translates each key's en-US
 * value into the 13 non-US locales via Anthropic Sonnet, then writes:
 *
 *   1. scripts/paraglide-key-overrides.json — source of truth for
 *      regeneration after future propagator runs.
 *   2. messages/<locale>.json — overwrites the en-US-fallback values
 *      paraglide-add-keys.mjs seeded with the native translation.
 *
 * Anthropic API key must be in .env. Cost ~$0.05 (14 keys × 13 locales
 * × ~30 tokens each, Sonnet 4.6 pricing).
 *
 * Usage:
 *   set -a; source .env; set +a
 *   node scripts/translate-chip-labels-303.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(import.meta.dirname, '..');
const MESSAGES_DIR = path.join(ROOT, 'messages');
const OVERRIDES_PATH = path.join(ROOT, 'scripts/paraglide-key-overrides.json');
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

// The 14 keys added in the #303 close-out wave (see messages/en-US.json).
const KEYS = [
  'chip_label_cislunar_orbits',
  'chip_label_disposal_end_of_life',
  'chip_label_space_debris',
  'chip_label_special_orbits',
  'chip_label_sun_synchronous',
  'chip_label_expedition_cadence',
  'chip_label_solar_power_budget',
  'chip_label_pressurized_volume',
  'chip_label_node_module',
  'chip_label_crew_selection',
  'chip_label_pre_flight_training',
  'chip_label_crew_dynamics_psychology',
  'chip_label_crewed_station_design',
  'chip_label_eclss_life_support',
  'chip_label_sleep_nutrition_circadian',
  'chip_label_suit_lineage',
  'chip_label_eva_operations',
  'chip_label_long_duration_effects',
  'chip_label_mission_phase_eva',
];

const LOCALE_NAMES = {
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

const SYSTEM_PROMPT = `You translate Orrery science chip labels from en-US.

CRITICAL CONSTRAINTS:
- Each label is short technical text shown as a tooltip / chip caption.
- Match the en-US tone: terse, technical, em-dash separated structure.
- Keep proper nouns + abbreviations as-is (NRHO, LEO, MEO, GEO, GTO, DRO, ARED, EMU, Orlan, Feitian, xEMU, EVA, ECLSS, ISS, SPE, GCR, UV-C, mSv).
- Preserve em-dashes (—) and Unicode characters like degree (°), times (×), etc.
- Keep numeric values + units unchanged (2+, 1–2 %, 6-month, 16, 90-min).
- Output ONE valid JSON object — keys are the chip ids, values are the translations. No prose, no markdown fences, no explanation.`;

async function translateLocale(client, locale, payload) {
  const userMsg = `Translate these chip labels into ${LOCALE_NAMES[locale]}. Return JSON keyed by the input ids.

Input:
${JSON.stringify(payload, null, 2)}`;
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
  });
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  // Strip optional markdown fence the model sometimes wraps with.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY (`set -a; source .env; set +a`).');
    process.exit(1);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
  const overrides = JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
  const payload = {};
  for (const k of KEYS) {
    if (!(k in en)) {
      console.error(`Missing key in en-US: ${k}`);
      process.exit(1);
    }
    payload[k] = en[k];
  }
  console.log(`Translating ${KEYS.length} chip labels into ${LOCALES.length} locales...`);
  for (const locale of LOCALES) {
    process.stdout.write(`  ${locale}... `);
    try {
      const translations = await translateLocale(client, locale, payload);
      // Merge into overrides
      overrides[locale] = overrides[locale] ?? {};
      for (const k of KEYS) {
        if (typeof translations[k] !== 'string') {
          throw new Error(`missing key in response: ${k}`);
        }
        overrides[locale][k] = translations[k];
      }
      // Update the locale's messages file with the native translation.
      const messagesPath = path.join(MESSAGES_DIR, `${locale}.json`);
      const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));
      for (const k of KEYS) {
        messages[k] = translations[k];
      }
      fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2) + '\n', 'utf8');
      console.log('ok');
    } catch (err) {
      console.log(`FAIL ${err.message}`);
    }
  }
  fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2) + '\n', 'utf8');
  console.log(`\n✓ ${OVERRIDES_PATH} updated`);
  console.log(
    'Run `npx paraglide-js compile --project ./project.inlang --outdir ./src/lib/paraglide` to regenerate paraglide message exports.',
  );
}

main();
