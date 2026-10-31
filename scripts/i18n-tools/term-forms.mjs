// Which forms of a word a locale uses: every place a regex matches in the shipped text, or how
// often each form occurs in a fix round's new texts.
//   node scripts/i18n-tools/term-forms.mjs <loc> <regex>
//   node scripts/i18n-tools/term-forms.mjs <loc> <regex> --edits=<edits.json>
// Without --edits: scans every string in i18n-src/<loc>/**.json and messages/<loc>.json and prints
// "file | at | …context…" (40 characters either side) and the hit count. With --edits: counts the
// matched forms in the edits' `new`, most frequent first.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, isMain, parseArgs, pyRegex, readJson } from './garble-lib.mjs';

export function* leaves(o, pre = '') {
  if (typeof o === 'string') yield [pre, o];
  else if (Array.isArray(o))
    for (const [i, v] of o.entries()) yield* leaves(v, pre ? `${pre}.${i}` : `${i}`);
  else if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) yield* leaves(v, pre ? `${pre}.${k}` : k);
}

function* jsonFiles(dir) {
  for (const d of fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) yield* jsonFiles(p);
    else if (d.name.endsWith('.json')) yield p;
  }
}

const around = (v, m) => v.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40);

export function scan(loc, re, root = ROOT) {
  const hits = [];
  const base = path.join(root, 'i18n-src', loc);
  for (const p of jsonFiles(base))
    for (const [at, v] of leaves(readJson(p)))
      for (const m of v.matchAll(re)) hits.push([path.relative(base, p), at, around(v, m)]);
  const msgs = readJson(path.join(root, 'messages', `${loc}.json`));
  for (const [k, v] of Object.entries(msgs))
    if (typeof v === 'string')
      for (const m of v.matchAll(re)) hits.push(['messages', k, around(v, m)]);
  return hits;
}

export function countForms(edits, re) {
  const c = new Map();
  for (const e of edits) for (const m of e.new.matchAll(re)) c.set(m[0], (c.get(m[0]) ?? 0) + 1);
  return [...c].sort((a, b) => b[1] - a[1]);
}

if (isMain(import.meta.url)) {
  const { pos, one } = parseArgs(process.argv.slice(2));
  const [loc, pattern] = pos;
  if (!loc || !pattern) {
    console.error('usage: term-forms.mjs <loc> <regex> [--edits=<edits.json>]');
    process.exit(2);
  }
  const re = pyRegex(pattern);
  if (one('edits'))
    for (const [form, n] of countForms(readJson(one('edits')), re)) console.log(n, form);
  else {
    const hits = scan(loc, re);
    for (const h of hits) console.log(h.join(' | '));
    console.log('hits', hits.length);
  }
}
