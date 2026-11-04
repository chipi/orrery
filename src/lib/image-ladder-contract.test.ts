import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { srcsetFor, type LadderManifest } from './image-srcset';

/**
 * Contract + invariant guards for the responsive WebP image ladder
 * (RFC-030 / ADR-080 / #383). These lock the *mechanism* and the *assumptions*
 * of the shipped image-delivery epic against silent drift:
 *
 *  - the on-disk manifest (`static/data/image-ladder.json`) matches the real
 *    derived files (`build-display-ladder.mjs` is a manual step, so nothing
 *    re-derives on push — the committed manifest ↔ disk pair is what rots);
 *  - the producer's file-naming (`NN.webp` base + `NN-<w>.webp` rungs) and the
 *    consumer's URL-building (`srcsetFor`) agree — every URL the browser is told
 *    to fetch resolves to a file that exists;
 *  - display bases ship WebP-only, with `posters/` (downloadable art) and
 *    `hotspots/` (zoom-critical 3D tiers) the two documented JPEG exceptions,
 *    both excluded from the ladder.
 *
 * All reads are of regular-git files (derived WebP + manifest are committed;
 * only `masters/` is LFS-excluded), so these run identically local + on CI.
 */

const ROOT = process.cwd();
const STATIC = path.join(ROOT, 'static');
const IMAGES = path.join(STATIC, 'images');
const MAX_TOP = 3072; // ADR-080: the top rung / cap — never serve above the TV size.

const manifest: LadderManifest = JSON.parse(
  readFileSync(path.join(STATIC, 'data', 'image-ladder.json'), 'utf8'),
);
const entries = Object.entries(manifest);
// Rover-route tiles (RFC-030 D5 amendment) — the one laddered hotspot path.
const TILE = /^images\/hotspots\/[^/]+\/[^/]+\/traverse\//;
// Context crops (surface-context.ts, same amendment): one true-scale crop per
// site, laddered 1024 / 2048 / 4096 — a texture picked at routeTileMaxPx × 2.
const CONTEXT = /^images\/hotspots\/[^/]+\/[^/]+\/context(?:-\d+)?(?:\.webp)?$/;
const CONTEXT_TOP = 4096;

/** `/images/<stem>` (+ optional suffix) → absolute path under `static/`. */
const onDisk = (imagePath: string) => path.join(STATIC, imagePath.replace(/^\//, ''));

/** All files under `static/images` matching `pred`, as `images/…`-relative POSIX paths.
 * ANY `_staging/` segment is the gitignored review scratch pattern (curated-fetch
 * candidates at images/_staging/, per-surface review areas like lab/goals/_staging/);
 * it never ships (build prunes it) and isn't in git, so staging is excluded wherever
 * it nests to keep the contract identical local + on CI. */
function imageFiles(pred: (rel: string) => boolean): string[] {
  return readdirSync(IMAGES, { recursive: true })
    .map((e) => 'images/' + String(e).split(path.sep).join('/'))
    .filter((rel) => !rel.split('/').includes('_staging'))
    .filter(pred);
}

const IS_RUNG = /-\d+\.webp$/;
const IS_VARIANT = /\.(1x1|4x3|16x9)\.webp$/;

describe('image-ladder manifest ↔ disk (producer output integrity)', () => {
  it('is non-empty and every entry maps /images/<stem> or /diagrams/<stem> → ascending unique widths ≤ 3072', () => {
    expect(entries.length).toBeGreaterThan(0);
    const bad: string[] = [];
    for (const [key, widths] of entries) {
      // /diagrams/ joined the ladder in #482 (science diagrams, add-card-rungs --extend).
      if (!/^\/(images|diagrams)\//.test(key))
        bad.push(`${key}: key not under /images/ or /diagrams/`);
      if (!Array.isArray(widths) || widths.length === 0) {
        bad.push(`${key}: empty width list`);
        continue;
      }
      for (const w of widths) {
        if (!Number.isInteger(w) || w <= 0) bad.push(`${key}: non-positive-int width ${w}`);
      }
      const ascending = widths.every((w, i) => i === 0 || w > widths[i - 1]);
      if (!ascending) bad.push(`${key}: widths not strictly ascending [${widths}]`);
      if (widths[widths.length - 1] > (CONTEXT.test(key.slice(1)) ? CONTEXT_TOP : MAX_TOP)) {
        bad.push(`${key}: base width ${widths[widths.length - 1]} exceeds ${MAX_TOP}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('every rung + base file exists on disk (largest = NN.webp, smaller = NN-<w>.webp)', () => {
    const missing: string[] = [];
    for (const [key, widths] of entries) {
      const maxW = widths[widths.length - 1];
      for (const w of widths) {
        const file = w === maxW ? `${key}.webp` : `${key}-${w}.webp`;
        if (!existsSync(onDisk(file))) missing.push(file);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('image-ladder ↔ srcsetFor consumer contract', () => {
  it('srcsetFor resolves every emitted URL to a real WebP for every manifest entry', () => {
    const failures: string[] = [];
    for (const [key, widths] of entries) {
      const r = srcsetFor(`${key}.webp`, manifest); // plain path, no origin prefix
      if (!r) {
        failures.push(`${key}: srcsetFor returned null`);
        continue;
      }
      // src is always the unsuffixed base and must exist.
      if (!existsSync(onDisk(r.src))) failures.push(`${key}: src ${r.src} missing on disk`);
      // Every srcset candidate URL must exist + carry a width descriptor.
      const parsed = r.srcset.split(',').map((s) => s.trim().split(/\s+/));
      const descriptors = parsed.map(([, d]) => d);
      const urls = parsed.map(([u]) => u);
      for (const u of urls) {
        if (!existsSync(onDisk(u))) failures.push(`${key}: srcset url ${u} missing on disk`);
      }
      // Descriptors mirror the manifest widths in order; top one is the base width.
      if (descriptors.join(',') !== widths.map((w) => `${w}w`).join(',')) {
        failures.push(`${key}: descriptors [${descriptors}] ≠ widths [${widths}]`);
      }
      // The largest descriptor must point at the unsuffixed base (not a -<w> rung).
      if (urls[urls.length - 1] !== `${key}.webp`) {
        failures.push(`${key}: top rung ${urls[urls.length - 1]} is not the base ${key}.webp`);
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('WebP-only served bases (RFC-030 D3 / ADR-080)', () => {
  it('no slot-numbered display base ships as .jpg outside posters/ and hotspots/', () => {
    const strayJpgBases = imageFiles(
      (rel) =>
        /\/\d{2}\.jpg$/.test(rel) &&
        !rel.startsWith('images/posters/') &&
        !rel.startsWith('images/hotspots/'),
    );
    expect(strayJpgBases).toEqual([]);
  });
});

describe('posters + hotspots stay full-res JPEG, excluded from the ladder', () => {
  it('posters are JPEG art with no WebP sibling and no ladder entry', () => {
    const posterJpg = imageFiles(
      (rel) => rel.startsWith('images/posters/') && rel.endsWith('.jpg'),
    );
    const posterWebp = imageFiles(
      (rel) => rel.startsWith('images/posters/') && rel.endsWith('.webp'),
    );
    const posterKeys = entries.filter(([k]) => k.startsWith('/images/posters/'));
    expect(posterJpg.length).toBeGreaterThan(0);
    expect(posterWebp).toEqual([]);
    expect(posterKeys.map(([k]) => k)).toEqual([]);
  });

  it('hotspot zoom tiers are JPEG and excluded from the ladder', () => {
    const hotspotJpg = imageFiles(
      (rel) => rel.startsWith('images/hotspots/') && rel.endsWith('.jpg') && !TILE.test(rel),
    );
    const hotspotKeys = entries.filter(
      ([k]) =>
        k.startsWith('/images/hotspots/') && !TILE.test(k.slice(1)) && !CONTEXT.test(k.slice(1)),
    );
    expect(hotspotJpg.length).toBeGreaterThan(0);
    expect(hotspotKeys.map(([k]) => k)).toEqual([]);
  });

  // RFC-030 D5 amendment (2026-11-04): rover-route tiles ARE laddered (512 /
  // 1024 / 2048 WebP, picked per quality tier as textures, D4) and ship WebP-only.
  it('route tiles are laddered WebP: no served JPEG, every tile in the manifest', () => {
    const tileJpg = imageFiles((rel) => TILE.test(rel) && rel.endsWith('.jpg'));
    expect(tileJpg).toEqual([]);
    const tileBases = imageFiles(
      (rel) => TILE.test(rel) && rel.endsWith('.webp') && !/-\d+\.webp$/.test(rel),
    );
    expect(tileBases.length).toBeGreaterThan(0);
    const missing = tileBases.filter((rel) => !manifest[`/${rel.replace(/\.webp$/, '')}`]);
    expect(missing).toEqual([]);
    for (const [k, widths] of entries.filter(([k]) => TILE.test(k.slice(1)))) {
      expect(Math.max(...widths), k).toBeLessThanOrEqual(2048);
    }
  });
});

describe('route tiles are credited and described', () => {
  // Apollo 16/17 tiles shipped with no provenance (Apollo 17) and no alt text
  // (both) and nothing caught it; every laddered tile needs both.
  it('every laddered route tile has a provenance row and en-US alt text', () => {
    const prov = new Set(
      (
        JSON.parse(readFileSync(path.join(STATIC, 'data', 'image-provenance.json'), 'utf8')) as {
          entries: { path: string }[];
        }
      ).entries.map((e) => e.path),
    );
    const alt = JSON.parse(
      readFileSync(path.join(STATIC, 'data', 'image-alt-text', 'en-US.json'), 'utf8'),
    ) as Record<string, string>;
    const tiles = entries.filter(([k]) => TILE.test(k.slice(1))).map(([k]) => `${k}.webp`);
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.filter((t) => !prov.has(t))).toEqual([]);
    expect(tiles.filter((t) => !alt[t])).toEqual([]);
  });
});

describe('context crops (surface-context.ts)', () => {
  it('every hotspot_context_source is a laddered WebP on disk, at most 4096 wide', () => {
    const hs = JSON.parse(
      readFileSync(path.join(STATIC, 'data', 'surface-hotspots.json'), 'utf8'),
    ) as {
      entries: Record<string, { hotspot_context_source?: string; hotspot_context_bounds?: object }>;
    };
    const sources = Object.values(hs.entries)
      .filter((e) => e.hotspot_context_source)
      .map((e) => e.hotspot_context_source as string);
    expect(sources.length).toBeGreaterThan(0);
    const bad: string[] = [];
    for (const [id, e] of Object.entries(hs.entries)) {
      if (!e.hotspot_context_source) continue;
      const src = e.hotspot_context_source;
      if (!e.hotspot_context_bounds) bad.push(`${id}: source without bounds`);
      if (!CONTEXT.test(src.slice(1))) bad.push(`${id}: ${src} is not a context path`);
      if (!existsSync(onDisk(src))) bad.push(`${id}: ${src} missing on disk`);
      const widths = manifest[src.replace(/\.webp$/, '')];
      if (!widths) bad.push(`${id}: ${src} not in the ladder`);
      else if (Math.max(...widths) > CONTEXT_TOP) bad.push(`${id}: rung above ${CONTEXT_TOP}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('image-ladder completeness (disk → manifest, bidirectional)', () => {
  it('every derived base WebP has a manifest entry (no un-manifested ladder base)', () => {
    const orphans = imageFiles(
      (rel) =>
        rel.endsWith('.webp') &&
        !IS_RUNG.test(rel) &&
        !IS_VARIANT.test(rel) &&
        !rel.startsWith('images/posters/') &&
        !rel.startsWith('images/hotspots/') &&
        // Badges (program/mission insignia) are a separate pipeline
        // (scripts/fetch-badges.ts): fixed-size 256px icons with no responsive
        // rungs and their own badge-provenance.json, so they never enter the
        // display ladder — like posters and hotspots.
        !rel.startsWith('images/badges/') &&
        // Essay art (the hero + the Wired-style diagram panels under
        // images/essays/) is bespoke, direct-referenced full-width art: the
        // /essays renderer uses a plain <img src>, not the responsive ladder,
        // so like posters and badges it carries no rungs and no manifest entry.
        !rel.startsWith('images/essays/') &&
        // Colophon thumbnails (model-*/craft-*) are fixed-size 800px captured
        // renders of our own 3D models (scripts/capture-colophon-thumbs.ts),
        // shown in the /colophon grid via a plain <img> — not master-derived and
        // not responsive, so like posters/badges/essays they carry no ladder
        // rungs and no manifest entry.
        !rel.startsWith('images/colophon/') &&
        // Lab goal illustrations (G · #536, FB1b) are operator-approved generated
        // art at a fixed 1600px, rendered by IllustrationFigure via a plain
        // <img src=assetUrl(...)> and tracked in lab-illustrations.json +
        // lab-illustration-provenance.json — same bespoke class as posters/
        // badges/essays/colophon: no rungs, no display-ladder entry.
        !rel.startsWith('images/lab/goals/'),
    )
      .map((rel) => '/' + rel.replace(/\.webp$/, '')) // images/x/01.webp → /images/x/01
      .filter((key) => !(key in manifest));
    expect(orphans).toEqual([]);
  });
});
