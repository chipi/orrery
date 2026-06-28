/**
 * Translate the orbit-regime panel overlays into all 13 non-en-US
 * locales (#354 — shipping ruler + regime panel requires full i18n,
 * per Marko's standing rule "we never ship untranslated things"). Same
 * tool_use pattern as `scripts/translate-belts.mjs`.
 *
 * Source: static/data/i18n/en-US/orbit-regimes/<id>.json (6 files).
 * Output: static/data/i18n/<locale>/orbit-regimes/<id>.json.
 *
 * Re-runs are safe — existing non-empty overlay files are skipped.
 * Delete a file to force a re-translation for that locale + regime.
 *
 * Run: set -a; source .env; set +a; node scripts/translate-orbit-regimes.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(import.meta.dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'static/data/i18n/en-US/orbit-regimes');
const I18N_ROOT = path.join(ROOT, 'static/data/i18n');

const REGIMES = ['LEO', 'MEO', 'GEO', 'HEO', 'MOON', 'L2'];

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

const SYSTEM = `Translate Orrery orbital-regime editorial content (the /earth orbit-ruler panel) from en-US.

CRITICAL CONSTRAINTS:
- Keep proper nouns: spacecraft (ISS, Tiangong, Hubble, JWST, Gaia, Euclid, SOHO, Herschel, Planck, WMAP, Sputnik 1, Vostok 1, GPS, GLONASS, Galileo, BeiDou, GOES, Inmarsat, Meteosat, Fengyun, Molniya, Tundra, IBEX, LRO, Chandrayaan-2, Queqiao, Apollo 8, Luna 1, Syncom 2, Syncom 3, Navstar 1), people (Yuri Gagarin), and agency tags (NASA, ESA, ROSCOSMOS, CNSA, ISRO, JAXA, SpaceX, USA, USSR).
- Preserve numbers, units, dates, and Unicode symbols: km, m, °, ≈, ×, %, em-dash —, decimal separators.
- Keep "LEO", "MEO", "GEO", "HEO", "MOON", "L2", "GNSS" untranslated — they are universal acronyms in space contexts. The "short" field is always the regime code (do not translate).
- residents[].label — translate the descriptive part after the em-dash, keep the proper noun (e.g. "ISS — International Space Station" → "ISS — Internationale Raumstation").
- residents[].id, residents[].agency — DO NOT translate; pass through verbatim.
- firsts[].label — translate descriptive prose; preserve proper nouns + agency parentheticals like "(USSR)" / "(USA)" verbatim.
- firsts[].year — pass through verbatim.
- firsts[].mission_id — DO NOT translate; pass through verbatim when present.
- science_link — DO NOT translate; pass through verbatim.
- Match the en-US tone: accessible but precise, slightly literary (the "story" prose has Crimson Pro serif energy — keep that lightness).`;

const tool = {
  name: 'submit_translation',
  description: 'Submit the translated orbit-regime overlay JSON. Keep the same shape as the input.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      short: { type: 'string' },
      story: { type: 'string' },
      comparison: { type: 'string' },
      residents: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            label: { type: 'string' },
            agency: { type: 'string' },
          },
          required: ['id', 'label', 'agency'],
        },
      },
      firsts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            year: { type: 'number' },
            label: { type: 'string' },
            mission_id: { type: 'string' },
          },
          required: ['year', 'label'],
        },
      },
      science_link: {
        type: 'object',
        properties: {
          tab: { type: 'string' },
          section: { type: 'string' },
        },
        required: ['tab', 'section'],
      },
    },
    required: ['name', 'short', 'story'],
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
        content: `Translate the following orbital-regime overlay into ${NAMES[locale]} (${locale}). Output via the submit_translation tool.\n\nSource (en-US):\n\n${JSON.stringify(overlay, null, 2)}`,
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
  let ok = 0,
    fail = 0,
    skip = 0;
  for (const regimeId of REGIMES) {
    const srcPath = path.join(SOURCE_DIR, `${regimeId}.json`);
    if (!fs.existsSync(srcPath)) {
      console.log(`MISSING source: ${regimeId}`);
      continue;
    }
    const overlay = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
    console.log(`=== ${regimeId} ===`);
    for (const locale of LOCALES) {
      const outDir = path.join(I18N_ROOT, locale, 'orbit-regimes');
      const outPath = path.join(outDir, `${regimeId}.json`);
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
