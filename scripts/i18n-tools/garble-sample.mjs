// Garble pass, step 2 (measure): a graded-sample work file per locale × tree, drawn only from
// translated fields whose text was last written on or before a cut-off date (default
// 2026-07-14, the last run without quality checks; see docs/wip/2026-10-31-garble-pass.md).
// Read-only on the repo.
//   node scripts/i18n-tools/garble-sample.mjs <outdir> [--trees=fleet,missions] [--per=25|all]
//        [--before=2026-07-14] [--locales=…] [--seed=31]
// Writes <outdir>/<loc>.json: [{rel, at, tree, written, en, tr, terms}] and prints the pool
// sizes. --per=all writes the whole pool: the work file for a fix round (garble-pass doc §3).
// `terms` is the term-binding note the translators get for that English (termNotes).
// --before=any drops the date filter: every translated field, the text readers see now (round-2
// measurement). --exclude=<dir>[,<dir>…] skips fields listed ({rel, at}) in any <loc>.json there,
// so a fresh sample never re-grades an earlier one.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { termNotes } from '../lib/translate-quality.mjs';
import { isText } from './term-match.mjs';

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const outDir = process.argv[2];
if (!outDir || outDir.startsWith('--')) {
  console.error(
    'usage: garble-sample.mjs <outdir> [--trees=] [--per=] [--before=] [--locales=] [--seed=]',
  );
  process.exit(2);
}
const TREES = arg('trees', 'fleet,missions').split(',');
const PER = arg('per', '25') === 'all' ? Infinity : Number(arg('per', '25'));
const BEFORE = arg('before', '2026-07-14');
const LOCS = arg('locales', 'ru,ja,zh-CN,ko,hi,ar,sr-Cyrl,de,fr,es,it,nl,pt-BR').split(',');
const EXCLUDE = arg('exclude', '').split(',').filter(Boolean);
const excluded = (loc) =>
  new Set(
    EXCLUDE.flatMap((d) => {
      const f = path.join(d, `${loc}.json`);
      return fs.existsSync(f)
        ? JSON.parse(fs.readFileSync(f, 'utf8')).map((x) => `${x.rel}|${x.at}`)
        : [];
    }),
  );
let seed = Number(arg('seed', '31'));
const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

const walk = (d) =>
  fs.existsSync(d)
    ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(d, e.name);
        return e.isDirectory() ? walk(p) : e.name.endsWith('.json') ? [p] : [];
      })
    : [];
const leaves = (o, pre = '', out = []) => {
  if (typeof o === 'string') out.push([pre, o]);
  else if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) leaves(v, pre ? `${pre}.${k}` : k, out);
  return out;
};

/** Date each string value was last written, from git blame (value text → date). */
function blameDates(file) {
  const txt = execFileSync('git', ['blame', '--line-porcelain', '--', file], {
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  });
  const dates = new Map();
  let date = '';
  for (const line of txt.split('\n')) {
    if (line.startsWith('committer-time '))
      date = new Date(+line.slice(15) * 1000).toISOString().slice(0, 10);
    else if (line.startsWith('\t')) {
      const m = /"((?:[^"\\]|\\.)*)"\s*,?\s*$/.exec(line);
      if (m) dates.set(JSON.parse(`"${m[1]}"`), date);
    }
  }
  return dates;
}

fs.mkdirSync(outDir, { recursive: true });
for (const loc of LOCS) {
  const picked = [];
  const skip = excluded(loc);
  for (const tree of TREES) {
    const pool = [];
    for (const f of walk(`i18n-src/${loc}/${tree}`)) {
      const rel = path.relative(`i18n-src/${loc}`, f);
      const enFile = `i18n-src/en-US/${rel}`;
      if (!fs.existsSync(enFile)) continue;
      const en = new Map(leaves(JSON.parse(fs.readFileSync(enFile, 'utf8'))));
      const dates = BEFORE === 'any' ? new Map() : blameDates(f);
      for (const [at, tr] of leaves(JSON.parse(fs.readFileSync(f, 'utf8')))) {
        const e = en.get(at);
        const written = BEFORE === 'any' ? 'any' : dates.get(tr);
        if (!e || !written || (BEFORE !== 'any' && written > BEFORE)) continue;
        if (!isText(e) || e.length < 40 || skip.has(`${rel}|${at}`)) continue;
        pool.push({ rel, at, tree, written, en: e, tr, terms: termNotes(loc, e).trim() });
      }
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    picked.push(...pool.slice(0, PER));
    console.log(
      `${loc} ${tree}: ${pool.length} fields ${BEFORE === 'any' ? 'in all' : `last written on or before ${BEFORE}`}; sampled ${Math.min(PER, pool.length)}`,
    );
  }
  fs.writeFileSync(path.join(outDir, `${loc}.json`), JSON.stringify(picked, null, 1));
}
