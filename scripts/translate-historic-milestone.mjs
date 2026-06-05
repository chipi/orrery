/**
 * One-shot translator for `surface_panel_historic_milestone` — the
 * UI label for the "HISTORIC MILESTONE →" cross-link added on /moon
 * Apollo 11 + /earth ISS panels (#303 close-out).
 */
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(import.meta.dirname, '..');
const MESSAGES = path.join(ROOT, 'messages');
const OVERRIDES = path.join(ROOT, 'scripts/paraglide-key-overrides.json');

const LOCALES = [
  'ar', 'de', 'es', 'fr', 'hi', 'it', 'ja', 'ko', 'nl', 'pt-BR', 'ru', 'sr-Cyrl', 'zh-CN',
];
const NAMES = {
  ar: 'Modern Standard Arabic', de: 'German', es: 'European Spanish',
  fr: 'French', hi: 'Hindi', it: 'Italian', ja: 'Japanese', ko: 'Korean',
  nl: 'Dutch', 'pt-BR': 'Brazilian Portuguese', ru: 'Russian',
  'sr-Cyrl': 'Serbian (Cyrillic)', 'zh-CN': 'Simplified Chinese',
};

const KEY = 'surface_panel_historic_milestone';
const EN = 'HISTORIC MILESTONE →';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const overrides = JSON.parse(fs.readFileSync(OVERRIDES, 'utf8'));

for (const loc of LOCALES) {
  process.stdout.write(`  ${loc}... `);
  try {
    const r = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 200,
      system: 'Translate one short Orrery UI label. Output ONLY the translated string (no JSON, no quotes, no commentary). Keep the trailing arrow → exactly. Match all-caps if the target language has case; for scripts without case (Japanese, Chinese, Korean, Hindi, Arabic) use natural script.',
      messages: [{ role: 'user', content: `Translate into ${NAMES[loc]}: "${EN}"` }],
    });
    const t = r.content.filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const mpath = path.join(MESSAGES, `${loc}.json`);
    const messages = JSON.parse(fs.readFileSync(mpath, 'utf8'));
    messages[KEY] = t;
    fs.writeFileSync(mpath, JSON.stringify(messages, null, 2) + '\n', 'utf8');
    overrides[loc] = overrides[loc] ?? {};
    overrides[loc][KEY] = t;
    console.log(t);
  } catch (e) {
    console.log(`FAIL ${e.message}`);
  }
}
fs.writeFileSync(OVERRIDES, JSON.stringify(overrides, null, 2) + '\n', 'utf8');
console.log('Done');
