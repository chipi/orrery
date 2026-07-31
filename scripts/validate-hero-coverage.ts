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

// psyche-mission + psyche-spacecraft: Psyche launched 2023-10-13 but
// won't arrive at the asteroid until 2029-08. Cruise-phase imagery
// from the live mission is not yet at the "iconic moment" standard
// used elsewhere (the iconic shot is reserved for Psyche orbit
// insertion). Re-evaluate when JPL releases approach + OI imagery.
//
// parker-solar-probe + solar-orbiter: Sun-grazing/Sun-imaging missions
// where the iconic moment is the corona-entry / polar-imaging beat,
// rendered procedurally on /fly rather than represented by a hero
// photograph. Spacecraft cruise imagery is documented in the source
// links; reserve the gallery slot for science returns (PSP corona
// imagery, SolO polar EUV / PHI magnetograms) when JHU APL + ESA
// PHI consortium release high-resolution public-domain versions.
// Phase 22 (#342) cleared all 6 prior mission KNOWN_GAPS by sourcing
// Wikimedia Commons heroes for Pluto + 6 spacecraft (Parker Solar
// Probe, Solar Orbiter, Lucy, Europa Clipper, Psyche, Hayabusa 1).
// The 7 fleet-galleries / planets hero files live on disk + the
// runtime gallery loader's cross-surface fallback now resolves the
// mission-side IDs.
const MISSIONS_KNOWN_GAPS = new Set<string>([]);
// PRD-032 engine category — heroes pending curated imagery (Slice 3). Cleared
// per-id as fleet-galleries images land; do NOT leave populated once sourced.
const FLEET_KNOWN_GAPS = new Set<string>([
  'ce-20',
  'f-1',
  'h-1',
  'hm7b',
  'j-2',
  'le-5b',
  'le-7a',
  'le-9',
  'lr87',
  'merlin-1d',
  'raptor',
  'rd-107-108',
  'rd-180',
  'rd-253',
  'rl10',
  'rocketdyne-a7',
  'rs-25',
  'vikas',
  'viking',
  'vulcain-2',
  'yf-100',
  'yf-77',
]);
const MOON_SITES_KNOWN_GAPS = new Set<string>([]);
const MARS_SITES_KNOWN_GAPS = new Set<string>([]);
const EARTH_OBJECTS_KNOWN_GAPS = new Set<string>([]);
// Phase 22 (#342) sourced the Pluto hero from Wikimedia Commons
// (New Horizons "Nh-pluto-in-true-color_2x_JPEG.jpg" — NASA / JHU
// APL / SwRI). Set kept empty for future planet additions.
const PLANETS_KNOWN_GAPS = new Set<string>([]);

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
  {
    // planets surface was previously invisible to this validator; Phase
    // 21 (#342) added it after the audit caught Pluto as a zero-image
    // entry. planets.json is shaped {constants, planets: [...]}, with
    // entries keyed by `name` not `id` — the extractor slugifies the
    // name to match the disk path (static/images/planets/<name-lower>/).
    label: 'planets',
    indexPath: 'static/data/planets.json',
    extractIds: (j) => {
      const obj = j as { planets: Array<{ name: string }> };
      return obj.planets.map((p) => p.name.toLowerCase());
    },
    imageDir: 'planets',
    knownGaps: PLANETS_KNOWN_GAPS,
  },
];

interface Gap {
  surface: string;
  id: string;
  expectedPath: string;
}

/**
 * Surface fallback ladder mirroring the runtime gallery loaders in
 * src/lib/data.ts. When a copy-surface (earth-objects / moon-sites /
 * mars-sites) doesn't have its own hero, the loader falls through to
 * the mission gallery (and then to fleet for moon/mars sites). The
 * validator follows the same ladder so a Cat 1A byte-dedup pass that
 * dropped redundant on-disk copies doesn't flag the entity as a gap.
 */
const FALLBACK_LADDER: Record<string, string[]> = {
  'earth-objects': ['missions', 'fleet-galleries'],
  'moon-sites': ['missions', 'fleet-galleries'],
  'mars-sites': ['missions', 'fleet-galleries'],
  // Missions whose iconic imagery already lives in the surface-site
  // gallery (e.g. Mars rovers/landers/orbiters whose hero is the
  // surface site itself — Spirit's Gusev pan, Phoenix's polar ice)
  // or in the fleet spacecraft gallery (e.g. Magellan, Akatsuki —
  // single-spacecraft Venus orbiters where the fleet hero IS the
  // mission hero) resolve via the surface/fleet gallery rather than
  // duplicating bytes. Symmetric with the surface → missions ladder.
  missions: ['mars-sites', 'moon-sites', 'fleet-galleries'],
};

function heroExistsOnAnyFallback(imageDir: string, id: string): boolean {
  const direct = `static/images/${imageDir}/${id}/01.webp`;
  if (existsSync(resolve(ROOT, direct))) return true;
  const ladder = FALLBACK_LADDER[imageDir] ?? [];
  for (const fb of ladder) {
    if (existsSync(resolve(ROOT, `static/images/${fb}/${id}/01.webp`))) return true;
  }
  return false;
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
    if (!heroExistsOnAnyFallback(spec.imageDir, id)) {
      const expectedPath = `static/images/${spec.imageDir}/${id}/01.webp`;
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
