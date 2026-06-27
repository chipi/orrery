/**
 * v0.7 UI-string i18n sweep translator.
 *
 * Translates the new user-facing message-bundle keys added during the
 * v0.7 i18n extraction (empty-states, headings, buttons, aria/title/
 * placeholder) into the 13 non-en-US locales, writing both messages/<loc>.json
 * and scripts/paraglide-key-overrides.json (so paraglide-add-keys re-applies
 * them on future runs). Modeled on translate-panel-keys-303.mjs.
 *
 * Edit KEYS to the batch you're translating, then:
 *   set -a; source .env; set +a; node scripts/translate-v07-ui.mjs
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

// The v0.7-added keys to translate. Extend as more extraction batches land;
// re-runs only translate the keys listed here (overrides for prior batches
// already persisted in paraglide-key-overrides.json).
const KEYS = [
  // batch 7h — final visible-text stragglers
  'epoch_all',
  'assembly_waiting_first_launch',
];

const SYSTEM = `Translate Orrery UI strings (a space-exploration web app).

CRITICAL:
- Preserve {variable} placeholders verbatim — do not translate or replace them.
- Preserve trailing symbols/arrows (→, …) exactly.
- Short UI strings — keep them tight and idiomatic for the target language.
- Domain terms (spacecraft, gallery, mission, observatory) use the standard
  spaceflight vocabulary of the target language.
- Output ONE JSON object with the input keys, no markdown fences, no prose.`;

async function tx(client, locale, payload) {
  const msg = `Translate into ${NAMES[locale]}. Preserve {placeholders} and trailing →/… symbols.\n\n${JSON.stringify(payload, null, 2)}`;
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
const overrides = JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
const payload = {};
for (const k of KEYS) payload[k] = en[k];

for (const loc of LOCALES) {
  process.stdout.write(`  ${loc}... `);
  try {
    const tr = await tx(client, loc, payload);
    overrides[loc] = overrides[loc] ?? {};
    const mpath = path.join(MESSAGES_DIR, `${loc}.json`);
    const messages = JSON.parse(fs.readFileSync(mpath, 'utf8'));
    for (const k of KEYS) {
      if (typeof tr[k] !== 'string') throw new Error(`missing ${k}`);
      overrides[loc][k] = tr[k];
      messages[k] = tr[k];
    }
    fs.writeFileSync(mpath, JSON.stringify(messages, null, 2) + '\n', 'utf8');
    console.log('ok');
  } catch (err) {
    console.log(`FAIL ${err.message}`);
  }
}
fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2) + '\n', 'utf8');
console.log('Done');
