// Edits whose new text is over the length the data schema allows (maxLength is read from
// static/data/schemas/*.schema.json, not copied here), written for a shortening round.
//   node scripts/i18n-tools/schema-caps.mjs <edits.json> <work.json> [--out=over-cap.json]
// Capped fields: science-section-overlay intro_sentence, science-tab-intro headline,
// fleet-overlay tagline, mission events[].label. Lengths are code points, as the schema counts.
// --out defaults to over-cap.json beside the edits: [{rel, at, cap, len, en, new}].
// Prints per field the count over and the longest.
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  cpLen,
  enByKey,
  isMain,
  keyOf,
  parseArgs,
  readJson,
  writeJson,
} from './garble-lib.mjs';

const SCHEMAS = path.join(ROOT, 'static/data/schemas');
// field name, the `at` paths it governs, schema file, path to the property inside it
const FIELDS = [
  [
    'intro_sentence',
    /^intro_sentence$/,
    'science-section-overlay',
    ['properties', 'intro_sentence'],
  ],
  ['headline', /^headline$/, 'science-tab-intro', ['properties', 'headline']],
  ['tagline', /^tagline$/, 'fleet-overlay', ['properties', 'tagline']],
  [
    'label',
    /(^|\.)events\.\d+\.label$/,
    'mission',
    ['properties', 'flight', 'properties', 'events', 'items', 'properties', 'label'],
  ],
];

export function loadCaps(dir = SCHEMAS) {
  const caps = [];
  for (const [name, test, schema, at] of FIELDS) {
    const file = path.join(dir, `${schema}.schema.json`);
    if (!fs.existsSync(file)) continue;
    const prop = at.reduce((o, k) => o?.[k], readJson(file));
    if (Number.isInteger(prop?.maxLength)) caps.push({ name, test, cap: prop.maxLength });
  }
  return caps;
}

export function overCap(edits, en, caps = loadCaps()) {
  const over = [];
  for (const e of edits) {
    const c = caps.find((x) => x.test.test(e.at));
    if (!c || cpLen(e.new) <= c.cap) continue;
    over.push({
      rel: e.rel,
      at: e.at,
      cap: c.cap,
      len: cpLen(e.new),
      en: en.get(keyOf(e)) ?? e.en,
      new: e.new,
    });
  }
  return over;
}

if (isMain(import.meta.url)) {
  const { pos, one } = parseArgs(process.argv.slice(2));
  if (pos.length < 2) {
    console.error('usage: schema-caps.mjs <edits.json> <work.json> [--out=over-cap.json]');
    process.exit(2);
  }
  const caps = loadCaps();
  const over = overCap(readJson(pos[0]), enByKey(readJson(pos[1])), caps);
  writeJson(one('out', path.join(path.dirname(pos[0]), 'over-cap.json')), over);
  for (const c of caps) {
    const mine = over.filter((o) => c.test.test(o.at));
    console.log(
      `${c.name} (cap ${c.cap}): ${mine.length} over, max ${Math.max(0, ...mine.map((o) => o.len))}`,
    );
  }
  console.log(`total ${over.length} over`);
}
