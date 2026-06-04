/**
 * Translate the remaining 15 satellite overlays (description +
 * surface_composition + library_labels) into all 13 non-en-US
 * locales. Companion to #304 sub-slice C — that pass shipped Moon
 * only as a fully-localized exemplar; this one fills in Phobos /
 * Deimos / Galileans / Saturnian / Uranian / Triton / Charon.
 *
 * Uses Anthropic Sonnet 4.6 with tool_use for guaranteed structured
 * output. The earlier #56 plain-text retries failed JSON.parse on
 * German prose; tool_use solves that on any model (schema-validated
 * tool input), so the Opus cost premium isn't warranted here.
 *
 * Run: set -a; source .env; set +a; node scripts/translate-satellites-303.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(import.meta.dirname, '..');
const EN_DIR = path.join(ROOT, 'static/data/i18n/en-US/satellites');
const I18N_ROOT = path.join(ROOT, 'static/data/i18n');

const LOCALES = ['ar','de','es','fr','hi','it','ja','ko','nl','pt-BR','ru','sr-Cyrl','zh-CN'];

const NAMES = {
  ar: 'Modern Standard Arabic', de: 'German', es: 'European Spanish',
  fr: 'French', hi: 'Hindi', it: 'Italian', ja: 'Japanese', ko: 'Korean',
  nl: 'Dutch', 'pt-BR': 'Brazilian Portuguese', ru: 'Russian',
  'sr-Cyrl': 'Serbian (Cyrillic)', 'zh-CN': 'Simplified Chinese',
};

// All moons except 'moon' itself (already translated in #304 close).
const MOONS = [
  'phobos', 'deimos',
  'io', 'europa', 'ganymede', 'callisto',
  'titan', 'enceladus',
  'miranda', 'ariel', 'umbriel', 'titania', 'oberon',
  'triton', 'charon',
];

const SYSTEM = `Translate Orrery satellite (moon) editorial content from en-US.

CRITICAL CONSTRAINTS:
- Keep proper nouns: mission names (Voyager 1, Galileo, Juno, Cassini, New Horizons, Pioneer, MRO),
  named features (Loki Patera, South Pole–Aitken basin, Mariner Valles), discoverers (Galileo Galilei,
  Christiaan Huygens, William Herschel), agencies (NASA, ESA, JAXA, USSR, Roscosmos).
- Preserve numbers, units, dates, temperatures (—°C, °C, km, m/s², kg).
- Preserve em-dashes (—) and unicode characters (×, ≈, ≤, ≥, °).
- mission_visits — keep entries as their canonical English form (proper nouns + dates + agency notes).
  The visited-by list reads like a credit roll, not narrative — leave it English.
- library_labels are short link titles like "NASA — Cassini at Titan". Keep "Wikipedia", "NASA",
  "ESA", "USGS" untranslated; translate connecting words like "overview", "catalog", "encyclopedia".
- Match the en-US tone: accessible but precise, third-person.`;

const tool = {
  name: 'submit_translation',
  description: 'Submit the translated satellite overlay JSON. Keep the same shape as the input.',
  input_schema: {
    type: 'object',
    properties: {
      description: { type: 'string' },
      surface_composition: { type: 'string' },
      mission_visits: { type: 'array', items: { type: 'string' } },
      library_labels: { type: 'object', additionalProperties: { type: 'string' } },
    },
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
        content: `Translate the following satellite overlay into ${NAMES[locale]} (${locale}). Output via the submit_translation tool.\n\nSource (en-US):\n\n${JSON.stringify(overlay, null, 2)}`,
      },
    ],
  });
  const block = r.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') {
    throw new Error('no tool_use block in response');
  }
  return block.input;
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY');
    process.exit(1);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let ok = 0, fail = 0, skip = 0;
  for (const moon of MOONS) {
    const enPath = path.join(EN_DIR, `${moon}.json`);
    if (!fs.existsSync(enPath)) { console.log(`skip ${moon} — no en-US`); skip++; continue; }
    const overlay = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    console.log(`=== ${moon} ===`);
    for (const locale of LOCALES) {
      const outDir = path.join(I18N_ROOT, locale, 'satellites');
      const outPath = path.join(outDir, `${moon}.json`);
      if (fs.existsSync(outPath)) {
        const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
        if (existing && Object.keys(existing).length > 0) {
          process.stdout.write(`  ${locale}... skip(exists) `);
          skip++;
          continue;
        }
      }
      process.stdout.write(`  ${locale}... `);
      try {
        const tr = await translate(client, locale, overlay);
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(outPath, JSON.stringify(tr, null, 2) + '\n', 'utf8');
        process.stdout.write('ok\n');
        ok++;
      } catch (err) {
        process.stdout.write(`FAIL ${err.message}\n`);
        fail++;
      }
    }
  }
  console.log(`\nDone: ok=${ok} skip=${skip} fail=${fail}`);
}

main();
