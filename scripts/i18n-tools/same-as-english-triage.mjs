/**
 * Sort i18n-coverage-scan's `sameAsEnglish` fields into names that stay English
 * (Ariane 1, Gagarin, Westerlund 2 — the origin-language rule keeps a vehicle or a
 * person in English outside its origin locale) and fields that carry an ordinary English
 * word a reader of the locale should get in their language (Mars 2 Orbiter, Pale Blue Dot,
 * James Webb Space Telescope). Only the second list is work.
 *
 *   node scripts/i18n-coverage-scan.mjs --json=/tmp/cov.json --examples=1000
 *   node scripts/i18n-tools/same-as-english-triage.mjs /tmp/cov.json [locale] [--list]
 *
 * Read-only. Prints per-locale counts; --list prints the TRANSLATE fields.
 */
import { readFileSync, readdirSync } from 'node:fs';

const [covPath, onlyLoc] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const LIST = process.argv.includes('--list');
if (!covPath) throw new Error('usage: same-as-english-triage.mjs <cov.json> [locale] [--list]');

// Ordinary English words that have a translation in every locale. A field that is only
// proper nouns, designations and numbers stays English; one with any of these does not.
const COMMON = new RegExp(
  `\\b(${[
    'space telescope',
    'telescope',
    'observatory',
    'orbiter',
    'lander',
    'rover',
    'probe',
    'station',
    'module',
    'capsule',
    'vehicle',
    'roving',
    'lunar',
    'solar',
    'polar',
    'gamma ray',
    'automated transfer',
    'sample return',
    'space shuttle',
    'shuttle',
    'museum',
    'center',
    'centre',
    'array',
    'dot',
    'pale',
    'blue',
    'asteroid',
    'comet',
    'history',
    'launch',
    'flight',
    'mission',
    'exploration',
    'program',
    'and',
    'the',
    'of',
  ].join('|')})\\b`,
  'i',
);

// English names of fleet entries and missions: a field that is exactly one of these is a
// name the origin-language rule keeps in English (unless the locale's fleet page names it
// otherwise — original-work-fleet-names.mjs --sync-english handles that).
const NAMES = new Set();
const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${d}/${e.name}`) : e.name.endsWith('.json') ? [`${d}/${e.name}`] : [],
  );
for (const f of [...walk('static/data/fleet'), ...walk('static/data/missions')]) {
  const n = JSON.parse(readFileSync(f, 'utf8')).name;
  if (typeof n === 'string') NAMES.add(n);
}

// Read and kept as English on 2026-11-04 (locale → texts): observatory and museum names;
// "Pale Blue Dot" where the language's own press keeps the title; words the language
// writes the same (de Asteroid, it/nl orbiter + lander). Add a line when you review one.
const REVIEWED = {
  '*': [
    'FAST (Five-hundred-meter Aperture Spherical Telescope)',
    'Atacama Large Millimeter/submillimeter Array (ALMA)',
    'Tsiolkovsky State Museum of the History of Cosmonautics',
    'National Air and Space Museum',
  ],
  de: ['Pale Blue Dot', 'Asteroid Šteins'],
  fr: ['Pale Blue Dot'],
  it: ['Pale Blue Dot', '3527 kg (orbiter + lander)'],
  nl: ['Pale Blue Dot', '3527 kg (orbiter + lander)'],
};
const reviewed = (loc, text) =>
  REVIEWED['*'].includes(text) || (REVIEWED[loc] ?? []).includes(text);

const cov = JSON.parse(readFileSync(covPath, 'utf8'));
const out = {};
for (const [loc, r] of Object.entries(cov.report)) {
  if (onlyLoc && loc !== onlyLoc) continue;
  const ex = r.sameAsEnglish?.ex ?? [];
  if (r.sameAsEnglish && ex.length < r.sameAsEnglish.n)
    console.warn(
      `${loc}: only ${ex.length} of ${r.sameAsEnglish.n} examples — re-run the scan with --examples=1000`,
    );
  const translate = [];
  let keep = 0;
  for (const e of ex) {
    const text = e.split(' — ').slice(1).join(' — ');
    if (COMMON.test(text) && !NAMES.has(text) && !reviewed(loc, text)) translate.push(e);
    else keep++;
  }
  out[loc] = { keep, translate: translate.length };
  if (LIST) for (const t of translate) console.log(`${loc}\t${t}`);
}
console.log(out);
