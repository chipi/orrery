#!/usr/bin/env node
/**
 * Free, read-only scan for translation gaps across every locale.
 *
 *   node scripts/i18n-coverage-scan.mjs [--json=out.json] [--examples=3]
 *
 * Overlays (i18n-src/<loc>/** vs i18n-src/en-US/**):
 *   missingFile  en-US file with no locale file          → readers get English
 *   missingKey   string in en-US absent from the locale   → readers get English
 *   empty        locale "" where en-US has text
 *   typeMismatch string vs list vs object differ
 *   lengthMismatch list length differs from en-US
 *   extraKey     key only in the locale (orphan, never shown or stale)
 *   sameAsEnglish  prose identical to en-US (not just names/designations)
 * UI messages (messages/<loc>.json vs messages/en-US.json): missingKey, empty,
 *   extraKey, sameAsEnglish, placeholder ({x} sets differ).
 * nativeNameMissing: in a name's origin locale the English form is still used
 *   (Soyuz in ru where «Союз» belongs — scripts/lib/name-origins.mjs).
 * Base data (static/data/*.json not under i18n/): prose strings in data sets
 *   that have no en-US overlay directory or file — English with no translation path.
 */
import fs from 'node:fs';
import path from 'node:path';
import { SKIP_KEY } from './i18n-manifest.mjs';
import { designations, knownNamesIn } from './lib/translate-quality.mjs';
import { ORIGIN_NAMES, nativeName } from '../src/lib/name-origins.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = path.join(ROOT, 'i18n-src');
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=') || true];
  }),
);
const EX = Number(args.examples ?? 3);
const LOCALES = fs
  .readdirSync(SRC)
  .filter((d) => d !== 'en-US' && fs.statSync(path.join(SRC, d)).isDirectory())
  .sort();

const walk = (dir, out = []) => {
  for (const n of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, n);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (n.endsWith('.json')) out.push(p);
  }
  return out;
};
const kind = (v) => (Array.isArray(v) ? 'list' : v === null ? 'null' : typeof v);
// Prose = at least three lowercase words of 3+ letters; names and designations
// ("Apollo 11", "LM Eagle", "SLC-4E") are legitimately identical across locales.
const isProse = (s) => (s.match(/\b[a-z]{3,}\b/g) || []).length >= 3;
// Identifier-valued fields are identical across locales by design.
const ID_FIELDS =
  /^(tab|paths?|diagram|mission_id|status|short|id|slug|url|u|t|kind|icon|image|src)$/;
// An identical string is untranslated when it holds an ordinary word: any lowercase
// word ("Saturn IB from Cape Kennedy", "Mercury capsule"), or — for event labels,
// which are written in capitals — any all-caps word ("LAUNCH", "SPLASHDOWN").
// Title-Case headings ("Vis-Viva Equation") hide from both rules: for title-like
// fields, any word of 4+ letters left after removing known names and designations
// counts as ordinary English.
const TITLE_FIELDS = /^(title|short_title|heading|subtitle|section_title)$/;
const titleWords = (s) => {
  let rest = s;
  for (const n of [...knownNamesIn(s), ...designations(s)]) rest = rest.split(n).join(' ');
  return /\b[A-Za-z]{4,}\b/.test(rest);
};
// Identical on purpose: a proper name kept in English (NAME_POLICY), or a word
// spelled the same in that language.
const SAME_OK = { '*': ['DSN — Deep Space Network'], fr: ['Biosignatures'] };
const untranslated = (field, s) =>
  !ID_FIELDS.test(field) &&
  (/\b[a-z]{3,}\b/.test(s) ||
    (field === 'label' && /[A-Z]{4,}/.test(s)) ||
    (TITLE_FIELDS.test(field) && titleWords(s)));
const sameByField = {};

const report = {};
const add = (loc, kindName, where) => {
  const r = (report[loc] ||= {});
  const k = (r[kindName] ||= { n: 0, ex: [] });
  k.n++;
  if (k.ex.length < EX) k.ex.push(where);
};

function compare(loc, rel, en, tr, at = '') {
  const ke = kind(en);
  const kt = kind(tr);
  if (kt === 'undefined') {
    if (ke === 'string' && en.trim() && !SKIP_KEY.test(at))
      add(loc, 'missingKey', `${rel} :: ${at}`);
    else if (ke === 'list' || ke === 'object') {
      // Count the strings inside a missing container once, as one missing key.
      add(loc, 'missingKey', `${rel} :: ${at} (whole ${ke})`);
    }
    return;
  }
  if (ke !== kt) return add(loc, 'typeMismatch', `${rel} :: ${at} en=${ke} tr=${kt}`);
  if (ke === 'string') {
    if (/^<[A-Z_ ]+>$/.test(tr.trim()))
      return add(loc, 'placeholderText', `${rel} :: ${at} = ${tr}`);
    if (SKIP_KEY.test(at)) return;
    // Origin-language rule: in a name's own locale the native form is used, so the
    // English form left in the text is a miss (link labels are English source titles).
    if (!/(^|\.)(l|u)$/.test(at))
      for (const n of [
        ...new Set([
          ...designations(en),
          ...knownNamesIn(en),
          // people and places in the origin table that the data gazetteer lacks;
          // "Persei" is the Angara upper stage but also a Bayer genitive (Beta Persei)
          ...Object.keys(ORIGIN_NAMES[loc] ?? {}).filter((k) => k !== 'Persei' && en.includes(k)),
        ]),
      ]) {
        const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (nativeName(loc, n) && new RegExp(`(^|[^A-Za-z0-9])${esc}(?![A-Za-z0-9])`).test(tr))
          add(loc, 'nativeNameMissing', `${rel} :: ${at} — ${n} → ${nativeName(loc, n)}`);
      }
    if (en.trim() && !tr.trim()) add(loc, 'empty', `${rel} :: ${at}`);
    else if (tr === en) {
      const field =
        at
          .split('.')
          .filter((s) => !/^\d+$/.test(s))
          .pop() ?? '';
      if (untranslated(field, en) && !SAME_OK[loc]?.includes(en) && !SAME_OK['*'].includes(en)) {
        add(loc, 'sameAsEnglish', `${rel} :: ${at} — ${en.slice(0, 70)}`);
        sameByField[field] = (sameByField[field] || 0) + 1;
      }
    }
    return;
  }
  if (ke === 'list') {
    if (en.length !== tr.length && !(en.length === 0 && rel.startsWith('hotspot-metadata/')))
      add(loc, 'lengthMismatch', `${rel} :: ${at} en=${en.length} tr=${tr.length}`);
    // Lists of objects with ids are matched by id; plain lists by index.
    const byId = en.every((x) => x && typeof x === 'object' && 'id' in x);
    en.forEach((x, i) => {
      const t = byId ? tr.find((y) => y && y.id === x.id) : tr[i];
      if (t !== undefined || !byId) compare(loc, rel, x, t, `${at}.${byId ? x.id : i}`);
      else add(loc, 'missingKey', `${rel} :: ${at}.${x.id} (list item)`);
    });
    return;
  }
  if (ke === 'object') {
    for (const k of Object.keys(en)) compare(loc, rel, en[k], tr[k], at ? `${at}.${k}` : k);
    for (const k of Object.keys(tr)) {
      if (k in en) continue;
      const where = `${rel} :: ${at ? `${at}.${k}` : k}`;
      // A locale-only `name` overrides the English name from the base data, and
      // names are never translated (NAME_POLICY) — so any such override is wrong.
      if (k === 'name' && !at && typeof tr[k] === 'string')
        add(loc, 'nameOverride', `${where} = ${tr[k]}`);
      else if (typeof tr[k] === 'string' && /^<[A-Z_ ]+>$/.test(tr[k].trim()))
        add(loc, 'placeholderText', `${where} = ${tr[k]}`);
      else add(loc, 'extraKey', where);
    }
  }
}

// 1. Overlays.
const enFiles = walk(path.join(SRC, 'en-US')).map((p) => path.relative(path.join(SRC, 'en-US'), p));
for (const loc of LOCALES) {
  for (const rel of enFiles) {
    const lp = path.join(SRC, loc, rel);
    if (!fs.existsSync(lp)) {
      add(loc, 'missingFile', rel);
      continue;
    }
    const en = JSON.parse(fs.readFileSync(path.join(SRC, 'en-US', rel), 'utf8'));
    const tr = JSON.parse(fs.readFileSync(lp, 'utf8'));
    compare(loc, rel, en, tr);
  }
  const have = new Set(enFiles);
  for (const p of walk(path.join(SRC, loc))) {
    const rel = path.relative(path.join(SRC, loc), p);
    // hotspot-metadata overlays legitimately exist without an en-US twin
    // (English comes from static/data/surface-hotspots.json).
    if (!have.has(rel) && !rel.startsWith('hotspot-metadata/')) add(loc, 'extraFile', rel);
  }
}

// 2. UI messages.
const msgEn = JSON.parse(fs.readFileSync(path.join(ROOT, 'messages', 'en-US.json'), 'utf8'));
const ph = (s) =>
  [...String(s).matchAll(/\{[^}]+\}/g)]
    .map((m) => m[0])
    .sort()
    .join(' ');
for (const loc of LOCALES) {
  const p = path.join(ROOT, 'messages', `${loc}.json`);
  if (!fs.existsSync(p)) {
    add(loc, 'messages:missingFile', `messages/${loc}.json`);
    continue;
  }
  const m = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const [k, v] of Object.entries(msgEn)) {
    if (k.startsWith('$')) continue;
    if (!(k in m)) add(loc, 'messages:missingKey', k);
    else if (typeof v === 'string' && v.trim() && !String(m[k]).trim())
      add(loc, 'messages:empty', k);
    else if (m[k] === v && isProse(v))
      add(loc, 'messages:sameAsEnglish', `${k} — ${v.slice(0, 70)}`);
    else if (typeof v === 'string' && ph(v) !== ph(m[k]))
      add(loc, 'messages:placeholder', `${k} en=[${ph(v)}] tr=[${ph(m[k])}]`);
  }
  for (const k of Object.keys(m))
    if (!k.startsWith('$') && !(k in msgEn)) add(loc, 'messages:extraKey', k);
}

// 3. Base data sets with prose but no en-US overlay of the same name.
const DATA = path.join(ROOT, 'static', 'data');
const overlayNames = new Set(
  fs.readdirSync(path.join(SRC, 'en-US')).map((n) => n.replace(/\.json$/, '')),
);
const prose = (v, at, out) => {
  if (typeof v === 'string') {
    if (v.length >= 40 && isProse(v) && !/^(https?:|\/|data:)/.test(v)) out.push([at, v]);
  } else if (Array.isArray(v)) v.forEach((x, i) => prose(x, `${at}[${i}]`, out));
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) prose(x, at ? `${at}.${k}` : k, out);
  return out;
};
const base = [];
for (const n of fs.readdirSync(DATA).sort()) {
  const p = path.join(DATA, n);
  if (n === 'i18n' || !n.endsWith('.json') || !fs.statSync(p).isFile()) continue;
  const name = n.replace(/\.json$/, '');
  if (overlayNames.has(name)) continue;
  let j;
  try {
    j = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    continue;
  }
  const found = prose(j, '', []);
  if (found.length) {
    const keys = [
      ...new Set(
        found.map(([at]) => at.replace(/\[\d+\]/g, '[]').replace(/^[^.]+\.(?=[^.]+$)/, '*.')),
      ),
    ];
    base.push({
      file: `static/data/${n}`,
      strings: found.length,
      keys: keys.slice(0, 6),
      example: found[0][1].slice(0, 90),
    });
  }
}

// Output.
const order = [
  'missingFile',
  'missingKey',
  'empty',
  'placeholderText',
  'nameOverride',
  'typeMismatch',
  'lengthMismatch',
  'sameAsEnglish',
  'extraKey',
  'extraFile',
  'messages:missingFile',
  'messages:missingKey',
  'messages:empty',
  'messages:sameAsEnglish',
  'messages:placeholder',
  'messages:extraKey',
];
for (const loc of LOCALES) {
  const r = report[loc] || {};
  const total = Object.values(r).reduce((a, k) => a + k.n, 0);
  console.log(`\n${loc.padEnd(8)} ${total} findings`);
  for (const k of order) {
    if (!r[k]) continue;
    console.log(`  ${String(r[k].n).padStart(5)}  ${k}`);
    for (const e of r[k].ex) console.log(`           e.g. ${e}`);
  }
}
console.log('\nsameAsEnglish by field (all locales):');
for (const [f, n] of Object.entries(sameByField).sort((a, b) => b[1] - a[1]))
  console.log(`  ${String(n).padStart(5)}  ${f}`);
console.log(
  `\nBase data with English prose and no en-US overlay of the same name: ${base.length} files`,
);
for (const b of base)
  console.log(
    `  ${String(b.strings).padStart(5)}  ${b.file}  keys: ${b.keys.join(', ')}\n         e.g. ${b.example}`,
  );
if (args.json)
  fs.writeFileSync(String(args.json), JSON.stringify({ report, sameByField, base }, null, 1));
