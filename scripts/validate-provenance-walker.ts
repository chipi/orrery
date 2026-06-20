/**
 * Validator for the build-image-provenance.ts walker output.
 *
 * Enforces the Slice A v3 walker schema-sync contract:
 *   1. No entry has `image_url` ending in `Special:FilePath/undefined` (root cause 3
 *      of SLICE-A-V3-HANDOFF.md — the walker used to pass `src.commons_file` even
 *      when the sidecar entry only carried `image_url`).
 *   2. Every NASA entry whose `source_url` or `image_url` references
 *      `images-assets.nasa.gov` has a non-null `nasa_id` (the walker used to
 *      hardcode `nasa_id: null` even when the sidecar carried the id).
 *
 * Exits non-zero on violation so it can be wired into `validate-data`.
 *
 * Usage:
 *   tsx scripts/validate-provenance-walker.ts
 *   tsx scripts/validate-provenance-walker.ts --manifest=static/data/image-provenance.json
 */

import { readFile } from 'node:fs/promises';

type ProvenanceEntry = {
  id: string;
  path: string;
  source_type: string;
  source_url: string | null;
  image_url: string | null;
  nasa_id: string | null;
  [k: string]: unknown;
};

const args = process.argv.slice(2);
const manifestArg = args.find((a) => a.startsWith('--manifest='));
const manifestPath = manifestArg
  ? manifestArg.slice('--manifest='.length)
  : 'static/data/image-provenance.json';

async function main(): Promise<void> {
  const raw = await readFile(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as { entries?: ProvenanceEntry[] } | ProvenanceEntry[];
  const entries: ProvenanceEntry[] = Array.isArray(manifest) ? manifest : (manifest.entries ?? []);

  const undefinedFilepath: ProvenanceEntry[] = [];
  const nasaMissingId: ProvenanceEntry[] = [];

  for (const e of entries) {
    if (typeof e.image_url === 'string' && e.image_url.includes('Special:FilePath/undefined')) {
      undefinedFilepath.push(e);
    }
    const refsNasaCdn =
      (typeof e.image_url === 'string' && e.image_url.includes('images-assets.nasa.gov')) ||
      (typeof e.source_url === 'string' && e.source_url.includes('images-assets.nasa.gov'));
    if (refsNasaCdn && !e.nasa_id) {
      nasaMissingId.push(e);
    }
  }

  const total = entries.length;
  console.log(`validate-provenance-walker: scanned ${total} entries from ${manifestPath}`);

  let failed = 0;
  if (undefinedFilepath.length > 0) {
    failed += undefinedFilepath.length;
    console.error(
      `  ✗ ${undefinedFilepath.length} entries have image_url=Special:FilePath/undefined`,
    );
    for (const e of undefinedFilepath.slice(0, 5)) {
      console.error(`      ${e.path} (${e.source_type})`);
    }
    if (undefinedFilepath.length > 5)
      console.error(`      … and ${undefinedFilepath.length - 5} more`);
  } else {
    console.log('  ✓ no Special:FilePath/undefined entries');
  }

  if (nasaMissingId.length > 0) {
    failed += nasaMissingId.length;
    console.error(`  ✗ ${nasaMissingId.length} NASA-CDN entries have null nasa_id`);
    for (const e of nasaMissingId.slice(0, 5)) {
      console.error(`      ${e.path} → ${e.image_url ?? e.source_url}`);
    }
    if (nasaMissingId.length > 5) console.error(`      … and ${nasaMissingId.length - 5} more`);
  } else {
    console.log('  ✓ every NASA-CDN entry has a nasa_id');
  }

  if (failed > 0) {
    console.error(`validate-provenance-walker: FAIL (${failed} violations)`);
    process.exit(1);
  }
  console.log('validate-provenance-walker: OK');
}

main().catch((err) => {
  console.error('validate-provenance-walker: fatal', err);
  process.exit(2);
});
