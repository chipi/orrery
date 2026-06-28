#!/usr/bin/env node
// Apply fleet translations from /tmp/slice-a-fleet-translations.json to
// static/data/i18n/<locale>/fleet/<category>/<id>.json.
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const T = JSON.parse(readFileSync('/tmp/slice-a-fleet-translations.json', 'utf8'));
const CATEGORY = {
  'vostok-k': 'launcher',
  'voskhod-11a57': 'launcher',
  'gagarins-start': 'launch-site',
  'apollo-csm-block-i': 'crewed-spacecraft',
};

let written = 0;
for (const [id, byLocale] of Object.entries(T)) {
  const cat = CATEGORY[id];
  if (!cat) {
    console.warn(`! no category for ${id}`);
    continue;
  }
  for (const [locale, fields] of Object.entries(byLocale)) {
    const dir = `static/data/i18n/${locale}/fleet/${cat}`;
    mkdirSync(dir, { recursive: true });
    const dest = `${dir}/${id}.json`;
    // Localised name only when the agent provided one; otherwise fall back to base.
    const out = fields.name ? { name: fields.name, ...fields } : { ...fields };
    delete out.name_unused;
    writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
    written++;
  }
}
console.log(`wrote ${written} fleet overlay files`);
