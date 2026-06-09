#!/usr/bin/env node
// Apply mission translations from /tmp/slice-a-translations.json to
// static/data/i18n/<locale>/missions/earth/<id>.json. en-US already exists
// (overlay was created when the mission JSON was built); this script only
// writes the 13 non-English locales.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const T = JSON.parse(readFileSync('/tmp/slice-a-translations.json', 'utf8'));
const DEST = 'earth';

let written = 0;
for (const [id, byLocale] of Object.entries(T)) {
  // pull en-US base for events/extras we want to preserve on each locale
  const enPath = `static/data/i18n/en-US/missions/${DEST}/${id}.json`;
  const enBase = existsSync(enPath) ? JSON.parse(readFileSync(enPath, 'utf8')) : {};
  for (const [locale, fields] of Object.entries(byLocale)) {
    const dir = `static/data/i18n/${locale}/missions/${DEST}`;
    mkdirSync(dir, { recursive: true });
    const dest = `${dir}/${id}.json`;
    const merged = { ...enBase, ...fields };
    writeFileSync(dest, JSON.stringify(merged, null, 2) + '\n');
    written++;
  }
}
console.log(`wrote ${written} mission overlay files`);
