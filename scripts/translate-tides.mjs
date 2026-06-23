/**
 * Translate the /science "Tides" explainer (planets/tides) into all 13
 * non-en-US locales. Companion to scripts/translate-belts.mjs — same
 * Anthropic Sonnet tool_use pattern; the source is the science-section
 * overlay shape (title / intro_sentence / narrative_101[] /
 * body_paragraphs[] / diagram_caption).
 *
 * Source: static/data/i18n/en-US/science/planets/tides.json (hand-authored).
 * Output: static/data/i18n/<locale>/science/planets/tides.json (overlay).
 *
 * Run: set -a; source .env; set +a; node scripts/translate-tides.mjs
 *
 * Re-runs are safe — existing non-empty overlay files are skipped.
 * Delete a file to force a re-translation for that locale.
 */
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE_PATH = path.join(ROOT, 'static/data/i18n/en-US/science/planets/tides.json');
const I18N_ROOT = path.join(ROOT, 'static/data/i18n');
const REL = 'science/planets/tides.json';

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

const SYSTEM = `Translate Orrery /science editorial content (the "Tides" explainer) from en-US.

CRITICAL CONSTRAINTS:
- Use the natural native names for Earth, Moon, and Sun in the target language
  (e.g. German Erde/Mond/Sonne, French Terre/Lune/Soleil, Japanese 地球/月/太陽),
  declined/inflected correctly — this is flowing narrative prose, not a label list.
- Keep the mission name "Luna 3" untranslated.
- Preserve all numbers, units, dates, and Unicode symbols exactly: cm, km, h, min,
  Myr, yr, ~, ≈, ×, %, °, the em-dash —, and the en-dash in "Earth–Moon".
- Translate the science terms accurately and idiomatically for each language:
  tidal force, tidal bulge, spring tide, neap tide, tidal locking, prolate, new moon,
  full moon, high tide, low tide. Use the established astronomical term in the target
  language, not a literal calque.
- Keep the structure: same number of array entries in narrative_101 and body_paragraphs.
- Match the en-US tone: accessible but precise, third-person.`;

const tool = {
  name: 'submit_translation',
  description:
    'Submit the translated tides science overlay JSON. Keep the same shape + array lengths as the input.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      intro_sentence: { type: 'string' },
      narrative_101: { type: 'array', items: { type: 'string' } },
      body_paragraphs: { type: 'array', items: { type: 'string' } },
      diagram_caption: { type: 'string' },
    },
    required: ['title', 'intro_sentence', 'narrative_101', 'body_paragraphs', 'diagram_caption'],
  },
};

async function translate(client, locale, overlay) {
  const r = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: SYSTEM,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'submit_translation' },
    messages: [
      {
        role: 'user',
        content: `Translate the following tides overlay into ${NAMES[locale]} (${locale}). Output via the submit_translation tool.\n\nSource (en-US):\n\n${JSON.stringify(overlay, null, 2)}`,
      },
    ],
  });
  const block = r.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('no tool_use block in response');
  return block.input;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      'Missing ANTHROPIC_API_KEY (set -a; source .env; set +a; node scripts/translate-tides.mjs)',
    );
    process.exit(1);
  }
  const overlay = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let ok = 0,
    fail = 0,
    skip = 0;
  for (const locale of LOCALES) {
    const outPath = path.join(I18N_ROOT, locale, REL);
    if (fs.existsSync(outPath)) {
      const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
      if (existing && Object.keys(existing).length > 0) {
        console.log(`${locale}... skip(exists)`);
        skip++;
        continue;
      }
    }
    try {
      const translated = await translate(client, locale, overlay);
      // Guard the array lengths so a short response can't silently drop content.
      if (
        translated.narrative_101?.length !== overlay.narrative_101.length ||
        translated.body_paragraphs?.length !== overlay.body_paragraphs.length
      ) {
        throw new Error('array length mismatch vs source');
      }
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(translated, null, 2) + '\n');
      console.log(`${locale}... ok`);
      ok++;
    } catch (e) {
      console.error(`${locale}... FAIL: ${e.message}`);
      fail++;
    }
  }
  console.log(`\nDone: ${ok} ok, ${skip} skipped, ${fail} failed.`);
  if (fail) process.exit(1);
}

main();
