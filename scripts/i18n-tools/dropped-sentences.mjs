/**
 * Fields where the translation looks shorter than the English by at least one sentence — the
 * shape of a dropped sentence or clause (0.9.6 sample: pt-BR lost "None of the technology is
 * fully ready", ja lost "far higher than any spiral"). Read-only; a finder, not a verdict.
 *
 *   node scripts/i18n-tools/dropped-sentences.mjs [tree=science|all] [locales] [--list]
 *                                                 [--unreviewed] [--gate]
 *                                                 [--accept=<locale|file|field> --why="<reason>"]
 *
 * A field is flagged when it has fewer sentences than the English AND its length, relative to
 * the locale's own median length ratio for the tree, is clearly short (< 0.8 of the median).
 * intro_sentence is capped at 240 characters (validate-data): a translation that ran long was
 * sometimes cut to fit, so restore the meaning within the cap.
 * Sentences end at . ! ? 。 ！ ？ ۔ । followed by a space or the end (decimals don't split).
 *
 * dropped-sentences-reviewed.json holds the flagged fields a person read and left (a clause joined
 * by a comma or a dash instead of a full stop, a CJK sentence run together), keyed
 * locale|file|field with a hash of the English and of the translation, so an edit to either brings
 * the field back. --unreviewed subtracts them; --gate does too over every tree and locale, and
 * exits 1 on a field left or an exception that matches nothing. --accept records one.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { textHash } from './term-match.mjs';
import { isMain } from './garble-lib.mjs';

const ALL_LOCS = [
  'de',
  'es',
  'fr',
  'it',
  'pt-BR',
  'nl',
  'ru',
  'sr-Cyrl',
  'ja',
  'ko',
  'zh-CN',
  'hi',
  'ar',
];
const SRC = 'i18n-src/en-US';
const REVIEWED_FILE = 'scripts/i18n-tools/dropped-sentences-reviewed.json';

export const sentences = (s) =>
  s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .split(/(?<=[.!?])\s+(?=\S)|(?<=[。！？।۔])/u)
    .filter((x) => x.trim().length > 2).length;

const walk = (d) =>
  statSync(d).isFile()
    ? [d]
    : readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory()
          ? walk(`${d}/${e.name}`)
          : e.name.endsWith('.json')
            ? [`${d}/${e.name}`]
            : [],
      );
const pairs = (e, t, at, out) => {
  if (typeof e === 'string' && typeof t === 'string') {
    if (e.length > 60) out.push([at, e, t]);
  } else if (e && t && typeof e === 'object')
    for (const k of Object.keys(e)) if (k in t) pairs(e[k], t[k], at ? `${at}.${k}` : k, out);
  return out;
};
export const allTrees = () =>
  readdirSync(SRC)
    .map((n) => n.replace(/\.json$/, ''))
    .sort();
const treePath = (tree) =>
  existsSync(`${SRC}/${tree}`) ? `${SRC}/${tree}` : `${SRC}/${tree}.json`;

export const reviewKey = (loc, rel, at) => `${loc}|${rel}|${at}`;
export const loadReviewed = (file = REVIEWED_FILE) =>
  existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};

/** Flagged fields of one tree for one locale: { fields, flagged: [{ rel, at, ratio, se, st, en, tr }] }. */
export function scan(tree, loc) {
  const rows = [];
  for (const f of walk(treePath(tree))) {
    const tf = f.replace('/en-US', `/${loc}`);
    if (!existsSync(tf)) continue;
    for (const [at, e, t] of pairs(
      JSON.parse(readFileSync(f, 'utf8')),
      JSON.parse(readFileSync(tf, 'utf8')),
      '',
      [],
    ))
      rows.push({
        rel: f.slice(SRC.length + 1),
        at,
        ratio: t.length / e.length,
        se: sentences(e),
        st: sentences(t),
        en: e,
        tr: t,
      });
  }
  const sorted = rows.map((r) => r.ratio).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 1;
  return {
    fields: rows.length,
    median,
    flagged: rows.filter((r) => r.st < r.se && r.ratio / median < 0.8),
  };
}

function accept(key, why) {
  const [loc, rel, at] = key.split('|');
  const get = (o) => at.split('.').reduce((x, k) => x?.[k], o);
  const en = get(JSON.parse(readFileSync(`${SRC}/${rel}`, 'utf8')));
  const tr = get(JSON.parse(readFileSync(`${SRC.replace('en-US', loc)}/${rel}`, 'utf8')));
  if (typeof en !== 'string' || typeof tr !== 'string' || !why)
    throw new Error(`cannot accept ${key}`);
  const all = loadReviewed();
  all[reviewKey(loc, rel, at)] = { why, en: textHash(en), tr: textHash(tr) };
  const sorted = Object.fromEntries(Object.entries(all).sort(([a], [b]) => (a < b ? -1 : 1)));
  writeFileSync(REVIEWED_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`reviewed: ${key}`);
}

function main(argv) {
  const args = argv.slice(2).map((a) => a.replace(/^(tree|locales)=/, ''));
  const acc = args.find((a) => a.startsWith('--accept='));
  if (acc) return accept(acc.slice(9), args.find((a) => a.startsWith('--why='))?.slice(6));
  const tree =
    args.find(
      (a) => !a.startsWith('--') && !a.includes(',') && !/^[a-z]{2}(-[A-Za-z]+)?$/.test(a),
    ) ?? 'science';
  const locArg = args.find((a) => a.includes(',') || /^[a-z]{2}(-[A-Za-z]+)?$/.test(a));
  const LIST = args.includes('--list');
  const GATE = args.includes('--gate');
  const UNREVIEWED = GATE || args.includes('--unreviewed');
  const locs = locArg && !GATE ? locArg.split(',') : ALL_LOCS;
  const trees = tree === 'all' || GATE ? allTrees() : [tree];
  const reviewed = UNREVIEWED ? loadReviewed() : {};
  const seen = new Set();

  const summary = {};
  for (const loc of locs) {
    const s = { fields: 0, medianRatio: 0, flagged: 0, reviewed: 0 };
    for (const tr of trees) {
      const r = scan(tr, loc);
      s.fields += r.fields;
      s.medianRatio = +r.median.toFixed(2);
      for (const x of r.flagged) {
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
            `${loc}\t${x.rel} ${x.at}\tsentences ${x.se}→${x.st}, length ${(x.ratio / r.median).toFixed(2)}× median`,
          );
      }
    }
    summary[loc] = s;
  }
  if (GATE) {
    const stale = Object.keys(reviewed).filter((k) => !seen.has(k));
    for (const k of stale) console.log(`stale exception (no longer matches a field): ${k}`);
    const left = Object.values(summary).reduce((n, s) => n + s.flagged, 0);
    const done = Object.values(summary).reduce((n, s) => n + s.reviewed, 0);
    console.log(
      `dropped-sentences: ${left} unreviewed, ${done} reviewed, ${stale.length} stale — ${left || stale.length ? 'FAIL' : 'PASS'}`,
    );
    process.exit(left || stale.length ? 1 : 0);
  }
  console.log(summary);
}

if (isMain(import.meta.url)) main(process.argv);
