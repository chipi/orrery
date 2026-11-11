/**
 * Translations whose length is implausible against the English: far shorter (a dropped clause, a
 * cut sentence) or far longer (English left in and the translation appended, a runaway answer).
 * Read-only; a finder, not a verdict.
 *
 *   node scripts/i18n-tools/length-ratio.mjs [locales] [--list] [--gate]
 *                                            [--accept=<locale|file|field> --why="<reason>"]
 *                                            [--derive [--q=0.001]]
 *
 * The bounds live in length-ratio-bounds.json: per locale and field kind, [lo, hi] for
 * translated length / English length. Kinds: short (English 40-119 characters), long (120+) and
 * ui (a messages/<loc>.json string of 30+); anything shorter is not judged — a label's length
 * varies too much between languages. A string identical to the English is not judged either
 * (scripts/i18n-coverage-scan.mjs gates those). problems() applies the same check to every new
 * translation (problems(…, { length: true }): apply-edits.mjs and retranslate-fields.mjs).
 *
 * --derive rewrites the bounds from today's corpus: the q and 1-q quantile of each locale and
 * kind (default q = 0.001), widened to two decimals. Derive once, read what falls outside, fix it
 * (apply-edits.mjs) and keep the bounds; deriving again after every fix would tighten them for ever.
 *
 * length-ratio-reviewed.json holds the flagged fields a person read and left (a CJK sentence that
 * really is that short, a list item that is a bare name), keyed locale|file|field — file "messages"
 * is messages/<loc>.json — with a hash of the English and of the translation, so an edit to either
 * brings the field back. --gate subtracts them, exits 1 on a field left or an exception that
 * matches nothing. --accept records one.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { textHash } from './term-match.mjs';
import { isMain } from './garble-lib.mjs';
import { BOUNDS_FILE, lengthKind, loadBounds } from '../lib/translate-quality.mjs';

const ALL_LOCS = [
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
const SRC = 'i18n-src/en-US';
const REVIEWED_FILE = 'scripts/i18n-tools/length-ratio-reviewed.json';

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${d}/${e.name}`) : e.name.endsWith('.json') ? [`${d}/${e.name}`] : [],
  );
const pairs = (e, t, at, out) => {
  if (typeof e === 'string' && typeof t === 'string') out.push([at, e, t]);
  else if (e && t && typeof e === 'object')
    for (const k of Object.keys(e)) if (k in t) pairs(e[k], t[k], at ? `${at}.${k}` : k, out);
  return out;
};

export const reviewKey = (loc, rel, at) => `${loc}|${rel}|${at}`;
export const loadReviewed = (file = REVIEWED_FILE) =>
  existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};

/** Every judged field of one locale: [{ rel, at, kind, ratio, en, tr }]. */
export function fieldsOf(loc) {
  const rows = [];
  const add = (rel, at, en, tr, ui) => {
    const kind = lengthKind(en, { ui });
    if (kind && tr !== en) rows.push({ rel, at, kind, ratio: tr.length / en.length, en, tr });
  };
  for (const f of walk(SRC)) {
    const tf = f.replace('/en-US', `/${loc}`);
    if (!existsSync(tf)) continue;
    const rel = f.slice(SRC.length + 1);
    for (const [at, en, tr] of pairs(
      JSON.parse(readFileSync(f, 'utf8')),
      JSON.parse(readFileSync(tf, 'utf8')),
      '',
      [],
    ))
      add(rel, at, en, tr, false);
  }
  const en = JSON.parse(readFileSync('messages/en-US.json', 'utf8'));
  const tr = existsSync(`messages/${loc}.json`)
    ? JSON.parse(readFileSync(`messages/${loc}.json`, 'utf8'))
    : {};
  for (const [k, v] of Object.entries(en))
    if (!k.startsWith('$') && typeof v === 'string' && typeof tr[k] === 'string')
      add('messages', k, v, tr[k], true);
  return rows;
}

const quantile = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];

export function derive(q = 0.001) {
  const out = {};
  for (const loc of ALL_LOCS) {
    const byKind = {};
    for (const r of fieldsOf(loc)) (byKind[r.kind] ??= []).push(r.ratio);
    out[loc] = {};
    for (const [kind, a] of Object.entries(byKind)) {
      a.sort((x, y) => x - y);
      out[loc][kind] = [
        Math.floor(quantile(a, q) * 100) / 100,
        Math.ceil(quantile(a, 1 - q) * 100) / 100,
      ];
    }
  }
  return out;
}

/** Flagged fields of one locale against the bounds: [{ ...field, lo, hi }]. */
export function scan(loc, bounds = loadBounds()) {
  const flagged = [];
  for (const r of fieldsOf(loc)) {
    const [lo, hi] = bounds[loc]?.[r.kind] ?? [0, Infinity];
    if (r.ratio < lo || r.ratio > hi) flagged.push({ ...r, lo, hi });
  }
  return flagged;
}

function accept(key, why) {
  const [loc, rel, at] = key.split('|');
  const f = fieldsOf(loc).find((r) => r.rel === rel && r.at === at);
  if (!f || !why) throw new Error(`cannot accept ${key}`);
  const all = loadReviewed();
  all[reviewKey(loc, rel, at)] = { why, en: textHash(f.en), tr: textHash(f.tr) };
  const sorted = Object.fromEntries(Object.entries(all).sort(([a], [b]) => (a < b ? -1 : 1)));
  writeFileSync(REVIEWED_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`reviewed: ${key}`);
}

function main(argv) {
  const args = argv.slice(2).filter((a) => !/^(tree|locales)=/.test(a) || a.includes(','));
  const acc = args.find((a) => a.startsWith('--accept='));
  if (acc) return accept(acc.slice(9), args.find((a) => a.startsWith('--why='))?.slice(6));
  if (args.includes('--derive')) {
    const q = Number(args.find((a) => a.startsWith('--q='))?.slice(4) ?? 0.001);
    writeFileSync(BOUNDS_FILE, `${JSON.stringify(derive(q), null, 2)}\n`);
    return console.log(`bounds written to ${BOUNDS_FILE} (q = ${q})`);
  }
  const GATE = args.includes('--gate');
  const LIST = args.includes('--list');
  const locArg = args.find((a) => !a.startsWith('--'));
  const locs = locArg && !GATE ? locArg.replace(/^locales=/, '').split(',') : ALL_LOCS;
  const reviewed = loadReviewed();
  const seen = new Set();
  const summary = {};
  for (const loc of locs) {
    const s = { flagged: 0, reviewed: 0 };
    for (const x of scan(loc)) {
      const key = reviewKey(loc, x.rel, x.at);
      const ok = reviewed[key];
      if (ok && ok.en === textHash(x.en) && ok.tr === textHash(x.tr)) {
        s.reviewed++;
        seen.add(key);
        continue;
      }
      s.flagged++;
      if (LIST || GATE)
        console.log(
          `${loc}\t${x.rel} ${x.at}\t${x.kind} ${x.ratio.toFixed(2)}× (bounds ${x.lo}–${x.hi}), English ${x.en.length}, translation ${x.tr.length}`,
        );
    }
    summary[loc] = s;
  }
  if (GATE) {
    const stale = Object.keys(reviewed).filter((k) => !seen.has(k));
    for (const k of stale) console.log(`stale exception (no longer matches a field): ${k}`);
    const left = Object.values(summary).reduce((n, s) => n + s.flagged, 0);
    const done = Object.values(summary).reduce((n, s) => n + s.reviewed, 0);
    console.log(
      `length-ratio: ${left} unreviewed, ${done} reviewed, ${stale.length} stale — ${left || stale.length ? 'FAIL' : 'PASS'}`,
    );
    process.exit(left || stale.length ? 1 : 0);
  }
  console.log(summary);
}

if (isMain(import.meta.url)) main(process.argv);
