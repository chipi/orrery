/**
 * Build `static/data/site-stories/index.json` from the file listing.
 *
 * The site-story loader (`getSiteStory` in src/lib/data.ts) probes
 * this index before fetching `site-stories/<id>.json` so launch
 * sites without an editorial story don't trigger a speculative 404
 * fetch (2026-06-15 user report: console noise on /earth launch-site
 * browsing — wenchang-lc-101, xichang-lc-2, taiyuan-lc-9,
 * jiuquan-slc-43, etc., none of which have stories yet).
 *
 * Idempotent — re-running rewrites the JSON only if the id list
 * changed, so adding `npm run build-site-stories-index` to the
 * preflight chain stays no-op until someone authors a new story.
 *
 * Run: `tsx scripts/build-site-stories-index.ts`
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'static/data/site-stories';
const OUT = join(DIR, 'index.json');

const ids = readdirSync(DIR)
  .filter((f) => f.endsWith('.json') && f !== 'index.json')
  .map((f) => f.replace(/\.json$/, ''))
  .sort();

const existing = (() => {
  try {
    return JSON.parse(readFileSync(OUT, 'utf-8')) as { ids: string[] };
  } catch {
    return null;
  }
})();

if (existing && JSON.stringify(existing.ids) === JSON.stringify(ids)) {
  console.log(`[site-stories-index] up-to-date (${ids.length} stories)`);
  process.exit(0);
}

writeFileSync(OUT, JSON.stringify({ ids }, null, 2) + '\n');
console.log(`[site-stories-index] wrote ${ids.length} ids`);
