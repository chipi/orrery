/**
 * Translate the /science _landing.json overlay for any locale still missing
 * it. The landing page is deeply nested (intro_paragraphs[], 8 chapters[],
 * 6 tools[], closing), and asking a model to echo the whole JSON drifts the
 * structure. This instead translates only the STRING LEAVES in place: collect
 * them in a stable DFS order, translate the flat list, and reinsert into a
 * deep clone of the en-US file — so the structure is en-US's by construction.
 *
 * Run: set -a; source .env; set +a; node scripts/translate-landing-leaves.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'static/data/i18n/en-US/science/_landing.json');
const I18N = path.join(ROOT, 'static/data/i18n');
const LOCALES = ['ar', 'de', 'es', 'fr', 'hi', 'it', 'ja', 'ko', 'nl', 'pt-BR', 'ru', 'sr-Cyrl', 'zh-CN'];
const NAMES = {
  ar: 'Modern Standard Arabic', de: 'German', es: 'European Spanish', fr: 'French',
  hi: 'Hindi', it: 'Italian', ja: 'Japanese', ko: 'Korean', nl: 'Dutch',
  'pt-BR': 'Brazilian Portuguese', ru: 'Russian', 'sr-Cyrl': 'Serbian (Cyrillic)', 'zh-CN': 'Simplified Chinese',
};

/** Collect string leaves in stable DFS order. */
function collect(node, out) {
  if (typeof node === 'string') out.push(node);
  else if (Array.isArray(node)) node.forEach((v) => collect(v, out));
  else if (node && typeof node === 'object') Object.values(node).forEach((v) => collect(v, out));
}
/** Rebuild a clone of `node`, pulling each string leaf from `it` in order. */
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

const SYSTEM = `Translate this ordered list of Orrery /science landing-page strings from en-US.
Return EXACTLY the same number of strings in the same order via the submit tool.
Keep proper nouns (Apollo 11, Voyager, Newton, NASA, ESA…), URLs, numbers, units,
dates and symbols (°, ×, ≈, %, AU, km, Δv, em-dash —). Use native names for Earth/
Moon/Sun/planets where natural. Each string may be a heading, sentence, or short
label — translate it idiomatically; never merge or split entries.`;

const tool = {
  name: 'submit',
  description: 'Submit the translated strings in the same order + count as the input.',
  input_schema: {
    type: 'object',
    properties: { translations: { type: 'array', items: { type: 'string' } } },
    required: ['translations'],
  },
};

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY');
    process.exit(1);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const enDoc = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const leaves = [];
  collect(enDoc, leaves);

  let ok = 0, fail = 0;
  for (const locale of LOCALES) {
    const dst = path.join(I18N, locale, 'science/_landing.json');
    if (fs.existsSync(dst)) continue;
    try {
      const r = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 16384,
        system: SYSTEM,
        tools: [tool],
        tool_choice: { type: 'tool', name: 'submit' },
        messages: [
          {
            role: 'user',
            content: `Translate into ${NAMES[locale]} (${locale}). ${leaves.length} strings, in order:\n\n${JSON.stringify(leaves, null, 0)}`,
          },
        ],
      });
      const block = r.content.find((b) => b.type === 'tool_use');
      const translations = block?.input?.translations;
      if (!Array.isArray(translations) || translations.length !== leaves.length) {
        throw new Error(`expected ${leaves.length} strings, got ${translations?.length}`);
      }
      const rebuilt = rebuild(enDoc, translations[Symbol.iterator]());
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst, JSON.stringify(rebuilt, null, 2) + '\n');
      console.log(`  ok  ${locale}`);
      ok++;
    } catch (e) {
      console.error(`  FAIL ${locale}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\nDone: ${ok} written, ${fail} failed.`);
  if (fail) process.exit(1);
}

main();
