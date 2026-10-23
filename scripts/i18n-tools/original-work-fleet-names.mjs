/**
 * Fill /colophon cutaway titles (i18n-src/<locale>/original-work.json, sections
 * anatomy_art + exploded_art) for entries that have none yet, from the fleet
 * entry's own localized name (i18n-src/<locale>/fleet/<category>/<id>.json `name`),
 * so the colophon uses the same name per language as /fleet. No fleet overlay
 * name → the English fleet name. Never overwrites an existing title.
 *
 *   node scripts/i18n-tools/original-work-fleet-names.mjs
 *
 * Run after scripts/build-original-work.mjs.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const SECTIONS = { anatomy_art: '/images/anatomy/', exploded_art: '/images/anatomy-exploded/' };
const manifest = JSON.parse(readFileSync('static/data/original-work.json', 'utf8'));
const locales = readdirSync('i18n-src').filter(
  (l) => l !== 'en-US' && existsSync(`i18n-src/${l}/original-work.json`),
);
const key = (file) => file.replace(/\./g, '_');

let added = 0;
for (const loc of locales) {
  const fleetDir = `i18n-src/${loc}/fleet`;
  const fleetName = {};
  if (existsSync(fleetDir))
    for (const cat of readdirSync(fleetDir))
      for (const f of readdirSync(`${fleetDir}/${cat}`).filter((x) => x.endsWith('.json'))) {
        const n = JSON.parse(readFileSync(`${fleetDir}/${cat}/${f}`, 'utf8')).name;
        if (typeof n === 'string' && n) fleetName[f.replace(/\.json$/, '')] = n;
      }
  const path = `i18n-src/${loc}/original-work.json`;
  const overlay = JSON.parse(readFileSync(path, 'utf8'));
  for (const [section, prefix] of Object.entries(SECTIONS)) {
    for (const e of manifest[section] ?? []) {
      const k = key(e.file);
      overlay[section] ??= {};
      if (overlay[section][k]?.title) continue;
      const id = e.file.slice(prefix.length).replace(/\.webp$/, '');
      overlay[section][k] = { ...overlay[section][k], title: fleetName[id] ?? e.title };
      added++;
    }
  }
  writeFileSync(path, JSON.stringify(overlay, null, 2) + '\n');
}
console.log(`original-work titles added: ${added} across ${locales.length} locales`);
