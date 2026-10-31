// Tallies of a garble pass's graders and reviewers.
//   node scripts/i18n-tools/garble-tally.mjs <graded-dir | graded.json…> [--pools=science=1433,prose=1113,…] [--broken=2]
//   node scripts/i18n-tools/garble-tally.mjs --outdir=<dir with out/part*.json> [--outdir=…]
// Graded files are <loc>.json lists of {tree, grade}. Prints OK/MINOR/BROKEN per locale × tree,
// the totals, and the cells with at least --broken (default 2) BROKEN; with --pools (field count
// per tree) also the fields to read in those cells.
// --outdir: a fix round's reviewer output, per directory the grade and decision counts, then the
// fields the reviewer kept although they are not OK.
import fs from 'node:fs';
import path from 'node:path';
import { isMain, parseArgs, readJson } from './garble-lib.mjs';

const TREES = ['science', 'prose', 'universe', 'places', 'catalogue'];
const LOCS = [
  'ru',
  'ja',
  'zh-CN',
  'ko',
  'hi',
  'ar',
  'sr-Cyrl',
  'de',
  'fr',
  'es',
  'it',
  'nl',
  'pt-BR',
];
const order = (all, pref) => [
  ...pref.filter((x) => all.has(x)),
  ...[...all].filter((x) => !pref.includes(x)).sort(),
];
const bump = (o, k) => (o[k] = (o[k] ?? 0) + 1);

// files: [{loc, items}]
export function tally(files, { pools = {}, broken = 2 } = {}) {
  const cells = new Map();
  const total = {};
  for (const { loc, items } of files) {
    const row = cells.get(loc) ?? cells.set(loc, {}).get(loc);
    for (const x of items) {
      bump((row[x.tree] ??= {}), x.grade);
      bump(total, x.grade);
    }
  }
  const trees = order(new Set([...cells.values()].flatMap((r) => Object.keys(r))), TREES);
  const lines = ['loc      ' + trees.map((t) => t.padStart(13)).join('')];
  const flagged = [];
  for (const loc of order(new Set(cells.keys()), LOCS)) {
    const row = cells.get(loc);
    lines.push(
      `${loc.padEnd(8)} ` +
        trees
          .map((t) =>
            `${row[t]?.OK ?? 0}/${row[t]?.MINOR ?? 0}/${row[t]?.BROKEN ?? 0}`.padStart(13),
          )
          .join(''),
    );
    for (const t of trees)
      if ((row[t]?.BROKEN ?? 0) >= broken) flagged.push([loc, t, row[t].BROKEN]);
  }
  lines.push(`total ${JSON.stringify(total)}`, `flagged ${flagged.length}`);
  let fields = 0;
  for (const [loc, t, n] of flagged) {
    fields += pools[t] ?? 0;
    lines.push(`  ${loc} ${t}: ${n} BROKEN${t in pools ? `, ${pools[t]} fields` : ''}`);
  }
  if (Object.keys(pools).length) lines.push(`fields to read ${fields}`);
  return lines;
}

export function reviewerTally(dirs) {
  const lines = [];
  const kept = {};
  for (const d of dirs) {
    const grades = {};
    const decisions = {};
    let n = 0;
    const out = path.join(d, 'out');
    for (const f of fs.readdirSync(out).filter((f) => /^part.*\.json$/.test(f)))
      for (const x of readJson(path.join(out, f))) {
        bump(grades, x.grade);
        bump(decisions, x.decision);
        if (x.decision === 'keep' && x.grade !== 'OK') bump(kept, x.grade);
        n++;
      }
    lines.push(`${path.basename(d)} ${n} ${JSON.stringify(grades)} ${JSON.stringify(decisions)}`);
  }
  lines.push(`kept, not OK: ${JSON.stringify(kept)}`);
  return lines;
}

if (isMain(import.meta.url)) {
  const { pos, opts, one } = parseArgs(process.argv.slice(2));
  if (opts.outdir) console.log(reviewerTally(opts.outdir).join('\n'));
  else if (pos.length) {
    const paths = pos.flatMap((p) =>
      fs.statSync(p).isDirectory()
        ? fs
            .readdirSync(p)
            .filter((f) => f.endsWith('.json'))
            .sort()
            .map((f) => path.join(p, f))
        : [p],
    );
    const pools = Object.fromEntries(
      (one('pools') ?? '')
        .split(',')
        .filter(Boolean)
        .map((s) => s.split('='))
        .map(([k, v]) => [k, +v]),
    );
    const files = paths.map((p) => ({ loc: path.basename(p, '.json'), items: readJson(p) }));
    console.log(tally(files, { pools, broken: +one('broken', 2) }).join('\n'));
  } else {
    console.error(
      'usage: garble-tally.mjs <graded-dir | graded.json…> [--pools=tree=n,…] [--broken=2]',
    );
    console.error('       garble-tally.mjs --outdir=<dir with out/part*.json> [--outdir=…]');
    process.exit(2);
  }
}
