/**
 * Merge missing Paraglide keys from messages/en-US.json into each locale file.
 * Translations live in scripts/paraglide-key-overrides.json (locale → key → string).
 *
 * Run: node scripts/paraglide-add-keys.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MESSAGES = path.join(ROOT, 'messages');
const EN_PATH = path.join(MESSAGES, 'en-US.json');
const OVERRIDES_PATH = path.join(import.meta.dirname, 'paraglide-key-overrides.json');

const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
const overrides = JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));

for (const fname of fs.readdirSync(MESSAGES).filter((f) => f.endsWith('.json'))) {
  if (fname === 'en-US.json') continue;
  const tag = fname.replace(/\.json$/, '');
  const p = path.join(MESSAGES, fname);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  const localeMap = overrides[tag] ?? {};
  let added = 0;
  /** @type {Record<string, unknown>} */
  const next = { ...data };
  for (const key of Object.keys(en)) {
    if (key === '$schema') continue;
    if (key in next) continue;
    next[key] = localeMap[key] ?? en[key];
    added++;
  }
  fs.writeFileSync(p, JSON.stringify(next, null, 2) + '\n', 'utf8');
  console.error(`${fname}: inserted ${added} missing keys`);
}
