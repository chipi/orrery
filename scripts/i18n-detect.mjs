/**
 * Translation defect detectors over every locale overlay (i18n-src/<loc>/**) and UI
 * bundle (messages/<loc>.json), compared with en-US at the same path. Built for the
 * 2026-10-17 translation audit (docs/wip/2026-10-17-post-v1-arc-plan.md, item 9b);
 * each kind is a defect found shipped.
 *
 *   node scripts/i18n-detect.mjs                      # table per locale
 *   node scripts/i18n-detect.mjs --out=hits.json      # + every hit, for i18n-manifest --from-hits
 *   node scripts/i18n-detect.mjs --locales=sr-Cyrl,ru
 *   node scripts/i18n-detect.mjs --gate=placeholder,russianInSr,mixedWord   # exit 1 on any
 *
 * Kinds: untranslated (identical to the English), englishProse (English left in the
 * prose, names from the source excluded), foreignScript (another language's script,
 * e.g. CJK in hi/ko), mixedWord (Latin letters inside a Cyrillic word), russianInSr,
 * placeholder (__ACR0__ tokens), phoneticEnglish (English spelled in Cyrillic),
 * latinSerbian (a Latin-script Serbian string in sr-Cyrl), truncated (much shorter
 * than the locale's usual length ratio to the English), corrupted (U+FFFD: bytes lost).
 * Detectors are evidence, not a verdict: a sample still needs a reviewer.
 */
import fs from 'node:fs';
import path from 'node:path';
import { SKIP_KEY } from './i18n-manifest.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
export const LOCALES = [
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
export const KINDS = [
  'untranslated',
  'englishProse',
  'foreignScript',
  'mixedWord',
  'russianInSr',
  'placeholder',
  'phoneticEnglish',
  'latinSerbian',
  'truncated',
  'corrupted',
];
const NATIVE = {
  ar: /\p{Script=Arabic}/u,
  hi: /\p{Script=Devanagari}/u,
  ja: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u,
  ko: /\p{Script=Hangul}/u,
  'zh-CN': /\p{Script=Han}/u,
  ru: /\p{Script=Cyrillic}/u,
  'sr-Cyrl': /\p{Script=Cyrillic}/u,
};
const FOREIGN =
  /[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Arabic}\p{Script=Devanagari}\p{Script=Cyrillic}]/gu;
const EN_WORDS = /\b(the|and|with|which|that|this|from|into|between|their|were|have|The)\b/g; // case-sensitive: "β-And" is Andromedae
const NAME_SPAN =
  /(?:\bthe\s+)?[A-Z][\w'’-]*(?:\s+(?:of|the|and|de)\s+[A-Z][\w'’-]*|\s+[A-Z0-9][\w'’-]*)+/g;

function walk(dir, out = []) {
  for (const n of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (n.endsWith('.json')) out.push(p);
  }
  return out;
}
function strings(v, at, out) {
  if (typeof v === 'string') out.push([at, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${at}.${i}`, out));
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) strings(x, at ? `${at}.${k}` : k, out);
  return out;
}
const get = (o, at) => at.split('.').reduce((a, k) => (a == null ? a : a[k]), o);

/** All (file, path, translation, english) pairs for a locale. */
function pairsFor(loc) {
  const pairs = [];
  const base = path.join(ROOT, 'i18n-src', loc);
  if (fs.existsSync(base))
    for (const f of walk(base)) {
      const rel = path.relative(base, f).replace(/\.json$/, '');
      let j;
      let en = null;
      try {
        j = JSON.parse(fs.readFileSync(f, 'utf8'));
      } catch {
        continue;
      }
      try {
        en = JSON.parse(
          fs.readFileSync(path.join(ROOT, 'i18n-src', 'en-US', `${rel}.json`), 'utf8'),
        );
      } catch {
        /* no en-US twin */
      }
      for (const [at, s] of strings(j, '', []))
        if (!SKIP_KEY.test(at)) pairs.push([rel, at, s, en ? get(en, at) : undefined]);
    }
  const mp = path.join(ROOT, 'messages', `${loc}.json`);
  if (fs.existsSync(mp)) {
    const m = JSON.parse(fs.readFileSync(mp, 'utf8'));
    const me = JSON.parse(fs.readFileSync(path.join(ROOT, 'messages', 'en-US.json'), 'utf8'));
    for (const [k, s] of Object.entries(m))
      if (typeof s === 'string') pairs.push(['messages', k, s, me[k]]);
  }
  return pairs;
}

export function detect(loc) {
  const counts = Object.fromEntries(KINDS.map((k) => [k, 0]));
  const hits = Object.fromEntries(KINDS.map((k) => [k, []]));
  const add = (k, f, at, s) => {
    counts[k]++;
    hits[k].push(`${f} :: ${at} :: ${s.slice(0, 160)}`);
  };
  let n = 0;
  const ratios = [];
  for (const [f, at, s, e] of pairsFor(loc)) {
    if (s.length < 25) continue;
    n++;
    const src = typeof e === 'string' ? e : '';
    if (src && s === src && /[a-z]{4} [a-z]{3}/.test(s)) add('untranslated', f, at, s);
    else {
      let prose = s.replace(/\[[^\]]*\]\([^)]*\)/g, '');
      for (const span of src.match(NAME_SPAN) || []) prose = prose.split(span).join('');
      if ((prose.match(EN_WORDS) || []).length >= 3) add('englishProse', f, at, s);
    }
    const foreign = (s.match(FOREIGN) || []).filter(
      (ch) => !(NATIVE[loc] && NATIVE[loc].test(ch)) && !src.includes(ch),
    );
    if (foreign.length >= 2 && !(loc === 'ja' && foreign.every((ch) => /\p{Script=Han}/u.test(ch))))
      add('foreignScript', f, at, s);
    if ((loc === 'ru' || loc === 'sr-Cyrl') && /[а-яёђјљњћџ][a-z]|[a-z][а-яёђјљњћџ]/i.test(s))
      add('mixedWord', f, at, s);
    if (loc === 'sr-Cyrl' && /[яюёйщыэъь]/i.test(s)) add('russianInSr', f, at, s);
    if (/__[A-ZА-Я]{2,}\d+__/.test(s)) add('placeholder', f, at, s);
    if (/\uFFFD/.test(s)) add('corrupted', f, at, s); // replacement character: bytes lost in an edit
    if (
      (loc === 'ru' || loc === 'sr-Cyrl') &&
      /(^|[\s(])(тхе|витх|анд|оф|фор|ин тхе|лаунцх|уппер|стаге)(?=[\s,.)]|$)/.test(s) // lowercase only: "Анд" is the Andes
    )
      add('phoneticEnglish', f, at, s);
    if (
      loc === 'sr-Cyrl' &&
      /[čćšžđ]/i.test(s) &&
      (s.match(/[a-zčćšžđ]/gi) || []).length > 0.6 * (s.match(/\p{L}/gu) || []).length
    )
      add('latinSerbian', f, at, s);
    if (src.length > 150 && s !== src) ratios.push([s.length / src.length, f, at, s]);
  }
  const sorted = ratios.map((r) => r[0]).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 1;
  for (const [r, f, at, s] of ratios)
    if (r < 0.55 * median) add('truncated', f, at, `${(r / median).toFixed(2)}×median :: ${s}`);
  return { loc, strings: n, counts, hits, median };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, ...v] = a.replace(/^--/, '').split('=');
      return [k, v.join('=') || true];
    }),
  );
  const locs = args.locales ? String(args.locales).split(',') : LOCALES;
  const results = locs.map(detect);
  console.log(
    'loc      strings ' + KINDS.map((k) => k.slice(0, 8).padStart(9)).join('') + '  defect%',
  );
  for (const r of results) {
    const d = KINDS.reduce((a, k) => a + r.counts[k], 0);
    console.log(
      `${r.loc.padEnd(8)} ${String(r.strings).padStart(7)} ${KINDS.map((k) => String(r.counts[k]).padStart(9)).join('')}  ${((100 * d) / Math.max(1, r.strings)).toFixed(1).padStart(6)}`,
    );
  }
  if (args.out) {
    fs.writeFileSync(
      String(args.out),
      JSON.stringify(Object.fromEntries(results.map((r) => [r.loc, r.hits])), null, 1),
    );
    console.log(`hits → ${args.out}`);
  }
  if (args.gate) {
    const kinds = String(args.gate).split(',');
    const bad = results.flatMap((r) =>
      kinds.flatMap((k) => r.hits[k].map((h) => `${r.loc} ${k}: ${h}`)),
    );
    if (bad.length) {
      console.log(`GATE FAIL — ${bad.length} hit(s) of ${kinds.join(', ')}:`);
      for (const b of bad.slice(0, 40)) console.log(`  ✗ ${b}`);
      process.exitCode = 1;
    } else console.log(`GATE PASS — no ${kinds.join(', ')}`);
  }
}
