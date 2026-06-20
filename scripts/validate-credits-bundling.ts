/**
 * Credits-page bundling validator (Slice A v3 / Stage 1.4).
 *
 * The /credits page collapses image-provenance entries into bundles via
 * `src/lib/credits-grouping.ts`. Tonight's v2 apply exposed two failure
 * modes:
 *
 *  - Walker emitted `image_url: Special:FilePath/undefined` for every
 *    Slice A entry → bundlePhotos collapsed unrelated images into one
 *    bundle keyed off the bogus URL. (Stage 1.1 walker fix prevents this
 *    at the source.)
 *  - `groupBySource` buckets entries by `provenanceSourceId(entry)` THEN
 *    runs `bundlePhotos` per-bucket. So if the same upstream image
 *    appears under different agency/source routings (e.g. Hubble photo
 *    credited to "ESA/Hubble" on one mission and "NASA via Commons" on
 *    another), it splits into two bundles in two source groups — the
 *    public credits page renders the same file twice.
 *
 * This validator:
 *   1. Asserts no Special:FilePath/undefined image_urls survive in the
 *      manifest (defensive cross-check on Stage 1.1).
 *   2. Reports the top-N cross-route bundles (same reliable id appearing
 *      across many distinct paths) so we can eyeball the collapsing.
 *   3. Flags "split bundles" — same reliable id appearing under two or
 *      more source-id routings. These are the bug above; we don't fail
 *      on them yet (lots of legitimate cross-platform sharing) but log
 *      them so we can decide whether to refactor groupBySource to
 *      bundle-first-group-after.
 *
 * Usage:
 *   tsx scripts/validate-credits-bundling.ts
 *   tsx scripts/validate-credits-bundling.ts --top=20 --fail-on-split
 */

import { readFile } from 'node:fs/promises';

type ProvenanceEntry = {
  id: string;
  path: string;
  source_type: string | null;
  agency: string | null;
  image_url: string | null;
  nasa_id: string | null;
  pageid: number | null;
  revid: number | null;
  source_url?: string | null;
};

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.+)$/);
    return m ? [m[1], m[2]] : [a.replace(/^-+/, ''), 'true'];
  }),
);
const TOP = typeof args.top === 'string' ? parseInt(args.top, 10) : 10;
const FAIL_ON_SPLIT = args['fail-on-split'] === 'true';
const MANIFEST =
  typeof args.manifest === 'string' ? args.manifest : 'static/data/image-provenance.json';

function reliableImageId(p: ProvenanceEntry): string | null {
  if (p.image_url) return `image_url|${p.image_url}`;
  if (p.nasa_id) return `nasa_id|${p.nasa_id}`;
  if (p.pageid != null) return `pageid|${p.pageid}`;
  if (p.revid != null) return `revid|${p.revid}`;
  return null;
}

// Mirrors src/lib/credits-grouping.ts:agencyToSourceId + provenanceSourceId.
// Kept in sync manually — if either drifts, this validator's split detection
// becomes inaccurate but is still informative.
function agencyToSourceId(agency: string | null): string | null {
  if (!agency) return null;
  const a = agency.toLowerCase();
  if (a.includes('wikimedia commons contributor')) return null;
  if (a.includes('solar system scope')) return 'solar-system-scope';
  if (a.includes('mbrsc') || a.includes('uae space agency')) return 'uaesa';
  if (a.includes('roscosmos') || a === 'soviet') return 'roscosmos';
  if (a.includes('cnsa')) return 'cnsa';
  if (a.includes('isro')) return 'isro';
  if (a.includes('jaxa')) return 'jaxa';
  if (a.includes('spacex')) return 'spacex';
  if (a.includes('blue origin')) return 'blue-origin';
  if (a.includes('northrop grumman')) return 'northrop-grumman';
  if (a.includes('axiom space')) return 'axiom-space';
  if (a.includes('esa') || a.includes('european space agency')) return 'esa';
  if (a.includes('nasa')) return 'nasa';
  return null;
}

const SOURCE_TYPE_TO_ID: Record<string, string> = {
  'wikimedia-commons': 'wikimedia-commons',
  'nasa-images-api': 'nasa',
  'nasa-image-library': 'nasa',
  'direct-other': 'solar-system-scope',
  esahubble: 'stsci',
  'esa-multimedia': 'esa',
  'sci-esa-int': 'esa',
  'smithsonian-openaccess': 'smithsonian',
  smithsonian: 'smithsonian',
  nara: 'nara',
  jaxa: 'jaxa',
  'europeanspaceagency-flickr': 'esa',
  'roscosmos-flickr': 'roscosmos',
};

function provenanceSourceId(p: ProvenanceEntry): string {
  const first = (p.agency ?? '').split(' / ')[0]?.trim() ?? '';
  return agencyToSourceId(first) ?? SOURCE_TYPE_TO_ID[p.source_type ?? ''] ?? 'wikimedia-commons';
}

async function main(): Promise<void> {
  const raw = await readFile(MANIFEST, 'utf8');
  const parsed = JSON.parse(raw) as { entries?: ProvenanceEntry[] } | ProvenanceEntry[];
  const entries: ProvenanceEntry[] = Array.isArray(parsed) ? parsed : (parsed.entries ?? []);

  console.log(`validate-credits-bundling: ${entries.length} entries from ${MANIFEST}`);

  // 1. Defensive: no Special:FilePath/undefined.
  const undefinedFp = entries.filter(
    (e) => typeof e.image_url === 'string' && e.image_url.includes('Special:FilePath/undefined'),
  );
  if (undefinedFp.length > 0) {
    console.error(`  ✗ ${undefinedFp.length} entries still emit Special:FilePath/undefined`);
    process.exit(1);
  }

  // 2. Group by reliableImageId to identify cross-route reuse.
  const byReliableId = new Map<string, ProvenanceEntry[]>();
  let noReliableId = 0;
  for (const e of entries) {
    const id = reliableImageId(e);
    if (!id) {
      noReliableId++;
      continue;
    }
    let arr = byReliableId.get(id);
    if (!arr) {
      arr = [];
      byReliableId.set(id, arr);
    }
    arr.push(e);
  }
  console.log(
    `  ${byReliableId.size} distinct reliable ids, ${noReliableId} entries with no reliable id (fallback bundling)`,
  );

  // 3. Cross-route bundles — same id appearing in multiple paths.
  const crossRoute = [...byReliableId.entries()]
    .filter(([, ents]) => ents.length > 1)
    .sort((a, b) => b[1].length - a[1].length);
  console.log(`  ${crossRoute.length} cross-route bundles (same image_url across multiple paths)`);
  for (const [id, ents] of crossRoute.slice(0, TOP)) {
    const paths = ents.map((e) => e.path);
    const sources = new Set(ents.map(provenanceSourceId));
    const tag = sources.size > 1 ? `  ⚠ SPLIT across sources ${[...sources].join(',')}` : '';
    console.log(`    ${ents.length}× ${id.slice(0, 80)}${tag}`);
    for (const p of paths.slice(0, 4)) console.log(`        ${p}`);
    if (paths.length > 4) console.log(`        … and ${paths.length - 4} more`);
  }

  // 4. Cross-source bundles — same id routed across multiple source-ids.
  // Under the bundle-first-group-after refactor in credits-grouping.ts these
  // collapse into one bundle routed by the representative; flagging them is
  // editorial (mixed attribution) not a rendering bug.
  const crossSource = crossRoute.filter(
    ([, ents]) => new Set(ents.map(provenanceSourceId)).size > 1,
  );
  console.log(
    `  ${crossSource.length} cross-source bundles (same reliable id, multiple source-ids — bundled together; representative picks the source)`,
  );

  if (FAIL_ON_SPLIT && crossSource.length > 0) {
    console.error(
      'validate-credits-bundling: FAIL (cross-source bundles present and --fail-on-split set)',
    );
    process.exit(1);
  }
  console.log('validate-credits-bundling: OK');
}

main().catch((err) => {
  console.error('validate-credits-bundling: fatal', err);
  process.exit(2);
});
