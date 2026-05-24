#!/usr/bin/env tsx
/**
 * Build the baseline `static/data/image-alt-text/en-US.json` alt-text
 * map from `image-provenance.json`'s existing English caption fields.
 *
 * PRD-007 piece V minimum / GH #257.
 *
 * Strategy: read `image-provenance.json`, for each entry pick the best
 * available English caption (caption_short > title > description).
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

const PROVENANCE_PATH = path.join('static', 'data', 'image-provenance.json');
const OUT_DIR = path.join('static', 'data', 'image-alt-text');
const OUT_PATH = path.join(OUT_DIR, 'en-US.json');

interface ProvEntry {
  path: string;
  title?: string;
  caption_short?: string;
  description?: string;
}

interface ProvFile {
  entries: ProvEntry[];
}

function pickAlt(e: ProvEntry): string {
  return (
    (e.caption_short && e.caption_short.trim()) ||
    (e.title && e.title.trim()) ||
    (e.description && e.description.trim().slice(0, 240)) ||
    ''
  );
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: { check: { type: 'boolean' } },
    strict: true,
  });

  const raw = await fs.readFile(PROVENANCE_PATH, 'utf-8');
  const data = JSON.parse(raw) as ProvFile;

  const out: Record<string, string> = {};
  let empty = 0;
  for (const e of data.entries) {
    const alt = pickAlt(e);
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
