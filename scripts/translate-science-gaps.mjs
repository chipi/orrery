/**
 * Fill EVERY missing /science locale overlay so all 14 locales are complete
 * (no en-US fallback at runtime). Walks static/data/i18n/en-US/science/**,
 * and for each of the 13 non-en-US locales translates any overlay file that
 * doesn't yet exist — sections, tab _intro.json, and the _landing.json.
 *
 * Generic over the heterogeneous overlay shapes (title / intro_sentence /
 * narrative_101[] / body_paragraphs[] / chapters[] / tools[] / headline /
 * intro_paragraphs[] / …): translates string leaves, preserves keys,
 * structure, array lengths, numbers, LaTeX, URLs and proper nouns. The
 * recursive structure guard refuses to write a file whose shape drifted.
 *
 * Run: set -a; source .env; set +a; node scripts/translate-science-gaps.mjs
 * Re-runs are safe — only missing files are written.
 */
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(import.meta.dirname, '..');
const EN = path.join(ROOT, 'static/data/i18n/en-US/science');
const I18N = path.join(ROOT, 'static/data/i18n');

const LOCALES = [
  'ar', 'de', 'es', 'fr', 'hi', 'it', 'ja',
  'ko', 'nl', 'pt-BR', 'ru', 'sr-Cyrl', 'zh-CN',
];
const NAMES = {
  ar: 'Modern Standard Arabic', de: 'German', es: 'European Spanish',
  fr: 'French', hi: 'Hindi', it: 'Italian', ja: 'Japanese', ko: 'Korean',
  nl: 'Dutch', 'pt-BR': 'Brazilian Portuguese', ru: 'Russian',
  'sr-Cyrl': 'Serbian (Cyrillic)', 'zh-CN': 'Simplified Chinese',
};

const SYSTEM = `Translate this ordered list of Orrery /science strings from en-US.
Return EXACTLY the same number of strings in the same order via the submit tool —
never merge, split, drop, or reorder entries. Each string is one field value
(a heading, sentence, label, caption, or list item).

KEEP UNTRANSLATED:
- Proper nouns: mission names (Apollo 11, Voyager 1, Sputnik, Cassini…), people
  (Newton, Tsiolkovsky, Goddard, Kepler, Hohmann…), spacecraft, agencies
  (NASA, ESA, JAXA, CNSA, ISRO, Roscosmos), and place/feature names.
- URLs, file paths, ids/slugs, and any LaTeX / math (\\(...\\), $...$, \\frac, etc.).
- Numbers, units, dates and symbols exactly: AU, km, m/s, °, ≈, ×, %, Δv, em-dash —.
- Brand words inside link labels (Wikipedia, NASA, ESA) — translate only the
  connecting words around them.

TRANSLATE NATURALLY:
- Use the native names for Earth, Moon, Sun and the planets where the prose flows
  (German Erde/Mond/Sonne, etc.), declined correctly. In terse stat fragments that
  mirror on-screen labels, leaving the planet name in English is fine.
- Use the established astronomical/engineering term in the target language, not a
  literal calque. Match the en-US tone: accessible but precise, third-person.`;

const tool = {
  name: 'submit',
  description: 'Submit the translated strings in the same order + count as the input.',
  input_schema: {
    type: 'object',
    properties: { translations: { type: 'array', items: { type: 'string' } } },
    required: ['translations'],
  },
};

/** Collect string leaves in stable DFS order. */
function collect(node, out) {
  if (typeof node === 'string') out.push(node);
  else if (Array.isArray(node)) node.forEach((v) => collect(v, out));
  else if (node && typeof node === 'object') Object.values(node).forEach((v) => collect(v, out));
}
/** Clone `node`, pulling each string leaf from the iterator in order — so the
 *  output structure is the en-US structure by construction (no key/array drift). */
function rebuild(node, it) {
  if (typeof node === 'string') return it.next().value;
  if (Array.isArray(node)) return node.map((v) => rebuild(v, it));
  if (node && typeof node === 'object') {
    const o = {};
    for (const [k, v] of Object.entries(node)) o[k] = rebuild(v, it);
    return o;
  }
  return node;
}

function listEnOverlays(dir = EN, rel = '') {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out = out.concat(listEnOverlays(path.join(dir, e.name), r));
    else if (e.name.endsWith('.json')) out.push(r);
  }
  return out;
}

const oneTool = {
  name: 'submit_one',
  description: 'Submit the single translated string.',
  input_schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
};

/** Translate a single string — the bulletproof fallback when the batched
 *  array response splits/merges entries (some math-heavy strings make the
 *  model return a per-character array). */
async function translateOne(client, locale, s) {
  const r = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: SYSTEM,
    tools: [oneTool],
    tool_choice: { type: 'tool', name: 'submit_one' },
    messages: [
      { role: 'user', content: `Translate this one string into ${NAMES[locale]} (${locale}):\n\n${s}` },
    ],
  });
  const block = r.content.find((b) => b.type === 'tool_use');
  const text = block?.input?.text;
  if (typeof text !== 'string') throw new Error('no text in single-string response');
  return text;
}

async function translate(client, locale, source) {
  const leaves = [];
  collect(source, leaves);
  let translated;
  const r = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 16384,
    system: SYSTEM,
    tools: [tool],
    tool_choice: { type: 'tool', name: 'submit' },
    messages: [
      {
        role: 'user',
        content: `Translate into ${NAMES[locale]} (${locale}). ${leaves.length} strings, in order:\n\n${JSON.stringify(leaves)}`,
      },
    ],
  });
  const block = r.content.find((b) => b.type === 'tool_use');
  const arr = block?.input?.translations;
  if (Array.isArray(arr) && arr.length === leaves.length && arr.every((s) => typeof s === 'string')) {
    translated = arr;
  } else {
    // Batched response drifted — translate each leaf individually.
    translated = [];
    for (const s of leaves) translated.push(await translateOne(client, locale, s));
  }
  // Reinsert into a clone of the en-US structure — structure is guaranteed.
  return rebuild(source, translated[Symbol.iterator]());
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY (set -a; source .env; set +a; node ...)');
    process.exit(1);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const enFiles = listEnOverlays();

  // Build the full work list (locale × missing file), then run with a small
  // concurrency cap so the sweep finishes in a couple of minutes.
  const jobs = [];
  for (const locale of LOCALES) {
    for (const rel of enFiles) {
      if (!fs.existsSync(path.join(I18N, locale, 'science', rel))) jobs.push({ locale, rel });
    }
  }
  console.log(`${jobs.length} overlay files to translate across ${LOCALES.length} locales`);

  let ok = 0, fail = 0, next = 0;
  const CONCURRENCY = 6;
  async function worker() {
    while (next < jobs.length) {
      const { locale, rel } = jobs[next++];
      const source = JSON.parse(fs.readFileSync(path.join(EN, rel), 'utf8'));
      try {
        const out = await translate(client, locale, source);
        const dst = path.join(I18N, locale, 'science', rel);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.writeFileSync(dst, JSON.stringify(out, null, 2) + '\n');
        console.log(`  ok  ${locale}/${rel}`);
        ok++;
      } catch (e) {
        console.error(`  FAIL ${locale}/${rel}: ${e.message}`);
        fail++;
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`\nDone: ${ok} written, ${fail} failed.`);
  if (fail) process.exit(1);
}

main();
