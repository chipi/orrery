/**
 * audit-image-usage.ts — RFC-029 · the durable "is every shipped image used?" gate.
 *
 * The shipped image tree (`static/images/**`, minus the gitignored `_staging/`
 * ground) is supposed to contain ONLY images that actually render somewhere in
 * the app. `/credits` credits exactly what we ship; we should ship exactly what
 * we display. This script proves that invariant — and fails loudly if a file
 * lands in the shipped tree that nothing references.
 *
 * It is the committed, re-runnable formalisation of the one-off audit run during
 * the RFC-029 migration (which proved 99.7% of the corpus was genuinely used and
 * surfaced 7 true surface-gallery overflow orphans that were then staged out).
 *
 * Classification (variant-aware — a base image being USED covers all its
 * `NN.1x1` / `NN.16x9` / `NN.4x3` crops):
 *
 *   referenced    — an explicit `/images/…` path appears in `static/data/**`
 *                   (display manifests, not the all-path bookkeeping ones) or in
 *                   `src/**` code.
 *   gallery       — `/<cat>/<id>/NN.ext` with NN <= the count in the matching
 *                   `*-galleries.json` count-cap manifest.
 *   hero-override — slot named by a `*-hero-overrides.json` entry.
 *   hero-01       — the `…/01.ext` slot (always the card hero).
 *   body          — a pure planet / sun / small-body / satellite surface.
 *   card          — a one-level `/images/<group>/<file>.ext` card (logos,
 *                   textures, source badges, flat-family covers, heroes).
 *   hotspot       — `/images/hotspots/**` surface-detail tiers (moon/mars geo).
 *
 * Anything left over is UNKNOWN — a candidate orphan. Genuine, intentionally
 * retained exceptions live in ALLOWED_ORPHANS below with a reason.
 *
 * Run: `npm run audit:images`  (tsx scripts/audit-image-usage.ts)
 * Exit 0 = clean; exit 1 = unexpected orphan(s) in the shipped tree.
 */

import fs from 'node:fs';
import { posix } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const IMAGES_DIR = `${ROOT}/static/images`;
const DATA_DIR = `${ROOT}/static/data`;

/** Variant suffix on a crop, e.g. `…/02.1x1.jpg`. */
const VARIANT = /\.(16x9|4x3|1x1)(\.(jpe?g|png|webp))$/i;
const toBase = (p: string): string => p.replace(VARIANT, '$2');

/** Count-cap manifests: gallery slot NN is shown iff NN <= count for that id. */
const GALLERY_MANIFESTS: Record<string, string> = {
  'fleet-galleries': 'fleet-galleries.json',
  missions: 'mission-galleries.json',
  'iss-modules': 'iss-galleries.json',
  'tiangong-modules': 'tiangong-galleries.json',
  'mars-sites': 'mars-site-galleries.json',
  'moon-sites': 'moon-site-galleries.json',
  'earth-objects': 'earth-object-galleries.json',
  planets: 'planet-galleries.json',
  'small-bodies': 'small-body-galleries.json',
  satellites: 'satellite-galleries.json',
  belts: 'belt-galleries.json', // path token is the plural dir name `belts/`
};

/**
 * Bookkeeping manifests that list EVERY path (so scanning them would mark
 * everything "referenced" and defeat the audit). Skipped in the reference scan.
 */
const BOOKKEEPING =
  /image-(vision|provenance|curation|phashes|approved)\.json$|image-alt-text|cost-ledger\.json$|-image-sources\.json$|slice-a-.*dryrun\.json$|bodies-salvage|route-patches\.json$/;

/** Intentionally-retained images with no display path. Keep this list tiny. */
const ALLOWED_ORPHANS = new Set<string>([
  // (empty — the RFC-029 migration staged out the 7 true surface overflows)
]);

type Reason = 'referenced' | 'gallery' | 'hero-override' | 'hero-01' | 'body' | 'card' | 'hotspot';

function readJSON<T = unknown>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

/** Collect every `/images/…` path literal that appears in a text blob. */
function harvestRefs(text: string, into: Set<string>): void {
  for (const m of text.matchAll(/\/images\/[A-Za-z0-9._/-]+\.(?:jpe?g|png|webp)/g)) {
    into.add(m[0]);
  }
}

/** Walk a tree, feeding files matched by `accept` into `onFile`. */
function walk(
  dir: string,
  accept: (path: string, name: string) => boolean,
  onFile: (path: string) => void,
): void {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = posix.join(dir, e.name);
    if (e.isDirectory()) {
      if (/node_modules|\.git|build|_staging/.test(e.name)) continue;
      walk(p, accept, onFile);
    } else if (accept(p, e.name)) {
      onFile(p);
    }
  }
}

function main(): number {
  // 1. Build the reference set from display manifests + source code.
  const refs = new Set<string>();
  walk(
    DATA_DIR,
    (p, n) => n.endsWith('.json') && !BOOKKEEPING.test(p),
    (p) => harvestRefs(fs.readFileSync(p, 'utf8'), refs),
  );
  walk(
    `${ROOT}/src`,
    (_p, n) => /\.(svelte|ts|js)$/.test(n),
    (p) => harvestRefs(fs.readFileSync(p, 'utf8'), refs),
  );

  // 2. Gallery count caps + hero-override slots.
  const counts: Record<string, Record<string, number>> = {};
  for (const [cat, file] of Object.entries(GALLERY_MANIFESTS)) {
    const p = `${DATA_DIR}/${file}`;
    if (fs.existsSync(p)) counts[cat] = readJSON<Record<string, number>>(p);
  }
  const heroSlots = new Set<string>();
  for (const f of fs.readdirSync(DATA_DIR)) {
    if (!/-hero-overrides\.json$/.test(f)) continue;
    const o = readJSON<Record<string, { slot?: string }>>(`${DATA_DIR}/${f}`);
    for (const [id, v] of Object.entries(o)) {
      if (v && v.slot) heroSlots.add(`${id}::${v.slot}`);
    }
  }

  // 3. Enumerate the shipped corpus (on-disk, excludes _staging) as web paths.
  const onDisk: string[] = [];
  walk(
    IMAGES_DIR,
    (_p, n) => /\.(jpe?g|png|webp)$/i.test(n),
    (p) => onDisk.push(p.replace(IMAGES_DIR, '/images')),
  );

  // 4. Classify each distinct BASE image (variants inherit their base's verdict).
  const classify = (p: string): Reason | null => {
    if (refs.has(p)) return 'referenced';
    const g = p.match(/^\/images\/([^/]+)\/([^/]+)\/(\d+)\.(jpe?g|png|webp)$/i);
    if (g && counts[g[1]] && parseInt(g[3], 10) <= (counts[g[1]][g[2]] ?? 0)) return 'gallery';
    if (g && heroSlots.has(`${g[2]}::${g[3]}.${g[4]}`)) return 'hero-override';
    if (/\/01\.(jpe?g|png|webp)$/i.test(p)) return 'hero-01';
    // MissionPanel FLIGHT tab builds `…/thumbnails/{mission.id}.png` as a
    // template literal — invisible to the path-literal harvest, but live.
    if (/^\/images\/missions\/thumbnails\/[^/]+\.png$/i.test(p)) return 'referenced';
    if (/^\/images\/hotspots\//.test(p)) return 'hotspot';
    if (/^\/images\/(planets|sun|small-bodies|satellites)\//.test(p)) return 'body';
    if (/^\/images\/[^/]+\/[^/]+\.(jpe?g|png|webp)$/i.test(p)) return 'card';
    return null;
  };

  const bases = [...new Set(onDisk.map(toBase))];
  const tally: Record<string, number> = {};
  const orphans: string[] = [];
  const usedBases = new Set<string>();
  for (const b of bases) {
    const r = classify(b);
    if (r) {
      tally[r] = (tally[r] ?? 0) + 1;
      usedBases.add(b);
    } else if (ALLOWED_ORPHANS.has(b)) {
      usedBases.add(b);
    } else {
      orphans.push(b);
    }
  }

  // Optional: (re)derive the sticky allowlist (RFC-029 decision 4) from this
  // same classifier so image-approved.json is never a hand-frozen snapshot —
  // it's every shipped image the audit certifies as used, variants included.
  if (process.argv.includes('--write-approved')) {
    const approved = onDisk.filter((p) => usedBases.has(toBase(p))).sort();
    const out = {
      version: 1,
      generated_by: 'audit-image-usage.ts --write-approved',
      note: 'Sticky allowlist — source of truth for /credits + provenance, independent of vision scores. RFC-029 decision 4. Re-derive after fetches land; the list only grows (used images are never auto-dropped).',
      count: approved.length,
      approved,
    };
    fs.writeFileSync(`${DATA_DIR}/image-approved.json`, JSON.stringify(out, null, 2) + '\n');
    console.log(`wrote image-approved.json (${approved.length} paths)\n`);
  }

  // 5. Report.
  console.log(`shipped corpus      : ${onDisk.length} files`);
  console.log(
    `distinct base images: ${bases.length} (${onDisk.length - bases.length} variant crops inherit)`,
  );
  for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(5)}  ${k}`);
  }
  if (ALLOWED_ORPHANS.size)
    console.log(`  ${String(ALLOWED_ORPHANS.size).padStart(5)}  allowed-orphan (exempt)`);

  if (orphans.length === 0) {
    console.log('\n✓ every shipped image is used.');
    return 0;
  }

  console.log(`\n✗ ${orphans.length} UNEXPECTED orphan(s) — shipped but nothing displays them:`);
  const byCat: Record<string, number> = {};
  for (const p of orphans) {
    const m = p.match(/^\/images\/([^/]+)/);
    const k = m ? m[1] : '?';
    byCat[k] = (byCat[k] ?? 0) + 1;
  }
  for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(4)}  ${k}`);
  }
  console.log('\nsample:');
  for (const p of orphans.slice(0, 20)) console.log(`   ${p}`);
  console.log('\nResolve each: wire it into a display surface, stage it out to');
  console.log('static/images/_staging/, or add it to ALLOWED_ORPHANS with a reason.');
  return 1;
}

process.exit(main());
