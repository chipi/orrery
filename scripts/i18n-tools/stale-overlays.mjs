/**
 * Locale overlays that may be stale: the en-US file changed in a commit later than the last
 * commit that touched the locale's copy. A commit that touched both counts as updating both.
 * Read-only, from one `git log` pass over i18n-src/. A finder — an English typo fix flags too.
 *
 *   node scripts/i18n-tools/stale-overlays.mjs [--since=2026-10-01] [--list] [--tree=science]
 *
 * --since ignores en-US changes older than that date (the 2026-10 translation rounds touched
 * every locale, so older drift is already covered). Output: per locale, files whose English is
 * newer; --list prints them with the dates.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const SINCE = arg('since') ? Date.parse(arg('since')) / 1000 : 0;
const TREE = arg('tree');
const LIST = process.argv.includes('--list');

// Newest first: "C <unix time>" then the files of that commit.
const log = execFileSync('git', ['log', '--format=C %ct', '--name-only', '--', 'i18n-src/'], {
  encoding: 'utf8',
  maxBuffer: 1 << 30,
});
const last = new Map(); // path → unix time of the newest commit touching it
let t = 0;
for (const line of log.split('\n')) {
  if (line.startsWith('C ')) t = Number(line.slice(2));
  else if (line && !last.has(line) && existsSync(line)) last.set(line, t); // deleted files drop out
}

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
    }
  }
}
console.log(Object.fromEntries(Object.entries(out).map(([l, f]) => [l, f.length])));
