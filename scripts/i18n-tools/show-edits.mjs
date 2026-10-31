// Reads a fix round's edits: a random sample, or the fields matching a path, as EN / OLD / NEW blocks.
//   node scripts/i18n-tools/show-edits.mjs <workdir> <loc> [--sample=N --seed=S] [--match=<substr>…] [--width=300]
//   node scripts/i18n-tools/show-edits.mjs <workdir> --caps
// <workdir> holds edits.json and <loc>.json (the work file). --sample draws N edits (default seed 7;
// the same seed gives the same draw, but not the draw the Python original made). --match keeps the
// edits whose "rel:at" contains any substring. --width cuts the texts (sample: 300, match: whole).
// --caps lists cap-fix.json, the shortened texts for over-cap.json (schema-caps.mjs), with their EN.
import path from 'node:path';
import { cpLen, cut, enByKey, isMain, keyOf, parseArgs, readJson } from './garble-lib.mjs';

// mulberry32; the draw is a Fisher-Yates shuffle
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sample(list, n, seed = 7) {
  const r = rng(seed);
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export function sampleBlock(e, en, width) {
  return [`== ${keyOf(e)}`, ` EN: ${cut(en, width)}`, ` NEW: ${cut(e.new, width)}`];
}

export function matchBlock(e, en, width) {
  return [
    `== ${keyOf(e)}`,
    ` EN: ${cut(en ?? '?', width)}`,
    ` OLD: ${cut(e.old, width)}`,
    ` NEW: ${cut(e.new, width)}`,
  ];
}

export function capBlocks(overCapList, capFix) {
  const en = enByKey(overCapList);
  return capFix.flatMap((f, i) => [
    `#${i} ${f.rel.split('/').pop()} (${cpLen(f.new)})`,
    ` EN: ${en.get(keyOf(f)) ?? '?'}`,
    ` NEW: ${f.new}`,
  ]);
}

if (isMain(import.meta.url)) {
  const { pos, opts, one } = parseArgs(process.argv.slice(2));
  const [dir, loc] = pos;
  if (!dir || (!loc && !opts.caps)) {
    console.error(
      'usage: show-edits.mjs <workdir> <loc> [--sample=N --seed=S] [--match=<substr>…] [--width=300]',
    );
    console.error('       show-edits.mjs <workdir> --caps');
    process.exit(2);
  }
  if (opts.caps) {
    console.log(
      capBlocks(
        readJson(path.join(dir, 'over-cap.json')),
        readJson(path.join(dir, 'cap-fix.json')),
      ).join('\n'),
    );
  } else {
    const edits = readJson(path.join(dir, 'edits.json'));
    const en = enByKey(readJson(path.join(dir, `${loc}.json`)));
    const width = one('width') ? +one('width') : undefined;
    const match = opts.match?.filter((m) => m !== true);
    const lines = match?.length
      ? edits
          .filter((e) => match.some((w) => keyOf(e).includes(w)))
          .flatMap((e) => matchBlock(e, en.get(keyOf(e)), width))
      : sample(edits, +one('sample', 10), +one('seed', 7)).flatMap((e) =>
          sampleBlock(e, en.get(keyOf(e)), width ?? 300),
        );
    if (lines.length) console.log(lines.join('\n'));
  }
}
