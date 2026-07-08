#!/usr/bin/env node
/**
 * Re-key image-provenance.json for WebP-only display images (RFC-030 / ADR-080).
 *
 * Display base images now ship as `NN.webp` instead of `NN.jpg` (same picture,
 * same source/license — only the served format changed). This mechanically
 * rewrites the `path` of each BASE display entry `.jpg → .webp`. Leaves:
 *   - variant thumbnails (`.1x1/.4x3/.16x9.jpg`) — still jpg,
 *   - `hotspots/` tiers — kept as full-res jpg (zoom-critical).
 * No re-fetch, no network — attribution is unchanged. Matches the writer's
 * 2-space + trailing-newline formatting so the diff is only the changed paths.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'static/data/image-provenance.json';
const data = JSON.parse(readFileSync(P, 'utf8'));

// Only `/images/` display bases — NOT /textures/ (3D surface maps stay jpg),
// NOT variant thumbnails, NOT hotspots/ zoom tiers.
const isBaseDisplay = (p) =>
  p.startsWith('/images/') &&
  /\.jpe?g$/i.test(p) &&
  !/\.(1x1|4x3|16x9)\./i.test(p) &&
  !p.includes('/hotspots/');

let n = 0;
for (const e of data.entries) {
  if (typeof e.path === 'string' && isBaseDisplay(e.path)) {
    e.path = e.path.replace(/\.jpe?g$/i, '.webp');
    n += 1;
  }
}

writeFileSync(P, JSON.stringify(data, null, 2) + '\n');
console.log(`[rekey-provenance] ${n} base display .jpg → .webp`);
