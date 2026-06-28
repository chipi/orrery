/**
 * Companion to `prune-image-slots.ts` — sweeps the on-disk image trees
 * for stale files that don't belong to any base image we still ship.
 * Three classes get deleted, all fully recoverable from git history:
 *
 *   1. **Dash-legacy variants** — `NN-16x9.jpg`, `NN-4x3.jpg`, `NN-1x1.jpg`.
 *      Pre-Phase-0 naming convention; Phase 0 (#5) unified everything
 *      on the dot-separated `NN.16x9.jpg` form. The dash files are
 *      semantically dead — nothing references them; the resized
 *      pipeline writes the dot form.
 *
 *   2. **Dead-code aspect variants** — `*.16x9.jpg` and `*.4x3.jpg`.
 *      `pickVariant()` in `src/lib/image-vision.ts` has 'card' (→4x3)
 *      and 'hero' (→16x9) cases, but NEITHER is called anywhere in
 *      the UI today. Surface scenes use `pickVariant(entry,
 *      'thumbnail', false)` exclusively, which reads `1x1`. So 4x3
 *      and 16x9 are pure pipeline output with no consumer. Kept the
 *      1x1 variants — those are live.
 *
 *   3. **Dead-base variants** — `*.1x1.jpg` etc whose corresponding
 *      base file no longer exists. Leftovers from `prune-image-slots`
 *      runs or older fetchers.
 *
 * Side effects on JSON manifests (executed in apply mode):
 *
 *   - `static/data/image-vision.json` — for every retained entry,
 *     drops `variants['4x3']` and `variants['16x9']` keys (those
 *     paths no longer point at real files). `variants['1x1']`
 *     stays.
 *   - `static/data/image-alt-text/<locale>.json` — drops any key
 *     whose path was just deleted.
 *
 * Anything else is left alone. Specifically the `.1x1.jpg` variants
 * and the base files (`NN.jpg`) stay, even if their base isn't in the
 * provenance manifest — the answer to a missing-provenance base is to
 * expand the build-image-provenance walker, not to drop the content.
 *
 * Idempotent: a second run on a tree with no matching files is a no-op.
 *
 * Run:
 *   npx tsx scripts/prune-orphan-images.ts          # apply
 *   npx tsx scripts/prune-orphan-images.ts --dry    # plan only
 *
 * Writes a per-run report to `docs/provenance/prune-orphan-images-report.md`.
 */
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const STATIC_IMAGES_ROOT = 'static/images';
const REPORT_PATH = 'docs/provenance/prune-orphan-images-report.md';
const VISION_PATH = 'static/data/image-vision.json';
const ALT_TEXT_DIR = 'static/data/image-alt-text';

const DASH_VARIANT_RE = /-(16x9|4x3|1x1)\.(jpe?g|png|webp)$/i;
const DOT_VARIANT_RE = /\.(16x9|4x3|1x1)\.(jpe?g|png|webp)$/i;
const DEAD_CODE_RE = /\.(16x9|4x3)\.(jpe?g|png|webp)$/i;

const dryRun = process.argv.includes('--dry');

type DropReason = 'dash-legacy' | 'dead-code-aspect' | 'dead-base-variant';

interface DropEntry {
  path: string;
  reason: DropReason;
}

async function main(): Promise<void> {
  console.log(`prune-orphan-images — ${dryRun ? 'DRY RUN' : 'APPLY'} mode`);
  const drops = await scan();
  if (drops.length === 0) {
    console.log('Nothing to drop — tree is already clean.');
    await writeReport([]);
    return;
  }
  const byReason = drops.reduce<Record<string, number>>((acc, d) => {
    acc[d.reason] = (acc[d.reason] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`Planning to drop ${drops.length} files:`);
  for (const [r, n] of Object.entries(byReason)) console.log(`  ${n.toString().padStart(4)}  ${r}`);
  if (dryRun) {
    console.log('(dry run — no files changed)');
    await writeReport(drops);
    return;
  }
  for (const d of drops) await rm(d.path).catch(() => {});
  // Build a set of served (URL-style) paths that just got removed, so
  // we can sweep stale keys out of the JSON sidecars in one O(n) pass.
  const droppedServed = new Set<string>(drops.map((d) => '/' + d.path.replace(/^static\//, '')));
  await cleanVisionManifest(droppedServed);
  await cleanAltTextManifests(droppedServed);
  await writeReport(drops);
  console.log(`Done — report: ${REPORT_PATH}`);
}

/**
 * Recursive walk — yields every image file under STATIC_IMAGES_ROOT,
 * regardless of folder depth. Some surfaces use a `<surface>/<id>/`
 * structure (fleet-galleries, missions, …), others sit flat
 * (`science/<name>.jpg`), and a few are deeper (hotspots/<region>/<id>).
 * The dash/dead classification only cares about the file itself + its
 * sibling base file, so depth doesn't matter.
 */
async function* walkImages(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      yield* walkImages(p);
    } else if (/\.(jpe?g|png|webp)$/i.test(e.name)) {
      yield p;
    }
  }
}

function deriveBasePath(variantPath: string): string {
  return variantPath.replace(/\.(16x9|4x3|1x1)(?=\.(jpe?g|png|webp)$)/i, '');
}

async function scan(): Promise<DropEntry[]> {
  const drops: DropEntry[] = [];
  // Build the full on-disk file set in one pass so dead-variant lookup
  // is O(1).
  const onDisk = new Set<string>();
  for await (const p of walkImages(STATIC_IMAGES_ROOT)) onDisk.add(p);
  // Classify in priority order: dash-legacy first (catches any aspect),
  // then dead-code aspects (4x3/16x9), then dead-base (1x1 whose base
  // is gone). Each file enters at most one bucket.
  for (const p of onDisk) {
    const fname = p.split('/').pop()!;
    if (DASH_VARIANT_RE.test(fname)) {
      drops.push({ path: p, reason: 'dash-legacy' });
      continue;
    }
    if (DEAD_CODE_RE.test(fname)) {
      drops.push({ path: p, reason: 'dead-code-aspect' });
      continue;
    }
    if (DOT_VARIANT_RE.test(fname)) {
      const base = deriveBasePath(p);
      if (!onDisk.has(base)) {
        drops.push({ path: p, reason: 'dead-base-variant' });
      }
    }
  }
  return drops;
}

async function cleanVisionManifest(droppedServed: Set<string>): Promise<void> {
  let raw: { entries: Record<string, { variants?: Record<string, string> }> } & Record<
    string,
    unknown
  >;
  try {
    raw = JSON.parse(await readFile(VISION_PATH, 'utf8'));
  } catch {
    return;
  }
  let entriesDropped = 0;
  let variantKeysDropped = 0;
  const entries = raw.entries;
  for (const [key, entry] of Object.entries(entries)) {
    if (droppedServed.has(key)) {
      delete entries[key];
      entriesDropped++;
      continue;
    }
    if (entry && typeof entry === 'object' && entry.variants) {
      for (const [vKey, vPath] of Object.entries(entry.variants)) {
        if (droppedServed.has(vPath)) {
          delete entry.variants[vKey];
          variantKeysDropped++;
        }
      }
    }
  }
  await writeFile(VISION_PATH, JSON.stringify(raw, null, 2) + '\n');
  console.log(
    `  image-vision.json: ${entriesDropped} entries dropped, ${variantKeysDropped} variant keys pruned`,
  );
}

async function cleanAltTextManifests(droppedServed: Set<string>): Promise<void> {
  let files: string[];
  try {
    files = (await readdir(ALT_TEXT_DIR)).filter((f) => f.endsWith('.json'));
  } catch {
    return;
  }
  let total = 0;
  for (const f of files) {
    const p = join(ALT_TEXT_DIR, f);
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(await readFile(p, 'utf8'));
    } catch {
      continue;
    }
    let dropped = 0;
    for (const key of Object.keys(raw)) {
      if (droppedServed.has(key)) {
        delete raw[key];
        dropped++;
      }
    }
    if (dropped > 0) {
      await writeFile(p, JSON.stringify(raw, null, 2) + '\n');
      console.log(`  ${p}: ${dropped} alt-text keys pruned`);
      total += dropped;
    }
  }
  if (total > 0) console.log(`  total alt-text keys pruned: ${total}`);
}

async function writeReport(drops: DropEntry[]): Promise<void> {
  const lines: string[] = [];
  lines.push('# prune-orphan-images — report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Mode: ${dryRun ? '**DRY RUN — no files changed**' : 'apply'}`);
  lines.push('');
  if (drops.length === 0) {
    lines.push('Nothing to drop — the on-disk tree contains no dash-legacy');
    lines.push('and no dead-variant files.');
    await writeFile(REPORT_PATH, lines.join('\n') + '\n');
    return;
  }
  // Group by surface for readability
  const bySurface = new Map<string, DropEntry[]>();
  for (const d of drops) {
    const parts = d.path.split('/');
    const surface = parts[2] ?? 'unknown';
    if (!bySurface.has(surface)) bySurface.set(surface, []);
    bySurface.get(surface)!.push(d);
  }
  lines.push(`Dropped ${drops.length} files. Breakdown by surface:`);
  lines.push('');
  for (const [surface, entries] of [...bySurface.entries()].sort()) {
    const dashCount = entries.filter((e) => e.reason === 'dash-legacy').length;
    // "dead-variant" is the report bucket for both dead reasons; the
    // literal 'dead-variant' was never a DropReason, so this count was
    // always 0 (the report silently under-reported dead drops).
    const deadCount = entries.filter(
      (e) => e.reason === 'dead-code-aspect' || e.reason === 'dead-base-variant',
    ).length;
    lines.push(
      `- **${surface}**: ${entries.length} files (${dashCount} dash-legacy, ${deadCount} dead-variant)`,
    );
  }
  lines.push('');
  lines.push('## Full file list');
  lines.push('');
  for (const [surface, entries] of [...bySurface.entries()].sort()) {
    lines.push(`### ${surface}`);
    lines.push('');
    for (const e of entries.sort((a, b) => a.path.localeCompare(b.path))) {
      lines.push(`- \`${e.path}\` _(${e.reason})_`);
    }
    lines.push('');
  }
  await writeFile(REPORT_PATH, lines.join('\n') + '\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
