/**
 * Translate the asteroid + Kuiper Belt panel content into all 13 non-
 * en-US locales (2026-06-06 user direction: "do we have nicely filled
 * in details, translated, some images etc"). Companion to
 * `scripts/translate-satellites-303.mjs` — same Anthropic Sonnet
 * tool_use pattern; different source shape (belts have a `name` /
 * `kind` / `location` / `population_estimate` / `total_mass_relative`
 * / `discovered` shape on top of the satellite-style description +
 * largest_members + mission_visits + library_labels).
 *
 * Source: static/data/belts.json (English base, hand-authored).
 * Output: static/data/i18n/<locale>/belts/<id>.json (overlay).
 *
 * Run: set -a; source .env; set +a; node scripts/translate-belts.mjs
 *
 * Re-runs are safe — existing non-empty overlay files are skipped.
 * Delete a file to force a re-translation for that locale + belt.
 */
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE_PATH = path.join(ROOT, 'static/data/belts.json');
const I18N_ROOT = path.join(ROOT, 'static/data/i18n');

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

const SYSTEM = `Translate Orrery belt (asteroid belt / Kuiper Belt) editorial content from en-US.

CRITICAL CONSTRAINTS:
- Keep proper nouns: body names (Ceres, Vesta, Pallas, Hygiea, Pluto, Eris, Makemake,
  Haumea, Quaoar, Sedna, Charon, Arrokoth), mission names (Dawn, Galileo, Hayabusa2,
  Lucy, New Horizons, Voyager 1, Voyager 2), people (Giuseppe Piazzi, Gerard Kuiper,
  David Jewitt, Jane Luu), and place / feature names (Sputnik Planitia, Occator,
  Dinkinesh).
- Preserve numbers, units, dates, and Unicode symbols: AU, km, m, °, ≈, ×, %, em-dash —
- mission_visits — keep proper nouns + dates + agency tags as English ("NASA, 2015");
  translate only the parenthetical descriptors ("orbital surveys", "flyby").
- library_labels are short link titles. Keep "Wikipedia", "NASA", "Minor Planet Center",
  "ESA", "JAXA" untranslated; translate connecting words like "overview", "catalogue".
- Match the en-US tone: accessible but precise, third-person.`;

const tool = {
  name: 'submit_translation',
  description: 'Submit the translated belt overlay JSON. Keep the same shape as the input.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      kind: { type: 'string' },
      location: { type: 'string' },
      population_estimate: { type: 'string' },
      total_mass_relative: { type: 'string' },
      largest_members: { type: 'array', items: { type: 'string' } },
      description: { type: 'string' },
      discovered: { type: 'string' },
      mission_visits: { type: 'array', items: { type: 'string' } },
      library_labels: { type: 'object', additionalProperties: { type: 'string' } },
    },
  },
};

function buildOverlayPayload(belt) {
  const library_labels = {};
  for (const link of belt.library ?? []) library_labels[link.id] = link.label;
  return {
    name: belt.name,
    kind: belt.kind,
    location: belt.location,
    population_estimate: belt.population_estimate,
    total_mass_relative: belt.total_mass_relative,
    largest_members: belt.largest_members,
    description: belt.description,
    discovered: belt.discovered,
    mission_visits: belt.mission_visits,
    library_labels,
  };
}

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
        content: `Translate the following belt overlay into ${NAMES[locale]} (${locale}). Output via the submit_translation tool.\n\nSource (en-US):\n\n${JSON.stringify(overlay, null, 2)}`,
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
  const { belts } = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));
  if (!Array.isArray(belts)) {
    console.error('belts.json missing `belts` array');
    process.exit(1);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let ok = 0,
    fail = 0,
    skip = 0;
  for (const belt of belts) {
    const overlay = buildOverlayPayload(belt);
    console.log(`=== ${belt.id} ===`);
    for (const locale of LOCALES) {
      const outDir = path.join(I18N_ROOT, locale, 'belts');
      const outPath = path.join(outDir, `${belt.id}.json`);
      if (fs.existsSync(outPath)) {
        const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
        if (existing && Object.keys(existing).length > 0) {
          console.log(`  ${locale}... skip(exists)`);
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
