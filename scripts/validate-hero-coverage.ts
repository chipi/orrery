#!/usr/bin/env tsx
/**
 * Hero-coverage validator (#5 / image-rework baseline gate).
 *
 * Walks every entity index that maps to a detail-panel surface with a
 * hero+gallery image pattern, and verifies that the conventional hero
 * file (`static/images/<surface>/<id>/01.jpg`) exists on disk.
 *
 * Fails the build for any unexpected gap. Known gaps that pre-date this
 * validator are listed explicitly in `KNOWN_HERO_GAPS` per surface so
 * the build stays green during the rework period but the gaps stay
 * tracked + visible. New additions to those allowlists need an
 * accompanying real-image fetch in the same change.
 *
 * Wired into `npm run validate-data` so it runs in preflight + CI.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

interface SurfaceSpec {
  /** Display name for log output. */
  label: string;
  /** Path to the index JSON, relative to repo root. */
  indexPath: string;
  /**
   * Function that walks the JSON and yields entity IDs. Each surface
   * has a slightly different index shape; one extractor per surface
   * keeps the validator linear.
   */
  extractIds: (json: unknown) => string[];
  /** Image-tree directory under `static/images/`. Hero is `<dir>/<id>/01.jpg`. */
  imageDir: string;
  /**
   * Pre-existing gaps that this validator is NOT going to fail on
   * (data hygiene known-bad). New IDs must NOT be added here without
   * sourcing the image as well.
   */
  knownGaps: ReadonlySet<string>;
}

// Pre-existing gaps that pre-date the #5 image rework. Sourcing
// tracked in docs/provenance/image-hero-inventory.md "Known gaps" section.
// New IDs must NOT be added here without sourcing the image as well —
// the validator failing is the gate. Allowlist exists ONLY to capture
// the baseline that existed when the validator landed.

// #5 Phase 4 sourced 57 of the original 58 gaps via Wikimedia Commons
// (Special:FilePath + search-API fallback) and copyFrom-mission for the
// 5 lunar/earth surfaces whose mission gallery already shipped. See
// `docs/provenance/source-known-gaps-report.md` for the per-ID title.

const MISSIONS_KNOWN_GAPS = new Set<string>([]);
const FLEET_KNOWN_GAPS = new Set<string>([]);
const MOON_SITES_KNOWN_GAPS = new Set<string>([]);
const MARS_SITES_KNOWN_GAPS = new Set<string>([]);
const EARTH_OBJECTS_KNOWN_GAPS = new Set<string>([
  // Commons search returned no usable raster file for "Molniya orbit
  // diagram.jpg" or fallback queries. Tracked for re-curation; see
  // post-332-orphan-status.md.
  'tundra-molniya',
]);

const SURFACES: SurfaceSpec[] = [
  {
    label: 'missions',
    indexPath: 'static/data/missions/index.json',
    extractIds: (j) => (j as Array<{ id: string }>).map((e) => e.id),
    imageDir: 'missions',
    knownGaps: MISSIONS_KNOWN_GAPS,
  },
  {
    label: 'fleet',
    indexPath: 'static/data/fleet/index.json',
    extractIds: (j) => (j as Array<{ id: string }>).map((e) => e.id),
    imageDir: 'fleet-galleries',
    knownGaps: FLEET_KNOWN_GAPS,
  },
  {
    label: 'moon-sites',
    indexPath: 'static/data/moon-sites.json',
    extractIds: (j) => (j as Array<{ id: string }>).map((e) => e.id),
    imageDir: 'moon-sites',
    knownGaps: MOON_SITES_KNOWN_GAPS,
  },
  {
    label: 'mars-sites',
    indexPath: 'static/data/mars-sites.json',
    extractIds: (j) => (j as Array<{ id: string }>).map((e) => e.id),
    imageDir: 'mars-sites',
    knownGaps: MARS_SITES_KNOWN_GAPS,
  },
  {
    label: 'earth-objects',
    indexPath: 'static/data/earth-objects.json',
    extractIds: (j) => (j as Array<{ id: string }>).map((e) => e.id),
    imageDir: 'earth-objects',
    knownGaps: EARTH_OBJECTS_KNOWN_GAPS,
  },
];

interface Gap {
  surface: string;
  id: string;
  expectedPath: string;
}

function validateSurface(spec: SurfaceSpec): Gap[] {
  const fullIndexPath = resolve(ROOT, spec.indexPath);
  if (!existsSync(fullIndexPath)) {
    console.warn(`⚠ ${spec.label}: index missing at ${spec.indexPath}; skipping`);
    return [];
  }
  const json: unknown = JSON.parse(readFileSync(fullIndexPath, 'utf-8'));
  const ids = spec.extractIds(json);
  const gaps: Gap[] = [];
  for (const id of ids) {
    if (spec.knownGaps.has(id)) continue;
    const expectedPath = `static/images/${spec.imageDir}/${id}/01.jpg`;
    if (!existsSync(resolve(ROOT, expectedPath))) {
      gaps.push({ surface: spec.label, id, expectedPath: `/${expectedPath}` });
    }
  }
  return gaps;
}

function main(): void {
  console.log('Hero-coverage validator — checking every surface…');
  let totalGaps = 0;
  const allGaps: Gap[] = [];
  for (const spec of SURFACES) {
    const gaps = validateSurface(spec);
    const knownGapCount = spec.knownGaps.size;
    const total = (() => {
      const fullIndexPath = resolve(ROOT, spec.indexPath);
      if (!existsSync(fullIndexPath)) return 0;
      return spec.extractIds(JSON.parse(readFileSync(fullIndexPath, 'utf-8'))).length;
    })();
    const okCount = total - gaps.length - knownGapCount;
    console.log(
      `  ${spec.label.padEnd(16)} ✓ ${okCount} ok · ⏭ ${knownGapCount} known-gap · ` +
        `${gaps.length > 0 ? `✘ ${gaps.length} UNEXPECTED` : '✘ 0'}`,
    );
    totalGaps += gaps.length;
    allGaps.push(...gaps);
  }
  if (totalGaps > 0) {
    console.error('\n✘ Unexpected hero gaps (not in knownGaps allowlist):');
    for (const g of allGaps) {
      console.error(`  - ${g.surface}/${g.id} expected at ${g.expectedPath}`);
    }
    console.error('\nEither:');
    console.error('  1. Source the image (preferred — fetch + crop variants), OR');
    console.error('  2. Add the id to KNOWN_HERO_GAPS in scripts/validate-hero-coverage.ts');
    console.error('     with a docs/provenance/image-hero-inventory.md entry explaining why');
    process.exit(1);
  }
  console.log('\n✓ All surfaces clean (no unexpected hero gaps).');
}

main();
