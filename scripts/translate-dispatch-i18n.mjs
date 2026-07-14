/**
 * Dispatch + new-mission i18n translator (the /programs follow-ups).
 *
 * The universal gap-filler (translate-i18n-gaps.mjs) does not know about the
 * `dispatch` field (added by the /programs work), and it skips files that
 * already exist in a locale — so it covers neither (a) the new mission overlays
 * that carry a dispatch, nor (b) the dispatch added to already-translated
 * mission/fleet overlays. This handles both, scoped strictly to en-US overlays
 * that actually HAVE a dispatch field, so it never triggers a whole-repo
 * gap-fill of unrelated surfaces.
 *
 * Per (en-US file with dispatch) × locale:
 *   - locale file missing         → full-translate every string field (incl dispatch)
 *   - locale file lacks dispatch  → translate ONLY the dispatch, merge it in (keeps the existing translation)
 *   - locale file already has it  → skip
 *
 * Re-runs are safe. Run: set -a; source .env; set +a; node scripts/translate-dispatch-i18n.mjs [--locales=de,fr]
 */
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(import.meta.dirname, '..');
const EN = path.join(ROOT, 'i18n-src', 'en-US');
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
const argLoc = (process.argv.find((a) => a.startsWith('--locales=')) || '').split('=')[1];
const LOCALES = argLoc ? argLoc.split(',') : ALL_LOCALES;

const SYSTEM = `Translate Orrery editorial content from en-US into the target language.

The "dispatch" is an editorial paragraph in a "modern Wired field historian" register — rigorous, precise, plain, never breathless. Other fields (name, tagline, type, first, description, event labels/notes, best_known_for) are short factual overlay strings. Match the register; translate meaning, not word-for-word.

CRITICAL CONSTRAINTS:
- Keep proper nouns verbatim (spacecraft, rocket, mission, station, agency, person, place names). Translate a name only where the target language has a genuinely standard native form.
- Preserve numbers, units, dates, Unicode symbols (km, °, ≈, ×, %, em-dash —) exactly.
- Keep universal space acronyms untranslated: ISS, JWST, EVA, ATV, DOS, N1, LK, STS, ESM, LEO, GEO.
- "type" (top-level) is a short status/kind label like "CREWED · FLOWN": translate the words, keep · separators and ALL-CAPS status convention.
- Return an array of the SAME length + order as the source array; do not merge, split, drop, add, or reorder.`;

async function translateOne(client, locale, str) {
  const r = await client.messages.create({
    model: 'claude-haiku-4-5',
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
async function translateArraySafe(client, locale, strings) {
  let tr = await translateStrings(client, locale, strings);
  if (tr.length === strings.length) return tr;
  const out = [];
  for (const s of strings) out.push(await translateOne(client, locale, s));
  return out;
}

// Ordered translatable-string extraction per surface. Returns {strings, slots}.
function extract(surface, o) {
  const strings = [],
    slots = [];
  const push = (v, slot) => {
    if (typeof v === 'string' && v.length) {
      strings.push(v);
      slots.push(slot);
    }
  };
  if (surface === 'missions') {
    push(o.name, { k: 'name' });
    push(o.type, { k: 'type' });
    push(o.first, { k: 'first' });
    push(o.dispatch, { k: 'dispatch' });
    push(o.description, { k: 'description' });
    (o.events || []).forEach((e, i) => {
      push(e.label, { k: 'ev-label', i });
      push(e.note, { k: 'ev-note', i });
    });
  } else {
    // fleet
    push(o.name, { k: 'name' });
    push(o.tagline, { k: 'tagline' });
    push(o.dispatch, { k: 'dispatch' });
    push(o.description, { k: 'description' });
    push(o.best_known_for, { k: 'best_known_for' });
  }
  return { strings, slots };
}

function apply(target, slots, translated) {
  slots.forEach((s, idx) => {
    const t = translated[idx];
    if (s.k === 'ev-label') target.events[s.i].label = t;
    else if (s.k === 'ev-note') target.events[s.i].note = t;
    else target[s.k] = t;
  });
}

async function translateStrings(client, locale, strings) {
  const r = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    system: SYSTEM,
    tools: [
      {
        name: 'submit_translation',
        description: 'Submit translated strings, same length + order as source.',
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
        content: `Translate each string into ${NAMES[locale]} (${locale}). Return exactly ${strings.length} strings via submit_translation, same order.\n\n${JSON.stringify(strings, null, 2)}`,
      },
    ],
  });
  const b = r.content.find((x) => x.type === 'tool_use');
  if (!b) throw new Error('no tool_use');
  return b.input.translations;
}

// insert dispatch into an existing locale object, right after tagline (fleet) or name (mission)
function insertDispatch(obj, dispatch, surface) {
  const anchor = surface === 'fleet' && 'tagline' in obj ? 'tagline' : 'name';
  const out = {};
  for (const k of Object.keys(obj)) {
    out[k] = obj[k];
    if (k === anchor) out.dispatch = dispatch;
  }
  if (!('dispatch' in out)) out.dispatch = dispatch;
  return out;
}

function* walk(surface) {
  const base = path.join(EN, surface);
  if (!fs.existsSync(base)) return;
  const stack = [base];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(abs);
      else if (e.name.endsWith('.json')) yield { abs, rel: path.relative(EN, abs) };
    }
  }
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
  // build gap list (mode: 'full' | 'merge'), skipping done + non-dispatch files
  const gaps = [];
  let skip = 0;
  for (const surface of ['missions', 'fleet']) {
    for (const { abs, rel } of walk(surface)) {
      const en = JSON.parse(fs.readFileSync(abs, 'utf8'));
      if (typeof en.dispatch !== 'string' || !en.dispatch.length) continue;
      for (const loc of LOCALES) {
        const dst = path.join(ROOT, 'i18n-src', loc, rel);
        if (fs.existsSync(dst) && fs.statSync(dst).size > 2) {
          const cur = JSON.parse(fs.readFileSync(dst, 'utf8'));
          if (typeof cur.dispatch === 'string' && cur.dispatch.length) {
            skip++;
            continue;
          }
          gaps.push({ surface, rel, en, loc, dst, mode: 'merge' });
        } else {
          gaps.push({ surface, rel, en, loc, dst, mode: 'full' });
        }
      }
    }
  }
  console.log(`dispatch: ${gaps.length} gaps (${skip} done), concurrency ${CONCURRENCY}`);
  let full = 0,
    merge = 0,
    fail = 0;
  await runPool(gaps, async (g) => {
    try {
      if (g.mode === 'merge') {
        const cur = JSON.parse(fs.readFileSync(g.dst, 'utf8'));
        const [d] = await translateArraySafe(client, g.loc, [g.en.dispatch]);
        fs.writeFileSync(
          g.dst,
          JSON.stringify(insertDispatch(cur, d, g.surface), null, 2) + '\n',
          'utf8',
        );
        merge++;
      } else {
        const { strings, slots } = extract(g.surface, g.en);
        const tr = await translateArraySafe(client, g.loc, strings);
        if (tr.length !== strings.length) throw new Error(`length ${tr.length}!=${strings.length}`);
        const out = JSON.parse(JSON.stringify(g.en));
        apply(out, slots, tr);
        fs.mkdirSync(path.dirname(g.dst), { recursive: true });
        fs.writeFileSync(g.dst, JSON.stringify(out, null, 2) + '\n', 'utf8');
        full++;
      }
      if ((full + merge) % 25 === 0) console.log(`  … ${full + merge}/${gaps.length}`);
    } catch (e) {
      fail++;
      console.error(`✗ ${g.rel} → ${g.loc}: ${e.message}`);
    }
  });
  console.log(`\ndispatch i18n: ${full} full, ${merge} merged, ${skip} skipped, ${fail} failed`);
  if (fail) process.exitCode = 1;
}
main();
