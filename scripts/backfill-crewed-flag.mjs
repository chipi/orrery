#!/usr/bin/env node
/**
 * Backfill `crewed: boolean` onto every entry in static/data/missions/index.json.
 *
 * Derivation rule: a mission is crewed if its en-US overlay `type`
 * string contains the word "CREWED" (case-insensitive). The few we
 * haven't tagged that way are caught by a small known-crewed allowlist
 * (mostly historical Apollo / Skylab / Shuttle / Soyuz / ISS visits if
 * any sneak in here).
 *
 * Re-runnable — overwrites the field every time.
 */
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = join(ROOT, 'static', 'data', 'missions', 'index.json');
const I18N_ROOT = join(ROOT, 'static', 'data', 'i18n', 'en-US', 'missions');

// Belt-and-suspenders allowlist for crewed missions that may not say
// "CREWED" in their overlay type (Mercury / Vostok-style cases).
const KNOWN_CREWED = new Set([
  'apollo7',
  'apollo8',
  'apollo9',
  'apollo10',
  'apollo11',
  'apollo12',
  'apollo13',
  'apollo14',
  'apollo15',
  'apollo16',
  'apollo17',
]);

const DEST_TO_DIR = {
  EARTH: 'earth',
  MARS: 'mars',
  MOON: 'moon',
  MERCURY: 'mercury',
  VENUS: 'venus',
  JUPITER: 'jupiter',
  SATURN: 'saturn',
  URANUS: 'uranus',
  NEPTUNE: 'neptune',
  PLUTO: 'pluto',
  CERES: 'ceres',
  COMET: 'comet',
  ASTEROID: 'asteroid',
  SUN: 'sun',
};

async function classifyOne(missionId, dest) {
  if (KNOWN_CREWED.has(missionId)) return true;
  const dir = DEST_TO_DIR[dest];
  if (!dir) return false;
  const path = join(I18N_ROOT, dir, missionId + '.json');
  try {
    const overlay = JSON.parse(await readFile(path, 'utf8'));
    const type = String(overlay.type || '').toUpperCase();
    return type.includes('CREWED');
  } catch {
    return false;
  }
}

async function main() {
  const idx = JSON.parse(await readFile(INDEX, 'utf8'));
  let crewedCount = 0;
  for (const row of idx) {
    const crewed = await classifyOne(row.id, row.dest);
    row.crewed = crewed;
    if (crewed) crewedCount++;
  }
  await writeFile(INDEX, JSON.stringify(idx, null, 2) + '\n');
  console.log('✓ ' + idx.length + ' missions classified — ' + crewedCount + ' crewed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
