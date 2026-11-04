/**
 * Fields where the translation looks shorter than the English by at least one sentence — the
 * shape of a dropped sentence or clause (0.9.6 sample: pt-BR lost "None of the technology is
 * fully ready", ja lost "far higher than any spiral"). Read-only; a finder, not a verdict.
 *
 *   node scripts/i18n-tools/dropped-sentences.mjs [tree=science] [locales] [--list]
 *
 * A field is flagged when it has fewer sentences than the English AND its length, relative to
 * the locale's own median length ratio for the tree, is clearly short (< 0.8 of the median).
 * intro_sentence is capped at 240 characters (validate-data): a translation that ran long was
 * sometimes cut to fit, so restore the meaning within the cap.
 * Sentences end at . ! ? 。 ！ ？ ۔ । followed by a space or the end (decimals don't split).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const tree =
  args.find((a) => !a.startsWith('--') && !a.includes(',') && !/^[a-z]{2}(-[A-Za-z]+)?$/.test(a)) ??
  'science';
const locArg = args.find((a) => a.includes(',') || /^[a-z]{2}(-[A-Za-z]+)?$/.test(a));
const LIST = args.includes('--list');
const LOCS = locArg
  ? locArg.split(',')
  : ['de', 'es', 'fr', 'it', 'pt-BR', 'nl', 'ru', 'sr-Cyrl', 'ja', 'ko', 'zh-CN', 'hi', 'ar'];

const sentences = (s) =>
  s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .split(/(?<=[.!?])\s+(?=\S)|(?<=[。！？।۔])/u)
    .filter((x) => x.trim().length > 2).length;

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${d}/${e.name}`) : e.name.endsWith('.json') ? [`${d}/${e.name}`] : [],
  );
const pairs = (e, t, at, out) => {
  if (typeof e === 'string' && typeof t === 'string') {
    if (e.length > 60) out.push([at, e, t]);
  } else if (e && t && typeof e === 'object')
    for (const k of Object.keys(e)) if (k in t) pairs(e[k], t[k], at ? `${at}.${k}` : k, out);
  return out;
};

const summary = {};
for (const loc of LOCS) {
  const rows = [];
  for (const f of walk(`i18n-src/en-US/${tree}`)) {
    const tf = f.replace('/en-US/', `/${loc}/`);
    if (!existsSync(tf)) continue;
    for (const [at, e, t] of pairs(
      JSON.parse(readFileSync(f, 'utf8')),
      JSON.parse(readFileSync(tf, 'utf8')),
      '',
      [],
    ))
      rows.push({
        f: f.slice(15),
        at,
        ratio: t.length / e.length,
        se: sentences(e),
        st: sentences(t),
      });
  }
  const sorted = rows.map((r) => r.ratio).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const flagged = rows.filter((r) => r.st < r.se && r.ratio / median < 0.8);
  summary[loc] = { fields: rows.length, medianRatio: +median.toFixed(2), flagged: flagged.length };
  if (LIST)
    for (const r of flagged)
      console.log(
        `${loc}\t${r.f} ${r.at}\tsentences ${r.se}→${r.st}, length ${(r.ratio / median).toFixed(2)}× median`,
      );
}
console.log(summary);
