import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = '/Users/markodragoljevic/Projects/orrery';
const MESSAGES_DIR = path.join(ROOT, 'messages');
const OVERRIDES_PATH = path.join(ROOT, 'scripts/paraglide-key-overrides.json');
const EN_PATH = path.join(MESSAGES_DIR, 'en-US.json');

const LOCALES = ['ar','de','es','fr','hi','it','ja','ko','nl','pt-BR','ru','sr-Cyrl','zh-CN'];

const KEYS = [
  'panel_tab_library',
  'panel_satellite_gallery_empty',
  'panel_satellite_library_empty',
  'panel_satellite_period_unit_days',
  'panel_satellite_kind',
];

const NAMES = {
  ar: 'Modern Standard Arabic', de: 'German', es: 'European Spanish',
  fr: 'French', hi: 'Hindi', it: 'Italian', ja: 'Japanese', ko: 'Korean',
  nl: 'Dutch', 'pt-BR': 'Brazilian Portuguese', ru: 'Russian',
  'sr-Cyrl': 'Serbian (Cyrillic)', 'zh-CN': 'Simplified Chinese',
};

const SYSTEM = `Translate Orrery satellite-panel UI labels.

CRITICAL:
- Preserve {variable} placeholders verbatim — do not translate or replace them.
- Short UI strings — keep them tight, idiomatic for the target language.
- Output ONE JSON object with the input keys, no markdown fences, no prose.`;

async function tx(client, locale, payload) {
  const msg = `Translate into ${NAMES[locale]}. Preserve {planet} and {value} placeholders.\n\n${JSON.stringify(payload, null, 2)}`;
  const r = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    system: SYSTEM,
    messages: [{ role: 'user', content: msg }],
  });
  const text = r.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
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
