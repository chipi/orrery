#!/usr/bin/env tsx
/**
 * Build the baseline `static/data/image-alt-text/en-US.json` alt-text
 * map from `image-provenance.json`'s existing English caption fields.
 *
 * PRD-007 piece V minimum / GH #257.
 *
 * Strategy: read `image-provenance.json`, for each entry pick the best
 * available English caption (caption_short > title > description). A caption
 * that describes the FILE rather than the picture (#389) is not alt-text — a raw
 * Wikimedia filename (`File:… .jpg`) or a provenance bookkeeping title
 * (`NASA Images search result — …`, `(Un)curated panel image — …`). For those
 * use the image-vision.json `subject` (vision-model description, trimmed to its
 * first clause), else a readable fallback built from the caption itself.
 * Output: `{ "/images/path.jpg": "alt-text string" }`.
 *
 * Non-English locale files (`static/data/image-alt-text/<locale>.json`)
 * are populated separately via the Argos translate pipeline (deferred
 * to #257 / v0.9). The accessor in `src/lib/image-alt.ts` falls back
 * to en-US when a locale file is missing.
 *
 * Usage:
 *   npx tsx scripts/build-image-alt-baseline.ts
 *   npx tsx scripts/build-image-alt-baseline.ts --check  # diff-only, no write
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { imageStem, pickAlt, type ProvEntry } from './lib/alt-text.ts';

const PROVENANCE_PATH = path.join('static', 'data', 'image-provenance.json');
const OUT_DIR = path.join('static', 'data', 'image-alt-text');
const OUT_PATH = path.join(OUT_DIR, 'en-US.json');
const VISION_PATH = path.join('static', 'data', 'image-vision.json');

interface ProvFile {
  entries: ProvEntry[];
}

async function loadVisionSubjects(): Promise<Map<string, string>> {
  const raw = JSON.parse(await fs.readFile(VISION_PATH, 'utf-8')) as {
    entries?: Record<string, { subject?: string }>;
  };
  const map = new Map<string, string>();
  for (const [p, v] of Object.entries(raw.entries ?? {})) {
    const subject = (v as { subject?: string }).subject;
    if (subject && !map.has(imageStem(p))) map.set(imageStem(p), subject);
  }
  return map;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: { check: { type: 'boolean' } },
    strict: true,
  });

  const raw = await fs.readFile(PROVENANCE_PATH, 'utf-8');
  const data = JSON.parse(raw) as ProvFile;

  const vision = await loadVisionSubjects();
  const out: Record<string, string> = {};
  let empty = 0;
  for (const e of data.entries) {
    const alt = pickAlt(e, vision);
    if (alt) {
      out[e.path] = alt;
    } else {
      empty++;
    }
  }
  const sortedOut: Record<string, string> = {};
  for (const key of Object.keys(out).sort()) sortedOut[key] = out[key];

  if (values.check) {
    let prevSize = 0;
    try {
      const prevRaw = await fs.readFile(OUT_PATH, 'utf-8');
      const prev = JSON.parse(prevRaw) as Record<string, string>;
      prevSize = Object.keys(prev).length;
    } catch {
      /* file doesn't exist yet */
    }
    const fresh = Object.keys(sortedOut).length;
    console.log(
      `Baseline en-US.json: ${prevSize} → ${fresh} entries (${empty} entries had no caption).`,
    );
    process.exit(prevSize === fresh ? 0 : 1);
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(sortedOut, null, 2) + '\n', 'utf-8');
  console.log(
    `Wrote ${OUT_PATH} (${Object.keys(sortedOut).length} entries; ${empty} skipped — no caption).`,
  );
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
