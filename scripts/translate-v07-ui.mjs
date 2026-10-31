/**
 * UI-string i18n translator (un-archived #354 follow-up).
 *
 * Translates message-bundle keys into the 13 non-en-US locales via the
 * Claude API into messages/<loc>.json. Each answer must pass problems() with
 * the UI-label checks; a key that fails is reported and left as it was.
 * messages/<loc>.json is the only copy of the translations.
 * Two modes:
 *
 *   --keys=k1,k2,...   translate this explicit key set
 *   --auto             translate every key whose value is still identical
 *                      to en-US (untranslated), per locale, skipping
 *                      acronyms / templates / symbol-only values
 *   --locales=all      (default) or a comma list, e.g. --locales=ar,hi
 *
 * Batches 20 keys per API call. Run:
 *   set -a; source .env; set +a; node scripts/translate-v07-ui.mjs --keys=foo,bar
 *   set -a; source .env; set +a; node scripts/translate-v07-ui.mjs --auto --locales=ar
 */
import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { translationClient, translationModel } from './lib/translate-model.mjs';
import { TRANSLATED_LOCALES } from './lib/locales.mjs';
import { LANGUAGE_NAMES, problems, uiPromptNotes } from './lib/translate-quality.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const MESSAGES_DIR = path.join(ROOT, 'messages');
const en = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, 'en-US.json'), 'utf8'));

const ALL = TRANSLATED_LOCALES;
const NAMES = LANGUAGE_NAMES;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const locales = !args.locales || args.locales === 'all' ? ALL : String(args.locales).split(',');
const explicitKeys = args.keys ? String(args.keys).split(',') : null;
const fixPlaceholders = !!args['fix-placeholders']; // re-translate keys whose {placeholders} got dropped
// Model tier: Haiku, ALWAYS — AGENTS.md §"i18n rules" cost policy (operator,
// 2026-09-09). Hardcoded on purpose: no --model flag, no env override.

const phset = (s) => new Set(String(s).match(/\{[^}]+\}/g) || []);
const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

// Values we never machine-translate: too-short, aerospace acronyms, and
// template/symbol-only strings (the LLM would mangle them). Short ALL-CAPS words
// are labels, not acronyms: skipping every /^[A-Z]{2,7}$/ value left STATUS,
// AGENCY, PERIOD, ARRIVAL in English, later spelled phonetically (ja スタタス,
// ペリド, アーリバル — 2026-10-30 audit). Only codes with a digit and the
// acronyms below stay as they are.
const ACRONYMS = new Set(
  'TLI TMI LOI TEI EDL OI TCM C3 ISS JWST MET ETA MECO SECO EVA LEO MEO GEO HEO GTO SSO NRHO DLA RTT AU UTC HST'.split(
    ' ',
  ),
);
function trivial(v) {
  const s = String(v).trim();
  if (s.length <= 2) return true;
  if (ACRONYMS.has(s) || (/^[A-Z0-9/.-]{2,7}$/.test(s) && /\d/.test(s))) return true;
  if (s.includes('{') && !/[a-z]{4}/.test(s)) return true;
  if (!/[a-zA-Z]/.test(s)) return true;
  return false;
}

const SYSTEM = `Translate Orrery UI strings (a space-exploration web app) into the target language.
CRITICAL:
- Preserve {variable} placeholders verbatim.
- Preserve trailing symbols/arrows (→, …, ·) exactly.
- Keep standard aerospace acronyms as-is (TLI, LOI, TEI, EDL, OI, TCM, C3, ISS, JWST).
- Keep spacecraft / mission / agency proper names as-is; use the target language's STANDARD name for planets and minor bodies (e.g. Venus, Vesta, Ceres) where one exists, else keep the Latin name.
- Short UI strings: tight, idiomatic, standard spaceflight vocabulary.
- Output ONE JSON object mapping each input key to its translation. No markdown fences, no prose.`;

async function tx(client, locale, payload) {
  const r = await client.messages.create({
    model: translationModel(locale),
    _locale: locale,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `${uiPromptNotes(Object.keys(payload))}\n\nTranslate into ${NAMES[locale]}:\n\n${JSON.stringify(payload, null, 2)}`,
      },
    ],
  });
  const text = r.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  return JSON.parse(
    text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim(),
  );
}

const chunk = (arr, n) => {
  const o = [];
  for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n));
  return o;
};

const client = translationClient(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));

for (const loc of locales) {
  const mpath = path.join(MESSAGES_DIR, `${loc}.json`);
  const messages = JSON.parse(fs.readFileSync(mpath, 'utf8'));
  const keys = explicitKeys
    ? explicitKeys.filter((k) => k in en)
    : fixPlaceholders
      ? Object.keys(en).filter(
          (k) =>
            !k.startsWith('$') &&
            typeof en[k] === 'string' &&
            phset(en[k]).size > 0 &&
            typeof messages[k] === 'string' &&
            !sameSet(phset(en[k]), phset(messages[k])),
        )
      : Object.keys(en).filter(
          (k) =>
            !k.startsWith('$') &&
            typeof en[k] === 'string' &&
            !trivial(en[k]) &&
            typeof messages[k] === 'string' &&
            messages[k].trim() === en[k].trim(),
        );
  if (keys.length === 0) {
    console.log(`${loc}: nothing to do`);
    continue;
  }
  process.stdout.write(`${loc}: ${keys.length} keys `);
  let done = 0;
  const refused = [];
  for (const batch of chunk(keys, 20)) {
    const payload = {};
    for (const k of batch) payload[k] = en[k];
    try {
      const tr = await tx(client, loc, payload);
      for (const k of batch)
        if (typeof tr[k] === 'string' && tr[k].trim()) {
          const why = problems(loc, en[k], tr[k], { ui: true });
          if (why.length) {
            refused.push(`${k}: ${why.join('; ').slice(0, 140)}`);
            continue;
          }
          messages[k] = tr[k];
          done++;
        }
      process.stdout.write('.');
    } catch (err) {
      process.stdout.write(`!(${err.message.slice(0, 40)})`);
    }
  }
  fs.writeFileSync(mpath, JSON.stringify(messages, null, 2) + '\n', 'utf8');
  console.log(` → ${done} written, ${refused.length} refused`);
  for (const r of refused) console.log(`  refused ${r}`);
}
console.log('Done');
