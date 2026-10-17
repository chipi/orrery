// Item 3: replace English event/resident labels with the locale dictionary entry.
// Only rows the coverage scan reports as identical to English are touched; each
// replacement is checked with problems() and written surgically (layout kept).
import fs from 'node:fs';
import { writeJsonEdits } from '../lib/json-surgical.mjs';
import { problems } from '../lib/translate-quality.mjs';
const S = 'scripts/i18n-tools/maps/2026-10-17-translation-cleanup';
const R = 'i18n-src';
const loc = process.argv[2];
const [, , , TSV, DICT] = process.argv;
const dict = JSON.parse(fs.readFileSync(`${S}/${DICT}/${loc}.json`, 'utf8'));
const KEEP = new Set();
const byFile = {};
const missing = new Set();
const errs = [];
for (const line of fs.readFileSync(`${S}/${TSV}`, 'utf8').trim().split('\n')) {
  const m = line.match(/^([^\t]+)\t(\S+) :: (\S+) — (.*)$/);
  if (!m || m[1] !== loc || KEEP.has(m[4])) continue;
  const [, , file, at, en] = m;
  const nu = dict[en];
  if (!nu) {
    missing.add(en);
    continue;
  }
  if (nu === en) continue;
  for (const p of problems(loc, en, nu)) errs.push(`${en} → ${nu}: ${p.slice(0, 120)}`);
  (byFile[file] ||= []).push({ at, old: en, nu });
}
if (missing.size) errs.push(`no dictionary entry: ${[...missing].join(' | ')}`);
if (errs.length) {
  console.log(`✗ ${loc}\n  ${[...new Set(errs)].join('\n  ')}`);
  process.exit(1);
}
// The scan addresses lists of objects by id ("residents.jwst.label"); the writer
// needs indexes. Resolve against the locale file, and only keep edits whose current
// value is still the English label.
const resolve = (j, at) => {
  const out = [];
  let cur = j;
  for (const s of at.split('.')) {
    if (Array.isArray(cur) && !/^\d+$/.test(s)) {
      const i = cur.findIndex((x) => x && x.id === s);
      if (i < 0) return null;
      out.push(String(i));
      cur = cur[i];
    } else {
      out.push(s);
      cur = cur?.[/^\d+$/.test(s) ? Number(s) : s];
    }
  }
  return { at: out.join('.'), value: cur };
};
let n = 0;
for (const [file, edits] of Object.entries(byFile)) {
  const j = JSON.parse(fs.readFileSync(`${R}/${loc}/${file}`, 'utf8'));
  const real = [];
  for (const e of edits) {
    const r = resolve(j, e.at);
    if (r && r.value === e.old) real.push({ ...e, at: r.at });
  }
  if (real.length) writeJsonEdits(`${R}/${loc}/${file}`, real);
  n += real.length;
}
console.log(`✓ ${loc}: ${n} labels in ${Object.keys(byFile).length} files`);
