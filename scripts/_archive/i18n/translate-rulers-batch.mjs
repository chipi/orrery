/**
 * Translate the remaining orbit-ruler overlays into all 13 non-en-US
 * locales — /moon, /mars, /explore. /earth already done by
 * `translate-orbit-regimes.mjs`; this script covers the three rulers
 * that landed after Marko batched their i18n to a single pass
 * (2026-06-22 "i18n after all 4 are done").
 *
 * Same Sonnet tool_use shape as translate-orbit-regimes; the per-
 * bundle iterator walks each en-US overlay and writes missing locale
 * overlays. Existing non-empty files are skipped.
 *
 * Also includes earth_regime_chip_aria paraglide key (added in the
 * regime-chip iteration; never got translated standalone).
 *
 * Run: set -a; source .env; set +a; node scripts/translate-rulers-batch.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(import.meta.dirname, '..');
const I18N = path.join(ROOT, 'static/data/i18n');
const MESSAGES_DIR = path.join(ROOT, 'messages');

const BUNDLES = ['orbit-regimes-moon', 'orbit-regimes-mars', 'orbit-regimes-explore'];

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

const SYSTEM = `Translate Orrery orbital-regime + heliocentric-zone editorial content (orbit-ruler panels) from en-US.

CRITICAL CONSTRAINTS:
- Keep proper nouns: spacecraft, moons, dwarf planets, agencies, people, mission names. Common cases include: LRO, Chandrayaan-2, Queqiao, CAPSTONE, Gateway, MAVEN, MRO, Mars Express, Tianwen-1, Mangalyaan, Mars Odyssey, TGO, Hope, Mariner 9, Mars 3, Viking 1, Ceres, Vesta, Pallas, Hygiea, Pluto, Eris, Makemake, Haumea, Quaoar, Arrokoth, Sedna, Voyager 1, Voyager 2, JWST, Apollo 8, Luna 1/10, Sputnik 1.
- Preserve numbers, units, dates, Unicode symbols: km, AU, °, ≈, ×, %, em-dash —.
- Keep universal space acronyms untranslated: LLO, HLO, NRHO, DRO, LMO, HMO, AREO, DMO, HILL, SUN, BELT, GIANTS, KUIPER, SCATTERED, HELIOPAUSE, OORT, TERRA, GEO, LEO, MEO, L2.
- short field is the regime/zone code (always untranslated).
- residents[].label — translate the descriptive part after the em-dash, keep the proper noun. residents[].id and residents[].agency — DO NOT translate; pass through verbatim.
- firsts[].label — translate descriptive prose; preserve proper nouns + agency parentheticals.
- firsts[].year and firsts[].mission_id — DO NOT translate; pass through verbatim.
- science_link — DO NOT translate; pass through verbatim.
- Match en-US tone: accessible but precise, slightly literary.`;

const tool = {
  name: 'submit_translation',
  description: 'Submit the translated regime/zone overlay JSON. Keep the same shape as the input.',
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

async function translate(client, bundle, locale, overlay) {
  const r = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: SYSTEM,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'submit_translation' },
    messages: [
      {
        role: 'user',
        content: `Translate the following ${bundle} overlay into ${NAMES[locale]} (${locale}). Output via the submit_translation tool.\n\nSource (en-US):\n\n${JSON.stringify(overlay, null, 2)}`,
      },
    ],
  });
  const block = r.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('no tool_use block');
  return block.input;
}

async function runBundle(client, bundle) {
  const srcDir = path.join(I18N, 'en-US', bundle);
  if (!fs.existsSync(srcDir)) {
    console.log(`SKIP missing source dir: ${bundle}`);
    return [0, 0, 0];
  }
  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.json'));
  let ok = 0,
    fail = 0,
    skip = 0;
  for (const file of files) {
    const id = file.replace(/\.json$/, '');
    const overlay = JSON.parse(fs.readFileSync(path.join(srcDir, file), 'utf8'));
    console.log(`=== [${bundle}] ${id} ===`);
    for (const locale of LOCALES) {
      const outDir = path.join(I18N, locale, bundle);
      const outPath = path.join(outDir, file);
      if (fs.existsSync(outPath)) {
        try {
          const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
          if (existing && Object.keys(existing).length > 0) {
            console.log(`  ${locale}... skip(exists)`);
            skip++;
            continue;
          }
        } catch {
          // existing overlay unreadable — fall through to re-translate
        }
      }
      process.stdout.write(`  ${locale}... `);
      try {
        const tr = await translate(client, bundle, locale, overlay);
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
  return [ok, skip, fail];
}

async function translateChipAriaKey(client) {
  // Single paraglide key — earth_regime_chip_aria. Was added in the
  // regime-chip iteration; never standalone-translated.
  const KEY = 'earth_regime_chip_aria';
  const en = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, 'en-US.json'), 'utf8'));
  if (!en[KEY]) {
    console.log(`SKIP message key not in en-US: ${KEY}`);
    return;
  }
  const SYSTEM2 = `Translate a single Orrery UI label. Preserve {variable} placeholders verbatim. Short, idiomatic. Output JSON: {"${KEY}": "<translation>"}. No fences.`;
  let ok = 0,
    fail = 0,
    skip = 0;
  for (const loc of LOCALES) {
    const mpath = path.join(MESSAGES_DIR, `${loc}.json`);
    const messages = JSON.parse(fs.readFileSync(mpath, 'utf8'));
    if (messages[KEY]) {
      console.log(`  ${loc} ${KEY}... skip(exists)`);
      skip++;
      continue;
    }
    process.stdout.write(`  ${loc} ${KEY}... `);
    try {
      const r = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 200,
        system: SYSTEM2,
        messages: [
          {
            role: 'user',
            content: `Translate into ${NAMES[loc]}: ${JSON.stringify({ [KEY]: en[KEY] })}`,
          },
        ],
      });
      const text = r.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      const parsed = JSON.parse(text);
      messages[KEY] = parsed[KEY];
      fs.writeFileSync(mpath, JSON.stringify(messages, null, 2) + '\n', 'utf8');
      process.stdout.write('ok\n');
      ok++;
    } catch (err) {
      process.stdout.write(`FAIL ${err.message}\n`);
      fail++;
    }
  }
  console.log(`  earth_regime_chip_aria: ok=${ok} skip=${skip} fail=${fail}`);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY');
    process.exit(1);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let totalOk = 0,
    totalSkip = 0,
    totalFail = 0;
  for (const bundle of BUNDLES) {
    const [ok, skip, fail] = await runBundle(client, bundle);
    totalOk += ok;
    totalSkip += skip;
    totalFail += fail;
  }
  console.log(`\nOverlays: ok=${totalOk} skip=${totalSkip} fail=${totalFail}`);
  console.log('\nTranslating earth_regime_chip_aria across locales...');
  await translateChipAriaKey(client);
  console.log('\nDone');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
