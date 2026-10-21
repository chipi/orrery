/**
 * Translate image alt texts (static/data/image-alt-text/en-US.json) into every locale
 * through the Message Batches API (half the price of live calls; results within hours).
 *
 * What gets translated: every key a locale is missing, plus every key whose English
 * changed since it was translated. `apply` records a short hash of the English each
 * translation came from in scripts/i18n-tools/maps/alt-text-sources.json; `plan` treats a
 * key as stale when the current English no longer matches it (or it has no record), so a
 * rewritten English alt never keeps its old translation. `--all` re-translates every key.
 * Keys no longer in en-US are dropped from the locale files on `apply`.
 *
 *   node scripts/translate-alt-text.mjs plan     [--locales=a,b] [--all]
 *   node scripts/translate-alt-text.mjs pilot    [--locales=a,b]   live, first chunk per locale
 *   node scripts/translate-alt-text.mjs submit                      one batch of every chunk
 *   node scripts/translate-alt-text.mjs status
 *   node scripts/translate-alt-text.mjs fetch                       results -> work dir
 *   node scripts/translate-alt-text.mjs check                       problems() over every result
 *   node scripts/translate-alt-text.mjs redo                        new batch: only the failures
 *   node scripts/translate-alt-text.mjs apply                       clean results -> locale files
 * Options: --model=<id> (default: translationModel(locale)), --chunk=50,
 *   --work=.cache/alt-text-translate. Needs ANTHROPIC_API_KEY (set -a; source .env; set +a).
 *
 * Every request carries the shared translation rules (systemAddendum: whole text, target
 * script only, NAME_POLICY, locale rules) and the native-terms glossary / origin-name
 * forms of the terms in that chunk. `check` runs the project's problems() over every
 * answer; `redo` resends the failures with the reasons; `apply` writes only clean ones.
 * First used 2026-10-21 (Haiku 5.5 for all 13 locales, ~44k alt texts).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import {
  systemAddendum,
  designations,
  knownNamesIn,
  problems,
  LANGUAGE_NAMES,
} from './lib/translate-quality.mjs';
import { translationModel, translationClient } from './lib/translate-model.mjs';
import { nativeName } from '../src/lib/name-origins.js';

const ALT = 'static/data/image-alt-text';
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
const opt = (k, d) =>
  process.argv
    .find((a) => a.startsWith(`--${k}=`))
    ?.split('=')
    .slice(1)
    .join('=') ?? d;
const mode = process.argv[2];
const WORK = opt('work', '.cache/alt-text-translate');
const CHUNK = Number(opt('chunk', 50));
const MODEL = opt('model', '');
const wanted = opt('locales', '') ? opt('locales').split(',') : LOCALES;
fs.mkdirSync(path.join(WORK, 'results'), { recursive: true });
const W = (f) => path.join(WORK, f);
const readJson = (p, d) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : d);
const en = readJson(`${ALT}/en-US.json`);
const SOURCES = 'scripts/i18n-tools/maps/alt-text-sources.json';
const hash = (t) => createHash('sha1').update(String(t)).digest('base64url').slice(0, 10);

function plan() {
  const all = process.argv.includes('--all');
  const src = readJson(SOURCES, {});
  const out = { locales: {} };
  for (const l of wanted) {
    const loc = readJson(`${ALT}/${l}.json`, {});
    out.locales[l] = Object.keys(en)
      .sort()
      .filter((k) => all || !(k in loc) || src[k] !== hash(en[k]));
    const orphans = Object.keys(loc).filter((k) => !(k in en)).length;
    console.log(
      `${l.padEnd(8)} to translate ${String(out.locales[l].length).padStart(5)} · orphans to drop ${orphans}`,
    );
  }
  fs.writeFileSync(W('plan.json'), JSON.stringify(out));
  console.log(`plan written to ${W('plan.json')}${all ? ' (--all)' : ''}`);
}

const GLOSS = Object.entries(
  JSON.parse(fs.readFileSync('scripts/i18n-tools/native-terms.json', 'utf8')),
)
  .filter(([k, v]) => !k.startsWith('_') && k !== 'sources' && v && typeof v === 'object')
  .flatMap(([, cls]) => Object.entries(cls));

function chunks() {
  const p = readJson(W('plan.json'));
  if (!p) throw new Error('run plan first');
  const out = [];
  for (const [l, keys] of Object.entries(p.locales))
    for (let i = 0; i * CHUNK < keys.length; i++)
      out.push({ id: `${l}__${i}`, locale: l, keys: keys.slice(i * CHUNK, (i + 1) * CHUNK) });
  return out;
}

/** Request params. `live`: for translationClient, which appends the shared rules itself
 *  (and retries on problems()); batch requests carry the rules here instead. */
function request(locale, keys, redo, live = false) {
  const items = keys.map((k, i) => ({ id: `i${i}`, en: en[k] }));
  const text = items.map((i) => i.en).join('\n');
  const hints = GLOSS.filter(([term, forms]) => forms[locale] && text.includes(term)).map(
    ([t, f]) => [t, f[locale]],
  );
  // Built things and agencies stay in Latin exactly as written, except in their origin
  // locale. Listed per chunk: a rule alone left New Horizons / Hubble / Euclid in
  // katakana, Arabic and Devanagari in ~40% of a Haiku 5.5 pilot (2026-10-21).
  const keep = [];
  for (const n of new Set([...designations(text), ...knownNamesIn(text)])) {
    const nat = nativeName(locale, n);
    if (nat && nat !== n) hints.push([n, nat]);
    else if (!hints.some(([t]) => t === n)) keep.push(n);
  }
  const language = LANGUAGE_NAMES[locale] ?? locale;
  const system = [
    `You translate image alt texts (short descriptions of pictures, read by screen readers) on Orrery, a space-exploration education site, from English into ${language}.`,
    'Write natural, plain descriptive sentences as a native writer would. Translate everything; never add or drop information. Keep numbers, dates, catalogue numbers and designations (STS-41, AS11-40-5875, PIA23645) exactly.',
    hints.length
      ? `REQUIRED forms for these terms in ${language} (inflect as the grammar needs):\n` +
        hints.map(([t, f]) => `- ${t} → ${f}`).join('\n')
      : '',
    keep.length
      ? `KEEP these names EXACTLY as written, in Latin letters — never transliterate or translate them, never add case endings to them (put a common noun before a name that needs a case): ${keep.join(', ')}`
      : '',
    live ? '' : systemAddendum(locale),
    'Answer ONLY by calling the submit tool, one translation per id, every id.',
  ]
    .filter(Boolean)
    .join('\n\n');
  const user = redo
    ? `These earlier translations were rejected. Translate them again, fixing the problems listed:\n${JSON.stringify(
        items.map((it, i) => ({ ...it, rejected: redo[i].out, problems: redo[i].problems })),
      )}`
    : JSON.stringify(items);
  return {
    model: MODEL || translationModel(locale),
    max_tokens: 16000,
    thinking: { type: 'disabled' },
    system: live ? system : [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    tools: [
      {
        name: 'submit',
        description: 'Submit the translations',
        input_schema: {
          type: 'object',
          properties: {
            translations: {
              type: 'array',
              items: {
                type: 'object',
                properties: { id: { type: 'string' }, text: { type: 'string' } },
                required: ['id', 'text'],
              },
            },
          },
          required: ['translations'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'submit' },
    messages: [{ role: 'user', content: user }],
  };
}

/** Map a model answer back to alt-text keys. */
function toKeys(msg, keys) {
  const t = msg.content.find((c) => c.type === 'tool_use');
  const out = {};
  for (const x of t?.input?.translations ?? []) {
    const k = keys[Number(String(x.id).replace(/^i/, ''))];
    if (k && typeof x.text === 'string') out[k] = x.text;
  }
  return out;
}
function saveResults(locale, map) {
  const p = W(`results/${locale}.json`);
  fs.writeFileSync(p, JSON.stringify({ ...readJson(p, {}), ...map }, null, 1));
}
const client = () => {
  if (!process.env.ANTHROPIC_API_KEY)
    throw new Error('Missing ANTHROPIC_API_KEY (set -a; source .env; set +a)');
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
};
const usageLine = (u) =>
  `in ${u.input} · cache read ${u.cacheRead} · cache write ${u.cacheWrite} · out ${u.output}`;

async function submit(reqs) {
  const mb = await client().messages.batches.create({
    requests: reqs.map(({ custom_id, params }) => ({ custom_id, params })),
  });
  fs.writeFileSync(W('batch-id.txt'), mb.id + '\n');
  fs.writeFileSync(
    W(`requests-${mb.id}.json`),
    JSON.stringify(reqs.map((r) => [r.custom_id, r.keys])),
  );
  console.log(`submitted ${reqs.length} requests as ${mb.id} (${mb.processing_status})`);
}

function check() {
  const p = readJson(W('plan.json'));
  const fails = {};
  let total = 0;
  let bad = 0;
  const reasons = {};
  for (const [l, keys] of Object.entries(p.locales)) {
    const res = readJson(W(`results/${l}.json`), {});
    let lb = 0;
    for (const k of keys) {
      total++;
      const t = res[k];
      const pr = typeof t === 'string' && t.trim() ? problems(l, en[k], t) : ['missing'];
      if (pr.length) {
        bad++;
        lb++;
        (fails[l] ??= []).push({ key: k, out: t ?? null, problems: pr });
        for (const x of pr) {
          const r = x.split(':')[0];
          reasons[r] = (reasons[r] ?? 0) + 1;
        }
      }
    }
    console.log(`${l.padEnd(8)} ${keys.length - lb}/${keys.length} clean`);
  }
  fs.writeFileSync(W('fails.json'), JSON.stringify(fails, null, 1));
  console.log(
    `TOTAL ${total - bad}/${total} clean (${((100 * (total - bad)) / total).toFixed(1)}%)`,
  );
  console.log('failing reasons:', JSON.stringify(reasons));
}

if (mode === 'plan') plan();
else if (mode === 'pilot') {
  const u = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 };
  const live = translationClient(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));
  for (const c of chunks().filter((c) => c.id.endsWith('__0') && wanted.includes(c.locale))) {
    const r = await live.messages.create({
      ...request(c.locale, c.keys, null, true),
      _locale: c.locale,
    });
    saveResults(c.locale, toKeys(r, c.keys));
    u.input += r.usage.input_tokens;
    u.output += r.usage.output_tokens;
    u.cacheRead += r.usage.cache_read_input_tokens ?? 0;
    u.cacheWrite += r.usage.cache_creation_input_tokens ?? 0;
    console.log(
      `${c.locale}: ${Object.keys(toKeys(r, c.keys)).length}/${c.keys.length} · ${r.stop_reason}`,
    );
  }
  console.log('pilot usage:', usageLine(u));
} else if (mode === 'submit')
  await submit(
    chunks().map((c) => ({ custom_id: c.id, keys: c.keys, params: request(c.locale, c.keys) })),
  );
else if (mode === 'redo') {
  const fails = readJson(W('fails.json'), {});
  const reqs = [];
  for (const [l, list] of Object.entries(fails))
    for (let i = 0; i * CHUNK < list.length; i++) {
      const part = list.slice(i * CHUNK, (i + 1) * CHUNK);
      const keys = part.map((f) => f.key);
      reqs.push({ custom_id: `${l}__redo${i}`, keys, params: request(l, keys, part) });
    }
  if (!reqs.length) console.log('nothing to redo');
  else await submit(reqs);
} else if (mode === 'status') {
  const id = fs.readFileSync(W('batch-id.txt'), 'utf8').trim();
  const mb = await client().messages.batches.retrieve(id);
  console.log(id, mb.processing_status, JSON.stringify(mb.request_counts));
} else if (mode === 'fetch') {
  const id = fs.readFileSync(W('batch-id.txt'), 'utf8').trim();
  const keysOf = new Map(readJson(W(`requests-${id}.json`)));
  const u = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 };
  const errored = [];
  for await (const res of await client().messages.batches.results(id)) {
    if (res.result.type !== 'succeeded') {
      errored.push(`${res.custom_id}: ${res.result.type}`);
      continue;
    }
    const m = res.result.message;
    u.input += m.usage.input_tokens;
    u.output += m.usage.output_tokens;
    u.cacheRead += m.usage.cache_read_input_tokens ?? 0;
    u.cacheWrite += m.usage.cache_creation_input_tokens ?? 0;
    saveResults(res.custom_id.split('__')[0], toKeys(m, keysOf.get(res.custom_id)));
  }
  console.log(`fetched ${id}: ${usageLine(u)}; errored ${errored.length}`, errored.slice(0, 5));
} else if (mode === 'check') check();
else if (mode === 'apply') {
  const p = readJson(W('plan.json'));
  const fails = readJson(W('fails.json'), {});
  const okIn = {};
  for (const l of Object.keys(p.locales)) {
    const bad = new Set((fails[l] ?? []).map((f) => f.key));
    const res = readJson(W(`results/${l}.json`), {});
    const loc = readJson(`${ALT}/${l}.json`, {});
    let set = 0;
    let dropped = 0;
    let staleRemoved = 0;
    for (const k of p.locales[l]) {
      if (res[k] && !bad.has(k)) {
        loc[k] = res[k];
        set++;
        okIn[k] = (okIn[k] ?? 0) + 1;
      } else if (k in loc) {
        // English changed and no clean translation yet: fall back to the English.
        delete loc[k];
        staleRemoved++;
      }
    }
    for (const k of Object.keys(loc)) {
      if (k in en) continue;
      delete loc[k];
      dropped++;
    }
    const sorted = Object.fromEntries(
      Object.keys(loc)
        .sort()
        .map((k) => [k, loc[k]]),
    );
    fs.writeFileSync(`${ALT}/${l}.json`, JSON.stringify(sorted, null, 2) + '\n');
    console.log(
      `${l.padEnd(8)} written ${set} · stale without a clean translation removed ${staleRemoved} · orphans dropped ${dropped} · total ${Object.keys(sorted).length}`,
    );
  }
  // Record the English source only for keys written in every planned locale; a key
  // that failed somewhere stays stale and is planned again next time.
  const n = Object.keys(p.locales).length;
  const src = readJson(SOURCES, {});
  for (const [k, c] of Object.entries(okIn)) if (c === n) src[k] = hash(en[k]);
  for (const k of Object.keys(src)) if (!(k in en)) delete src[k];
  fs.writeFileSync(
    SOURCES,
    JSON.stringify(
      Object.fromEntries(
        Object.keys(src)
          .sort()
          .map((k) => [k, src[k]]),
      ),
      null,
      0,
    ) + '\n',
  );
  console.log(
    `sources recorded for ${Object.values(okIn).filter((c) => c === n).length} keys in ${SOURCES}`,
  );
} else console.log('modes: plan | pilot | submit | status | fetch | check | redo | apply');
