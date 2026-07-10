/**
 * Localize image alt-text (RFC/issue — option A). Translates the REAL captions
 * in static/data/image-alt-text/en-US.json into the 13 non-en-US locales,
 * skipping raw Wikimedia filenames (they read the same in any language and fall
 * back to en-US at runtime). Writes static/data/image-alt-text/<locale>.json
 * with only the translated real captions — the runtime (src/lib/image-alt.ts)
 * falls back to en-US for anything absent.
 *
 * Resume-safe: skips entries already present in a locale file.
 * Uses Haiku — short low-stakes strings, and this is superseded once the
 * alt-text QUALITY pass (issue for C) replaces filenames with real descriptions.
 *
 * Run: set -a; source .env; set +a; node scripts/translate-alt-text.mjs
 */
import fs from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';

const DIR = 'static/data/image-alt-text';
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
const BATCH = 60;

// Skip raw filenames (Wikimedia "File:…" or bare "*.jpg/png/webp") — they're
// identifiers, not alt-text; they fall back to en-US. Matches the audit filter.
const isFilename = (s) => /^File:/i.test(s) || /\.(jpe?g|png|webp|gif|tiff?)$/i.test(s);

const en = JSON.parse(fs.readFileSync(`${DIR}/en-US.json`, 'utf8'));
const realKeys = Object.keys(en).filter(
  (k) => typeof en[k] === 'string' && en[k].trim() && !isFilename(en[k]),
);
console.log(
  `en-US: ${Object.keys(en).length} entries · ${realKeys.length} real captions to localize`,
);

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY');
  process.exit(1);
}
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function translateBatch(locale, strings) {
  const r = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 8192,
    system: `Translate short image alt-text captions from English to ${NAMES[locale]}. Keep proper nouns (spacecraft/mission/agency/place/person names), numbers, units, dates, symbols verbatim. Keep universal acronyms (ISS, JWST, NASA, ESA, JAXA, LRO, GPS). Return via the submit tool, same order + count.`,
    tools: [
      {
        name: 'submit',
        description: 'Submit translations',
        input_schema: {
          type: 'object',
          properties: { translations: { type: 'array', items: { type: 'string' } } },
          required: ['translations'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'submit' },
    messages: [
      {
        role: 'user',
        content: `Translate these ${strings.length} alt-text strings to ${NAMES[locale]}, same order:\n\n${JSON.stringify(strings, null, 2)}`,
      },
    ],
  });
  const b = r.content.find((x) => x.type === 'tool_use');
  if (!b) throw new Error('no tool_use');
  return b.input.translations;
}

for (const loc of LOCALES) {
  const outPath = `${DIR}/${loc}.json`;
  const out = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : {};
  const todo = realKeys.filter((k) => !out[k]);
  if (!todo.length) {
    console.log(`${loc}: complete (${Object.keys(out).length})`);
    continue;
  }
  console.log(`${loc}: ${todo.length} to translate`);
  for (let i = 0; i < todo.length; i += BATCH) {
    const keys = todo.slice(i, i + BATCH);
    try {
      const tr = await translateBatch(
        loc,
        keys.map((k) => en[k]),
      );
      keys.forEach((k, j) => {
        if (tr[j]) out[k] = tr[j];
      });
      fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
    } catch (e) {
      console.error(`  ${loc} batch@${i} FAIL: ${e.message}`);
    }
  }
  console.log(`  ${loc}: wrote ${Object.keys(out).length} entries`);
}
console.log('DONE');
