// Which forms does each locale already use for a technical term? Contrasts the fields whose
// English uses the term with every other field of the same locale and ranks the words (and,
// for ja / zh-CN / ko, character runs) that are frequent in the first and rare in the second.
// For picking a new glossary term's binding form from the site's own majority, and for
// estimating the misses before it is added. A finder: read the forms it lists.
//   node scripts/i18n-tools/term-candidates.mjs <term[,term…]> [locales] [--top=4] [--misses=<file>]
import fs from 'node:fs';
import path from 'node:path';
import { normalize, prose, isText } from './term-match.mjs';

const args = process.argv.slice(2);
const TOP = Number(args.find((a) => a.startsWith('--top='))?.slice(6) ?? 4);
// --misses=<file> (term-drift.mjs --misses output): rank the forms inside the missed fields
// only — the variants a new entry's stems do not accept yet.
const missArg = args.find((a) => a.startsWith('--misses='))?.slice(9);
const MISSES = missArg ? JSON.parse(fs.readFileSync(missArg, 'utf8')) : null;
const pos = args.filter((a) => !a.startsWith('--'));
const TERMS = (pos[0] ?? '').split(',').filter(Boolean);
const LOCS = (pos[1] ?? 'ru,sr-Cyrl,ja,ko,zh-CN,hi,ar,de,fr,es,it,nl,pt-BR').split(',');
if (!TERMS.length) {
  console.error('usage: term-candidates.mjs <term[,term…]> [locales] [--top=4]');
  process.exit(2);
}
const TREES = ['science', 'essays', 'missions', 'fleet', 'programs'];
const ROOT = 'i18n-src';
const walk = (d) =>
  fs.existsSync(d)
    ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(d, e.name);
        return e.isDirectory() ? walk(p) : e.name.endsWith('.json') ? [p] : [];
      })
    : [];
const leaves = (o, at = '', out = []) => {
  if (typeof o === 'string') out.push([at, o]);
  else if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) leaves(v, at ? `${at}.${k}` : k, out);
  return out;
};

// Aligned pairs per locale, read once.
const pairs = Object.fromEntries(LOCS.map((l) => [l, []]));
for (const tree of TREES)
  for (const enFile of walk(path.join(ROOT, 'en-US', tree))) {
    const rel = path.relative(path.join(ROOT, 'en-US'), enFile);
    const en = leaves(JSON.parse(fs.readFileSync(enFile, 'utf8')));
    for (const loc of LOCS) {
      const f = path.join(ROOT, loc, rel);
      if (!fs.existsSync(f)) continue;
      const tr = new Map(leaves(JSON.parse(fs.readFileSync(f, 'utf8'))));
      for (const [at, e] of en)
        if (isText(e) && tr.has(at)) pairs[loc].push([prose(e), normalize(loc, prose(tr.get(at)))]);
    }
  }

const CJK = new Set(['ja', 'zh-CN']);
// Tokens of one field, each counted once: words and word pairs (lower case), plus a 6-letter
// prefix for longer words so inflected forms meet (ускорителя / ускорителем); character runs
// of 2–4 for ja / zh-CN and inside Korean words (particles attach to the noun).
function tokens(loc, s) {
  const out = new Set();
  if (CJK.has(loc)) {
    for (const run of s.match(/[\p{Script=Han}\p{Script=Katakana}\p{Script=Hiragana}ー]+/gu) ?? [])
      for (let n = 2; n <= 4; n++)
        for (let i = 0; i + n <= run.length; i++) out.add(run.slice(i, i + n));
    return out;
  }
  const words = s.toLowerCase().match(/[\p{L}\p{M}'-]+/gu) ?? [];
  words.forEach((w, i) => {
    if (loc === 'ko') {
      for (let n = 2; n <= 4; n++) if (w.length >= n) out.add(w.slice(0, n));
      return;
    }
    out.add(w);
    if (w.length > 7) out.add(`${w.slice(0, 6)}…`);
    if (words[i + 1]) out.add(`${w} ${words[i + 1]}`);
  });
  return out;
}

for (const term of TERMS) {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<![\\w-])${esc}(?:s|es|ed|ing)?(?![\\w-])`, 'i');
  console.log(`\n## ${term}`);
  for (const loc of LOCS) {
    const A = MISSES
      ? MISSES.filter((m) => m.term === term && m.loc === loc).map((m) => [
          m.en,
          normalize(loc, prose(m.tr)),
        ])
      : pairs[loc].filter(([e]) => re.test(e));
    if (!A.length) continue;
    const B = pairs[loc].filter(([e]) => !re.test(e));
    const dfA = new Map();
    const dfB = new Map();
    for (const [, t] of A) for (const k of tokens(loc, t)) dfA.set(k, (dfA.get(k) ?? 0) + 1);
    for (const [, t] of B)
      for (const k of tokens(loc, t)) if (dfA.has(k)) dfB.set(k, (dfB.get(k) ?? 0) + 1);
    const ranked = [...dfA]
      .map(([k, a]) => {
        const cover = a / A.length;
        const lift = cover / (((dfB.get(k) ?? 0) + 1) / (B.length + 1));
        return { k, cover, lift };
      })
      .filter((x) => x.cover >= 0.08 && x.lift >= 8)
      .sort((x, y) => y.cover * Math.log(y.lift) - x.cover * Math.log(x.lift));
    // Drop a run that is only a piece of a better-covering run above it (CJK n-grams).
    const shown = [];
    for (const x of ranked) {
      if (shown.some((s) => s.k.includes(x.k.replace('…', '')) && s.cover >= x.cover - 0.02))
        continue;
      shown.push(x);
      if (shown.length >= TOP) break;
    }
    console.log(
      `${loc.padEnd(7)} n=${String(A.length).padEnd(4)} ${shown.map((x) => `${x.k} ${Math.round(x.cover * 100)}%`).join(' | ')}`,
    );
  }
}
