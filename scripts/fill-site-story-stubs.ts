/**
 * Fill missing site-story stub files (#42 e2e fix).
 *
 * `getSiteStory(siteId, locale)` fetches `data/site-stories/${siteId}.json`
 * and falls back to null on 404 — the panel's STORY tab is correctly
 * hidden when null. But the server-side SvelteKit `respond()` logs
 * each 404 as a `SvelteKitError: Not found` line, polluting CI logs
 * and slowing mobile init under cumulative network noise.
 *
 * Fix: for every moon/mars site without a curated story, write a
 * file containing literal `null`. JSON-parses to JS null, which
 * `getSiteStory`'s `if (!base) return null` handles gracefully. Tab
 * stays hidden; no real story is invented. Future curation
 * overwrites the null with real content.
 *
 * Idempotent: existing story files (real content) are NOT touched.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const STORIES = join(ROOT, 'static/data/site-stories');

type Site = { id: string };
const moonSites = JSON.parse(
  readFileSync(join(ROOT, 'static/data/moon-sites.json'), 'utf-8'),
) as Site[];
const marsSites = JSON.parse(
  readFileSync(join(ROOT, 'static/data/mars-sites.json'), 'utf-8'),
) as Site[];

const allIds = [...moonSites, ...marsSites].map((s) => s.id).sort();

let created = 0;
let skipped = 0;
for (const id of allIds) {
  const file = join(STORIES, `${id}.json`);
  if (existsSync(file)) {
    skipped += 1;
    continue;
  }
  writeFileSync(file, 'null\n');
  created += 1;
}

console.log(`Total surface sites (moon + mars): ${allIds.length}`);
console.log(`Created: ${created} null-stub site-story file(s)`);
console.log(`Skipped: ${skipped} existing file(s) (curated stories preserved)`);
