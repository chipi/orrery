// Reads a garble-check flags file for the reader: one block per flagged field (EN / OLD / NEW),
// or, with --long, the tagline edits over a cap.
//   node scripts/i18n-tools/garble-flags.mjs <edits.flags.json> [--kinds=ISO,tagline,link,number,separator] [--headers] [--full]
//   node scripts/i18n-tools/garble-flags.mjs --long=<edits.json> [--cap=140] [--headers]
// --kinds keeps flags whose reason text matches one of the words (term, numbers, link, ISO, …);
// --headers prints the "#i rel:at  reasons" line only; texts are cut to 400 characters unless --full.
// Reasons are joined with " | " (the Python original printed the list repr).
import { cpLen, cut, isMain, parseArgs, readJson } from './garble-lib.mjs';

export function showFlags(flags, { kinds, headers, full } = {}) {
  const out = [];
  for (const f of flags) {
    const why = f.why.join(' | ');
    if (kinds?.length && !kinds.some((k) => why.includes(k))) continue;
    out.push(`#${f.i} ${f.rel}:${f.at}  ${why}`);
    if (headers) continue;
    const n = full ? undefined : 400;
    out.push(`  EN : ${cut(f.en, n)}`, `  OLD: ${cut(f.tr, n)}`, `  NEW: ${cut(f.new, n)}`);
  }
  return out;
}

export function longTaglines(edits, cap = 140, headers = false) {
  const out = [];
  edits.forEach((e, i) => {
    if (e.at !== 'tagline' || cpLen(e.new) <= cap) return;
    out.push(`${i} ${cpLen(e.new)} ${e.rel}`);
    if (!headers) out.push(`  EN : ${e.en}`, `  NEW: ${e.new}`);
  });
  return out;
}

if (isMain(import.meta.url)) {
  const { pos, one, opts } = parseArgs(process.argv.slice(2));
  const long = one('long');
  if (!long && !pos[0]) {
    console.error('usage: garble-flags.mjs <edits.flags.json> [--kinds=a,b] [--headers] [--full]');
    console.error('       garble-flags.mjs --long=<edits.json> [--cap=140] [--headers]');
    process.exit(2);
  }
  const lines = long
    ? longTaglines(readJson(long), +one('cap', 140), !!opts.headers)
    : showFlags(readJson(pos[0]), {
        kinds: one('kinds')?.split(',').filter(Boolean),
        headers: !!opts.headers,
        full: !!opts.full,
      });
  if (lines.length) console.log(lines.join('\n'));
}
