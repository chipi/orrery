/**
 * Essay-overlay translator (the /essays "Long View" subsystem).
 *
 * The gap-filler `translate-i18n-gaps.mjs` covers science / missions / fleet /
 * planets etc. but NOT `essays/**` — those overlays are `{title, dek, body[]}`
 * where body is an ordered list of `{type:'prose', md}` | `{type:'heading',
 * text}` | `{type:'figure', image, kind, caption, credit?, align}`.
 *
 * Like the /programs translator, this extracts every translatable string in a
 * deterministic order, translates the flat array in ONE call per essay×locale,
 * and reassembles the overlay in code — so block order, image refs, kind, align
 * and figure credits are preserved EXACTLY and only prose/heading/caption text
 * survives the round trip. A length mismatch is retried, never written.
 *
 * Re-runs are safe: existing non-empty locale files are skipped.
 *
 * Run: set -a; source .env; set +a; node scripts/translate-essays-i18n.mjs [--only=<slug>] [--locales=de,fr]
 */
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(import.meta.dirname, '..');
const EN = path.join(ROOT, 'i18n-src', 'en-US', 'essays');

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

const MODEL = 'claude-haiku-4-5-20251001';

/** Extract translatable strings in a fixed order: title, dek, then each body
 *  block's text field (prose.md | heading.text | figure.caption). */
function extract(essay) {
  const out = [essay.title ?? '', essay.dek ?? ''];
  for (const b of essay.body ?? []) {
    if (b.type === 'prose') out.push(b.md ?? '');
    else if (b.type === 'heading') out.push(b.text ?? '');
    else if (b.type === 'figure') out.push(b.caption ?? '');
  }
  return out;
}

/** Rebuild the overlay from the English structure + the translated strings. */
function reinject(essay, tr) {
  let i = 0;
  const title = tr[i++];
  const dek = tr[i++];
  const body = (essay.body ?? []).map((b) => {
    if (b.type === 'prose') return { ...b, md: tr[i++] };
    if (b.type === 'heading') return { ...b, text: tr[i++] };
    if (b.type === 'figure') return { ...b, caption: tr[i++] };
    return { ...b };
  });
  return { title, dek, body };
}

const SYSTEM = `You are a professional literary translator localising long-form space-science essays for a premium encyclopedia. Translate each English string into {LANG}, preserving:
- Markdown syntax exactly (**bold**, *italic*, [text](url), lists, line breaks) — translate only the human-readable text, never the URLs/targets.
- Numbers, units, and proper nouns (mission names, agencies, spacecraft) in their conventional native form.
- The register: literary, precise, evocative — this is editorial prose, not UI copy.
Return EXACTLY as many translations as inputs, in the SAME ORDER. Never merge, split, drop, or reorder.`;

/** Translate a small array in one call; returns the array or null on count mismatch. */
async function translateChunk(client, sys, locale, strings) {
  const r = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: sys,
    tools: [
      {
        name: 'submit_translations',
        description: 'Submit the translated strings, same count + order as the input.',
        input_schema: {
          type: 'object',
          properties: { translations: { type: 'array', items: { type: 'string' } } },
          required: ['translations'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'submit_translations' },
    messages: [
      {
        role: 'user',
        content: `Translate these ${strings.length} strings to ${NAMES[locale]}. Return exactly ${strings.length} translations in order.\n\n${JSON.stringify(strings, null, 2)}`,
      },
    ],
  });
  const use = r.content.find((c) => c.type === 'tool_use');
  const tr = use?.input?.translations;
  return Array.isArray(tr) && tr.length === strings.length ? tr : null;
}

/**
 * Translate a contiguous run of WHOLE paragraphs (blocks). Tries the run in one
 * call for maximum context; on a count mismatch it BISECTS into halves and
 * recurses — so most calls see the full essay (or a large span), and only a
 * stubborn region shrinks. The floor is ONE whole paragraph: a paragraph is
 * never split, and meaning that compounds across sentences stays intact.
 */
async function translateRun(client, sys, locale, strings) {
  for (let a = 0; a < 3; a++) {
    const res = await translateChunk(client, sys, locale, strings);
    if (res) return res;
  }
  if (strings.length === 1) {
    // One paragraph still mismatching after retries — one more try, else keep
    // the English paragraph rather than drop or fragment it.
    const res = await translateChunk(client, sys, locale, strings);
    return res ?? strings;
  }
  const mid = Math.ceil(strings.length / 2);
  const [left, right] = await Promise.all([
    translateRun(client, sys, locale, strings.slice(0, mid)),
    translateRun(client, sys, locale, strings.slice(mid)),
  ]);
  return [...left, ...right];
}

/** Translate an essay's paragraphs, whole-essay-first with bisection fallback. */
async function translateEssay(client, locale, strings) {
  const sys = SYSTEM.replace('{LANG}', NAMES[locale]);
  return translateRun(client, sys, locale, strings);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Missing ANTHROPIC_API_KEY (source .env first)');
    process.exit(1);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  let slugs = fs
    .readdirSync(EN)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .map((f) => f.replace('.json', ''));
  if (argOnly) slugs = slugs.filter((s) => s === argOnly);

  const jobs = [];
  for (const slug of slugs) {
    for (const loc of LOCALES) {
      const dst = path.join(ROOT, 'i18n-src', loc, 'essays', `${slug}.json`);
      if (fs.existsSync(dst)) {
        try {
          if (Object.keys(JSON.parse(fs.readFileSync(dst, 'utf8'))).length > 0) continue;
        } catch {
          /* re-fill */
        }
      }
      jobs.push({ slug, loc, dst });
    }
  }
  console.log(
    `Essays: ${slugs.length} · locales: ${LOCALES.length} · gaps to fill: ${jobs.length}`,
  );
  if (!jobs.length) return console.log('Nothing to do.');

  let ok = 0,
    fail = 0,
    cursor = 0;
  const CONCURRENCY = 6;
  async function worker() {
    while (cursor < jobs.length) {
      const j = jobs[cursor++];
      try {
        const essay = JSON.parse(fs.readFileSync(path.join(EN, `${j.slug}.json`), 'utf8'));
        const tr = await translateEssay(client, j.loc, extract(essay));
        fs.mkdirSync(path.dirname(j.dst), { recursive: true });
        fs.writeFileSync(j.dst, JSON.stringify(reinject(essay, tr), null, 2) + '\n');
        console.log(`  ${j.slug} → ${j.loc} ok (${++ok + fail}/${jobs.length})`);
      } catch (err) {
        fail++;
        console.error(`  ${j.slug} → ${j.loc} FAIL: ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`Done: ok=${ok} fail=${fail}`);
  if (fail) process.exit(1);
}

main();
