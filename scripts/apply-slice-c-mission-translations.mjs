#!/usr/bin/env node
// Apply Slice C mission translations. mariner10 → mercury/, otv-* → earth/.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const T = JSON.parse(readFileSync('/tmp/slice-c-translations.json', 'utf8'));
const DEST = (id) => (id === 'mariner10' ? 'mercury' : 'earth');

let written = 0;
for (const [id, byLocale] of Object.entries(T)) {
  const dest = DEST(id);
  const enPath = `static/data/i18n/en-US/missions/${dest}/${id}.json`;
  const enBase = existsSync(enPath) ? JSON.parse(readFileSync(enPath, 'utf8')) : {};
  for (const [locale, fields] of Object.entries(byLocale)) {
    const dir = `static/data/i18n/${locale}/missions/${dest}`;
    mkdirSync(dir, { recursive: true });
    const target = `${dir}/${id}.json`;
    const merged = { ...enBase, ...fields };
    writeFileSync(target, JSON.stringify(merged, null, 2) + '\n');
    written++;
  }
}
console.log(`wrote ${written} mission overlay files`);
