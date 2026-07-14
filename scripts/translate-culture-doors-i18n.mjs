/**
 * Culture-door blurb translator (/explore v2 Slice 3).
 *
 * Each en-US overlay in `i18n-src/en-US/universe/named-stars/<id>.json` has the
 * shape { fact, bio, cultural, links:[{l,u,t}], photo?:{src,kind} }. Only the
 * three prose fields are translatable; `links`, `photo`, and every url/tier are
 * preserved verbatim. Structure is reassembled in code so nothing else drifts.
 *
 * Re-runs are safe: existing non-empty locale files are skipped.
 *
 * Run: set -a; source .env; set +a; node scripts/translate-named-stars-i18n.mjs [--only=<id>] [--locales=de,fr]
 */
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(import.meta.dirname, '..');
const EN = path.join(ROOT, 'i18n-src', 'en-US', 'culture-doors');

const ALL_LOCALES = [
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

const argOnly = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];
const argLoc = (process.argv.find((a) => a.startsWith('--locales=')) || '').split('=')[1];
const LOCALES = argLoc ? argLoc.split(',') : ALL_LOCALES;

const SYSTEM = `Translate an Orrery 'culture door' blurb from en-US into the target language. These are short notes attaching a work of fiction, a real space message, or an interstellar visitor to a real astronomical object (e.g. Vega and Carl Sagan's Contact, Kepler-16b and Star Wars' Tatooine, the Voyager Golden Record).

CRITICAL CONSTRAINTS:
- Keep titles of works, spacecraft, missions, and proper names verbatim (Contact, Star Wars, Tatooine, Rocheworld, Project Daedalus, Voyager, Golden Record, Arecibo, ʻOumuamua, Kepler-16b, Vega, M13), and people (Carl Sagan, George Lucas, Robert L. Forward, Frank Drake) — translate a title only where a standard local form exists.
- Preserve numbers, units, dates, and symbols exactly (1985, 1977, 25,000 light-years, 50,000 years).
- Keep the honest 'fiction over fact' tone: the story is a labelled layer, the science stays real.
- You are given an ordered JSON array of strings; return an array of the SAME length + order, each the translation of the corresponding source string.`;

async function translateStrings(client, locale, strings) {
  const r = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    system: SYSTEM,
    tools: [
      {
        name: 'submit_translation',
        description: 'Submit the translated strings, same length + order as the source array.',
        input_schema: {
          type: 'object',
          properties: { translations: { type: 'array', items: { type: 'string' } } },
          required: ['translations'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'submit_translation' },
    messages: [
      {
        role: 'user',
        content: `Translate each string in this array into ${NAMES[locale]} (${locale}). Return exactly ${strings.length} strings via submit_translation, same order.\n\n${JSON.stringify(strings, null, 2)}`,
      },
    ],
  });
  const block = r.content.find((b) => b.type === 'tool_use');
  if (!block) throw new Error('no tool_use');
  return block.input.translations;
}

async function translateOne(client, locale, str) {
  const r = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    system: SYSTEM,
    tools: [
      {
        name: 'submit_one',
        description: 'Submit the single translated string.',
        input_schema: {
          type: 'object',
          properties: { translation: { type: 'string' } },
          required: ['translation'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'submit_one' },
    messages: [
      {
        role: 'user',
        content: `Translate this single string into ${NAMES[locale]} (${locale}). Return one string via submit_one.\n\n${JSON.stringify(str)}`,
      },
    ],
  });
  const b = r.content.find((x) => x.type === 'tool_use');
  if (!b) throw new Error('no tool_use');
  return b.input.translation;
}

async function translateArraySafe(client, locale, strings) {
  const tr = await translateStrings(client, locale, strings);
  if (tr.length === strings.length) return tr;
  const out = [];
  for (const s of strings) out.push(await translateOne(client, locale, s));
  return out;
}

// Translatable prose fields, deterministic order. links/photo are preserved as-is.
const FIELDS = ['blurb'];

function extract(overlay) {
  return FIELDS.filter((f) => typeof overlay[f] === 'string').map((f) => overlay[f]);
}
function rebuild(overlay, translated) {
  const out = JSON.parse(JSON.stringify(overlay));
  const present = FIELDS.filter((f) => typeof overlay[f] === 'string');
  present.forEach((f, i) => {
    out[f] = translated[i];
  });
  return out;
}

const CONCURRENCY = 6;
async function runPool(items, worker) {
  let i = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx]);
    }
  });
  await Promise.all(runners);
}

async function main() {
  const client = new Anthropic();
  const ids = fs
    .readdirSync(EN)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .filter((id) => !argOnly || id === argOnly);
  const gaps = [];
  let skipped = 0;
  for (const id of ids) {
    const overlay = JSON.parse(fs.readFileSync(path.join(EN, `${id}.json`), 'utf8'));
    const strings = extract(overlay);
    for (const loc of LOCALES) {
      const dst = path.join(ROOT, 'i18n-src', loc, 'culture-doors', `${id}.json`);
      if (fs.existsSync(dst) && fs.statSync(dst).size > 2) {
        skipped++;
        continue;
      }
      gaps.push({ id, loc, overlay, strings, dst });
    }
  }
  console.log(
    `named-stars: ${gaps.length} gaps to translate (${skipped} already done), concurrency ${CONCURRENCY}`,
  );
  let done = 0;
  let failed = 0;
  await runPool(gaps, async (g) => {
    try {
      const translated = await translateArraySafe(client, g.loc, g.strings);
      if (translated.length !== g.strings.length)
        throw new Error(`length ${translated.length} != ${g.strings.length}`);
      const out = rebuild(g.overlay, translated);
      fs.mkdirSync(path.dirname(g.dst), { recursive: true });
      fs.writeFileSync(g.dst, JSON.stringify(out, null, 2) + '\n', 'utf8');
      done++;
      console.log(`✓ ${g.id} → ${g.loc} (${done}/${gaps.length})`);
    } catch (e) {
      failed++;
      console.error(`✗ ${g.id} → ${g.loc}: ${e.message}`);
    }
  });
  console.log(`\nculture-doors i18n: ${done} written, ${skipped} skipped, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main();
