/**
 * Translate the 4 PhasePanel paraglide keys (#358 micro-enhancement)
 * into all 13 non-en-US locales. Same Sonnet text+JSON pattern as
 * `translate-orbit-ruler-keys.mjs`.
 *
 * Run: set -a; source .env; set +a; node scripts/translate-fly-phase-keys.mjs
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
  'fly_phase_panel_aria',
  'fly_phase_panel_close',
  'fly_phase_panel_eyebrow',
  'fly_phase_pill_open_aria',
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

const SYSTEM = `Translate Orrery /fly mission-phase panel UI labels.

CRITICAL:
- Preserve {variable} placeholders verbatim — {phase} stays {phase}.
- Short UI strings — keep them tight, idiomatic for the target language.
- Preserve the en-US case pattern (UPPERCASE eyebrows stay uppercase where idiomatic).
- Output ONE JSON object with the input keys, no markdown fences, no prose.`;

async function tx(client, locale, payload) {
  const msg = `Translate into ${NAMES[locale]}. Preserve {phase} placeholders.\n\n${JSON.stringify(payload, null, 2)}`;
  const r = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1000,
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
