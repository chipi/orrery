/**
 * Locale overlays that may be stale: the en-US file changed in a commit later than the last
 * commit that touched the locale's copy. A commit that touched both counts as updating both.
 * Read-only, from one `git log` pass over i18n-src/. A finder — an English typo fix flags too.
 *
 *   node scripts/i18n-tools/stale-overlays.mjs [--since=2026-10-01] [--list] [--tree=science] [--fields]
 *
 * --since ignores en-US changes older than that date (the 2026-10 translation rounds touched
 * every locale, so older drift is already covered). Output: per locale, files whose English is
 * newer; --list prints them with the dates.
 *
 * --fields narrows each flagged file to leaves: the en-US file as of the locale file's newest
 * commit (git show) is compared with the current one, string leaves by dotted key (arrays by
 * index). JSON on stdout: {loc: {file: [{key, kind, en_then, en_now, loc_now}]}} plus a summary.
 * kind: changed (English text differs), new (not in English then; every leaf if the file did not
 * exist then), missing (absent from the locale file; wins over the other two).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const SINCE = arg('since') ? Date.parse(arg('since')) / 1000 : 0;
const TREE = arg('tree');
const LIST = process.argv.includes('--list');
const FIELDS = process.argv.includes('--fields');

// Newest first: "C <unix time> <hash>" then the files of that commit.
const log = execFileSync('git', ['log', '--format=C %ct %H', '--name-only', '--', 'i18n-src/'], {
  encoding: 'utf8',
  maxBuffer: 1 << 30,
});
const last = new Map(); // path → unix time of the newest commit touching it
const lastSha = new Map(); // path → that commit
let t = 0;
let sha = '';
for (const line of log.split('\n')) {
  if (line.startsWith('C ')) [t, sha] = [Number(line.split(' ')[1]), line.split(' ')[2]];
  else if (line && !last.has(line) && existsSync(line)) {
    last.set(line, t); // deleted files drop out
    lastSha.set(line, sha);
  }
}

const leaves = (v, key = '', m = new Map()) => {
  if (typeof v === 'string') m.set(key, v);
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) leaves(x, key ? `${key}.${k}` : k, m);
  return m;
};
const parse = (s) => {
  try {
    return leaves(JSON.parse(s));
  } catch {
    return null;
  }
};
const enThen = (commit, rel) => {
  try {
    const s = execFileSync('git', ['show', `${commit}:i18n-src/en-US/${rel}`], {
      encoding: 'utf8',
      maxBuffer: 1 << 30,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return parse(s);
  } catch {
    return new Map(); // en file did not exist then: every leaf is new
  }
};
const fieldDiff = (p, q, rel) => {
  const now = parse(readFileSync(p, 'utf8'));
  const loc = parse(readFileSync(q, 'utf8'));
  if (!now || !loc) return [];
  const then = enThen(lastSha.get(q), rel) ?? new Map();
  const rows = [];
  for (const [key, en_now] of now) {
    const en_then = then.get(key);
    const loc_now = loc.get(key);
    const kind =
      loc_now === undefined ? 'missing' : en_then === undefined ? 'new' : en_then !== en_now ? 'changed' : null;
    if (kind) rows.push({ key, kind, en_then, en_now, loc_now });
  }
  return rows;
};
const fieldOut = {};
const summary = {};

const day = (s) => new Date(s * 1000).toISOString().slice(0, 10);
const out = {};
for (const [p, enT] of last) {
  if (!p.startsWith('i18n-src/en-US/') || enT < SINCE) continue;
  const rel = p.slice('i18n-src/en-US/'.length);
  if (TREE && !rel.startsWith(TREE)) continue;
  for (const [q, locT] of last) {
    if (!q.endsWith('/' + rel) || q === p) continue;
    const loc = q.slice('i18n-src/'.length, q.length - rel.length - 1);
    if (loc.includes('/')) continue;
    if (locT < enT) {
      (out[loc] ||= []).push(rel);
      if (LIST) console.log(`${loc}\t${rel}\ten ${day(enT)} > ${loc} ${day(locT)}`);
      if (FIELDS) {
        const rows = fieldDiff(p, q, rel);
        if (!rows.length) continue;
        (fieldOut[loc] ||= {})[rel] = rows;
        const s = (summary[loc] ||= { files: 0, changed: 0, new: 0, missing: 0 });
        s.files++;
        for (const r of rows) s[r.kind]++;
      }
    }
  }
}
if (FIELDS) {
  console.log(JSON.stringify({ summary, fields: fieldOut }, null, 2));
  process.exit(0);
}
console.log(Object.fromEntries(Object.entries(out).map(([l, f]) => [l, f.length])));
