#!/usr/bin/env node
/**
 * Seed empty per-locale satellite overlay files. The English base
 * content lives in static/data/satellites.json; the overlay files
 * in static/data/i18n/<locale>/satellites/<id>.json are loaded by
 * SatellitePanel and merged on top — missing fields fall back to
 * English. This script creates the file scaffold (one JSON per
 * satellite × per locale, all with empty overlay objects) so the
 * wave23 translation pipeline has a target file structure to fill.
 *
 * Run from project root:  node scripts/seed-satellite-i18n.mjs
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const SATS_JSON = join(ROOT, 'static', 'data', 'satellites.json');
const I18N_ROOT = join(ROOT, 'static', 'data', 'i18n');

const LOCALES = [
  'ar',
  'de',
  'en-US',
  'es',
  'fr',
  'hi',
  'it',
  'ja',
  'ko',
  'nl',
  'pt-BR',
  'ru',
  'sr-Cyrl',
  'zh-CN',
];

const sats = JSON.parse(await readFile(SATS_JSON, 'utf-8')).satellites;

let created = 0;
let skipped = 0;
for (const loc of LOCALES) {
  const dir = join(I18N_ROOT, loc, 'satellites');
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  for (const s of sats) {
    const file = join(dir, `${s.id}.json`);
    if (existsSync(file)) {
      skipped++;
      continue;
    }
    // For en-US, embed the English content as a passthrough so the
    // overlay actually does something useful. Other locales get an
    // empty {} — wave23 translation fills these in a later pass.
    const payload =
      loc === 'en-US'
        ? {
            description: s.description,
            surface_composition: s.surface_composition,
            mission_visits: s.mission_visits,
            library_labels: Object.fromEntries((s.library ?? []).map((l) => [l.id, l.label])),
          }
        : {};
    await writeFile(file, JSON.stringify(payload, null, 2) + '\n');
    created++;
  }
}
console.log(`Created ${created} overlay files; skipped ${skipped} existing.`);
