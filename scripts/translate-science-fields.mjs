/**
 * Targeted science-overlay field translator.
 *
 * Re-translates ONLY the specified field(s) of a /science article into the 13
 * non-en-US locales — for surgical fact-check fixes where re-translating the
 * whole article would be wasteful and would churn untouched prose. Every locale
 * mirrors the en-US structure (same keys, same array lengths), so a field is
 * patched in place at the identical path.
 *
 *   set -a; source /path/to/.env; set +a
 *   node scripts/translate-science-fields.mjs --file=planets/regolith \
 *        --paths=body_paragraphs.1,intro_sentence [--locales=all|de,ja]
 *
 * Path syntax: dot-separated; a numeric segment is an array index
 * (e.g. body_paragraphs.2 → body_paragraphs[2]).
 *
 * Model matches the science-essay pipeline (claude-haiku-4-5). Edit the en-US
 * source FIRST, then run this to propagate just those fields.
 */

import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(import.meta.dirname, '..');
// Subdir under i18n-src/<loc>/ holding the overlay. Defaults to 'science' (the
// encyclopedia); pass --dir= (empty) or --dir=planets etc. for body overlays.
let SUBDIR = 'science';
const SCIENCE = (loc) => path.join(ROOT, 'i18n-src', loc, SUBDIR);
const MODEL = 'claude-haiku-4-5';

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
const ALL = Object.keys(NAMES);

const SYSTEM = `You are a professional literary translator localising a premium space-science encyclopedia into {LANG}. Translate each English string into {LANG}, preserving:
- Markdown syntax exactly (**bold**, *italic*, [text](url), lists) — translate only human-readable text, never URLs/targets.
- Numbers, units, formulae, and proper nouns (missions, agencies, spacecraft) in their conventional native form.
- Scientific terminology precise and consistent with standard {LANG} usage.
- The register: precise, evocative editorial prose — not UI copy.
Return ONLY the translation of the given field via the tool — no preamble, no brackets, no extra text.`;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=')];
  }),
);
if (!args.file || !args.paths) {
  console.error(
    'usage: --file=<tab>/<id> --paths=field[.idx],... [--locales=all|de,ja] [--dir=science]',
  );
  process.exit(1);
}
if (args.dir !== undefined) SUBDIR = args.dir;
const paths = args.paths
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);
const locales = !args.locales || args.locales === 'all' ? ALL : args.locales.split(',');

function getAt(obj, dotted) {
  return dotted
    .split('.')
    .reduce((o, seg) => (o == null ? o : o[/^\d+$/.test(seg) ? Number(seg) : seg]), obj);
}
function setAt(obj, dotted, val) {
  const segs = dotted.split('.');
  const last = segs.pop();
  const parent = segs.reduce((o, seg) => o[/^\d+$/.test(seg) ? Number(seg) : seg], obj);
  parent[/^\d+$/.test(last) ? Number(last) : last] = val;
}

const enPath = path.join(SCIENCE('en-US'), `${args.file}.json`);
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const enStrings = paths.map((p) => {
  const v = getAt(en, p);
  if (typeof v !== 'string') {
    console.error(`  ✗ ${p} is not a string in en-US (${typeof v}) — check the path`);
    process.exit(1);
  }
  return v;
});
console.log(`Source: ${args.file} · ${paths.length} field(s) · title="${en.title}"`);

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ONE field per call → the tool returns a single `translation` string. No array
// parsing, so prose with quotes/newlines can't corrupt the result (haiku was
// intermittently returning stringified arrays for some locales).
async function translateField(locale, text, model = MODEL) {
  const r = await client.messages.create({
    model,
    max_tokens: 4000,
    system: SYSTEM.replace('{LANG}', NAMES[locale]),
    tools: [
      {
        name: 'submit_translation',
        description: 'Submit the single translated string.',
        input_schema: {
          type: 'object',
          properties: { translation: { type: 'string' } },
          required: ['translation'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'submit_translation' },
    messages: [
      {
        role: 'user',
        content:
          `Article: "${en.title}". Translate this field into ${NAMES[locale]}. ` +
          `Return only the translation.\n\n${JSON.stringify(text)}`,
      },
    ],
  });
  const use = r.content.find((c) => c.type === 'tool_use');
  const t = use?.input?.translation;
  return typeof t === 'string' && t.trim().length > 0 ? t : null;
}

const FALLBACK_MODEL = 'claude-sonnet-4-6';
async function translate(locale, strings) {
  const out = [];
  for (const s of strings) {
    let res = null;
    for (let a = 0; a < 3 && !res; a++) res = await translateField(locale, s, MODEL);
    for (let a = 0; a < 2 && !res; a++) {
      res = await translateField(locale, s, FALLBACK_MODEL);
      if (res) console.log(`    (${locale} field via ${FALLBACK_MODEL})`);
    }
    if (!res) throw new Error(`${locale}: no translation returned for a field after retries`);
    out.push(res);
  }
  return out;
}

let ok = 0;
for (const loc of locales) {
  const locPath = path.join(SCIENCE(loc), `${args.file}.json`);
  if (!fs.existsSync(locPath)) {
    console.error(`  ✗ ${loc}: no overlay at ${locPath}`);
    continue;
  }
  try {
    const translated = await translate(loc, enStrings);
    const obj = JSON.parse(fs.readFileSync(locPath, 'utf8'));
    paths.forEach((p, i) => setAt(obj, p, translated[i]));
    fs.writeFileSync(locPath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
    console.log(`  ✓ ${loc}: ${paths.length} field(s) patched`);
    ok += 1;
  } catch (e) {
    console.error(`  ✗ ${loc}: ${e.message}`);
  }
}
console.log(`Done — ${ok}/${locales.length} locales.`);
