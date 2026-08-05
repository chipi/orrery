/**
 * Stamp a /science section as review-current (companion to the review-freshness
 * gate in validate-data.ts). After a section's editorial content passes the
 * `science-reviewer` and any findings are applied, run this to write
 * `reviewed_at` (today) + `review_hash` (hash of the en-US editorial prose) into
 * the base record. The gate then stays green until the content next drifts.
 *
 *   npm run stamp-science-review -- <section-id> [<section-id> ...]
 *   npm run stamp-science-review -- --all      # stamp every section
 *
 * Stamping asserts the content is reviewed-correct NOW — do not --all blindly
 * past known-open findings (see docs/wip/factcheck/INDEX.md).
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { scienceReviewHash } from './validate-data-helpers.js';

const DATA_ROOT = 'static/data';
const SCIENCE_DIR = join(DATA_ROOT, 'science');
const I18N_SRC = 'i18n-src';

type BaseSection = {
  id: string;
  reviewed_at?: string;
  review_hash?: string;
  [k: string]: unknown;
};

/** Map every section id → { tab, basePath }. */
function indexSections(): Map<string, { tab: string; basePath: string }> {
  const map = new Map<string, { tab: string; basePath: string }>();
  for (const tab of readdirSync(SCIENCE_DIR)) {
    const tabDir = join(SCIENCE_DIR, tab);
    if (!statSync(tabDir).isDirectory()) continue;
    for (const name of readdirSync(tabDir)) {
      if (!name.endsWith('.json') || name.endsWith('_index.json')) continue;
      const basePath = join(tabDir, name);
      const base = JSON.parse(readFileSync(basePath, 'utf8')) as BaseSection;
      if (base.id) map.set(base.id, { tab, basePath });
    }
  }
  return map;
}

function stamp(id: string, loc: { tab: string; basePath: string }, today: string): boolean {
  const overlayPath = join(I18N_SRC, 'en-US', 'science', loc.tab, `${id}.json`);
  if (!existsSync(overlayPath)) {
    console.error(`  ✗ ${id}: no en-US overlay at ${overlayPath}`);
    return false;
  }
  const overlay = JSON.parse(readFileSync(overlayPath, 'utf8'));
  const base = JSON.parse(readFileSync(loc.basePath, 'utf8')) as BaseSection;
  base.reviewed_at = today;
  base.review_hash = scienceReviewHash(overlay);
  writeFileSync(loc.basePath, JSON.stringify(base, null, 2) + '\n', 'utf8');
  console.log(`  ✓ ${id}: reviewed_at=${today} review_hash=${base.review_hash}`);
  return true;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('usage: npm run stamp-science-review -- <section-id> [...] | --all');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const index = indexSections();
const targets = args.includes('--all') ? [...index.keys()] : args;

let ok = 0;
let bad = 0;
for (const id of targets) {
  const loc = index.get(id);
  if (!loc) {
    console.error(`  ✗ ${id}: no science section with this id`);
    bad += 1;
    continue;
  }
  if (stamp(id, loc, today)) ok += 1;
  else bad += 1;
}
console.log(`Stamped ${ok} section(s)${bad > 0 ? `, ${bad} failed` : ''}.`);
process.exit(bad > 0 ? 1 : 0);
