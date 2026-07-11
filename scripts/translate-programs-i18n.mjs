/**
 * Program-overlay translator (the /programs editorial subsystem).
 *
 * The gap-filler `translate-i18n-gaps.mjs` covers earth-objects / planets /
 * science / missions / fleet, but NOT `programs/**` — those overlays have a
 * different, nested block-list shape (name, tagline, and six sections, each an
 * ordered list of {type:'prose', md} | {type:'figure', image, caption, align}).
 *
 * Rather than force that nested union through a tool schema (fragile), this
 * extracts every translatable string in a deterministic order, translates the
 * flat array, and reassembles the overlay in code — so structure, image refs,
 * align, and block order are preserved exactly, and only prose survives the
 * round trip.
 *
 * Re-runs are safe: existing non-empty locale files are skipped.
 *
 * Run: set -a; source .env; set +a; node scripts/translate-programs-i18n.mjs [--only=<id>] [--locales=de,fr]
 */
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(import.meta.dirname, '..');
const EN = path.join(ROOT, 'i18n-src', 'en-US', 'programs');

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

const SECTIONS = ['the_land', 'goals', 'outcome', 'narrative', 'legacy', 'lessons'];

// Single-string translation via a {translation: string} tool — cannot length-mismatch.
async function translateOne(client, locale, str) {
  const r = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
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

// Batch translate; on any length mismatch (a model quirk on long arrays), fall back to per-string.
async function translateArraySafe(client, locale, strings) {
  let tr = await translateStrings(client, locale, strings);
  if (tr.length === strings.length) return tr;
  const out = [];
  for (const s of strings) out.push(await translateOne(client, locale, s));
  return out;
}

const SYSTEM = `Translate Orrery /programs editorial content from en-US into the target language.

This is long-form editorial prose in a specific register: a "modern Wired field historian" — rigorous, precise, plain, never breathless. Preserve that register: accessible but exact, no marketing adjectives, no hype. Translate meaning and cadence, not word-for-word.

CRITICAL CONSTRAINTS:
- Keep proper nouns verbatim: spacecraft, rocket, mission, station, agency, person, and place names (Soyuz, Salyut, Mir, Skylab, Buran, Energia, Ariane, ISS, Apollo, Komarov, Korolev, Baikonur, Kourou, Zvezda, Columbus, Kibo, etc.). Translate a name only where the target language has a genuinely standard native form (e.g. "International Space Station" ↔ its established local name).
- Preserve numbers, units, dates, and Unicode symbols exactly (km, m, °, ≈, ×, %, the em-dash —, 437, 1988).
- Keep universal space acronyms untranslated: ISS, JWST, LEO, GEO, EVA, ATV, DOS, N1, LK, L3, NK-33, STS, ESM.
- Preserve Markdown inline syntax exactly (*emphasis*, etc.) where present.
- You are given an ordered JSON array of strings. Return an array of the SAME length, in the SAME order, each element the translation of the corresponding source string. Do not merge, split, drop, add, or reorder elements.`;

async function translateStrings(client, locale, strings) {
  const r = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 8192,
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

// Extract translatable strings in deterministic order; return {strings, slots}
function extract(overlay) {
  const strings = [];
  const slots = [];
  strings.push(overlay.name);
  slots.push({ kind: 'name' });
  strings.push(overlay.tagline);
  slots.push({ kind: 'tagline' });
  for (const sec of SECTIONS) {
    (overlay[sec] || []).forEach((block, i) => {
      if (block.type === 'prose') {
        strings.push(block.md);
        slots.push({ kind: 'md', sec, i });
      } else if (block.type === 'figure') {
        strings.push(block.caption);
        slots.push({ kind: 'caption', sec, i });
      }
    });
  }
  return { strings, slots };
}

function rebuild(overlay, slots, translated) {
  const out = JSON.parse(JSON.stringify(overlay)); // deep clone, preserves image/align/type/order
  slots.forEach((s, idx) => {
    const t = translated[idx];
    if (s.kind === 'name') out.name = t;
    else if (s.kind === 'tagline') out.tagline = t;
    else if (s.kind === 'md') out[s.sec][s.i].md = t;
    else if (s.kind === 'caption') out[s.sec][s.i].caption = t;
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
  // build gap list
  const gaps = [];
  let skipped = 0;
  for (const id of ids) {
    const overlay = JSON.parse(fs.readFileSync(path.join(EN, `${id}.json`), 'utf8'));
    const { strings, slots } = extract(overlay);
    for (const loc of LOCALES) {
      const dst = path.join(ROOT, 'i18n-src', loc, 'programs', `${id}.json`);
      if (fs.existsSync(dst) && fs.statSync(dst).size > 2) {
        skipped++;
        continue;
      }
      gaps.push({ id, loc, overlay, strings, slots, dst });
    }
  }
  console.log(
    `programs: ${gaps.length} gaps to translate (${skipped} already done), concurrency ${CONCURRENCY}`,
  );
  let done = 0,
    failed = 0;
  await runPool(gaps, async (g) => {
    try {
      const translated = await translateArraySafe(client, g.loc, g.strings);
      if (translated.length !== g.strings.length)
        throw new Error(`length ${translated.length} != ${g.strings.length}`);
      const out = rebuild(g.overlay, g.slots, translated);
      fs.mkdirSync(path.dirname(g.dst), { recursive: true });
      fs.writeFileSync(g.dst, JSON.stringify(out, null, 2) + '\n', 'utf8');
      done++;
      console.log(`✓ ${g.id} → ${g.loc} (${done}/${gaps.length})`);
    } catch (e) {
      failed++;
      console.error(`✗ ${g.id} → ${g.loc}: ${e.message}`);
    }
  });
  console.log(`\nprograms i18n: ${done} written, ${skipped} skipped, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}
main();
