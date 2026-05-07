/**
 * For each JSON under static/data/i18n/<locale>/ that exists in en-US,
 * copy events[].type and links[].t from en-US when those arrays exist.
 *
 * Run: node scripts/wave23/sync-i18n-enums-from-en-us.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const EN = path.resolve('static/data/i18n/en-US');
const LOCALES = ['zh-CN', 'ja', 'ko', 'hi', 'ar', 'ru'];

/** @param {unknown} v */
function isObj(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** @param {unknown} events */
function syncEventTypes(events, enEvents) {
  if (!Array.isArray(events) || !Array.isArray(enEvents)) return;
  const n = Math.min(events.length, enEvents.length);
  for (let i = 0; i < n; i++) {
    const e = events[i];
    const ee = enEvents[i];
    if (isObj(e) && isObj(ee) && 'type' in ee) {
      /** @type {Record<string, unknown>} */ (e).type = ee.type;
    }
  }
}

/** @param {unknown} links */
function syncLinkT(links, enLinks) {
  if (!Array.isArray(links) || !Array.isArray(enLinks)) return;
  const n = Math.min(links.length, enLinks.length);
  for (let i = 0; i < n; i++) {
    const e = links[i];
    const ee = enLinks[i];
    if (isObj(e) && isObj(ee) && 't' in ee) {
      /** @type {Record<string, unknown>} */ (e).t = ee.t;
    }
  }
}

/** @param {string} rel */
function patchLocale(locale, rel) {
  const enPath = path.join(EN, rel);
  const locPath = path.resolve('static/data/i18n', locale, rel);
  if (!fs.existsSync(enPath) || !fs.existsSync(locPath)) return;
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const loc = JSON.parse(fs.readFileSync(locPath, 'utf8'));
  if (!isObj(en) || !isObj(loc)) return;
  const enO = /** @type {Record<string, unknown>} */ (en);
  const locO = /** @type {Record<string, unknown>} */ (loc);
  if ('events' in enO && 'events' in locO) syncEventTypes(locO.events, enO.events);
  if ('links' in enO && 'links' in locO) syncLinkT(locO.links, enO.links);
  fs.writeFileSync(locPath, JSON.stringify(loc, null, 2) + '\n', 'utf8');
}

function walkRel(dir, base = '') {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    const rel = base ? `${base}/${ent.name}` : ent.name;
    if (ent.isDirectory()) out.push(...walkRel(p, rel));
    else if (ent.name.endsWith('.json')) out.push(rel);
  }
  return out;
}

const rels = walkRel(EN).sort();
for (const locale of LOCALES) {
  for (const rel of rels) patchLocale(locale, rel);
}
console.error(`Synced enums for ${LOCALES.join(', ')} (${rels.length} files each)`);
