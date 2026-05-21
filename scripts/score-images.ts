#!/usr/bin/env tsx
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { createAnthropicVisionProvider } from './vision/anthropic.ts';
import {
  resolveScoreFromCacheOrProvider,
  readCachedScore,
  computeScoreCacheKey,
} from './vision/cache.ts';
import { generateVariants } from './vision/crop-variants.ts';
import { buildAndWriteManifest, MANIFEST_PATH } from './vision/build-manifest.ts';
import type { ImageVisionManifest } from './vision/build-manifest.ts';

/**
 * Image Pipeline v2 orchestrator CLI (PRD-018 / RFC-022 §6).
 *
 * Default behaviour = incremental (`--new-only` implicit). Processes
 * only images that are NEW (absent from the manifest) or whose cache
 * key has changed since the last run. Routine runs are effectively
 * free.
 *
 * Scope flags (AND-joined):
 *   --new-only         default; new + changed entries only
 *   --changed-since R  git diff R...HEAD intersected w/ provenance
 *   --mission <id>     filter by /missions/<id>/ path prefix
 *   --agency <name>    filter by provenance entry's `agency` field
 *   --source <name>    filter by `source_type` (nasa-images-api etc.)
 *   --fleet-asset T    filter by /fleet-{T}/ path segment
 *   --segment <name>   filter by top-level path segment
 *   --all              process every entry in image-provenance.json
 *
 * Cache bypass:
 *   --force-score      ignore the score cache; call provider for
 *                      every image in scope
 *   --skip-crops       only re-score; don't regenerate variants
 *   --skip-scoring     only re-crop; trust existing cache scores
 */

interface CliArgs {
  newOnly?: boolean;
  changedSince?: string;
  mission?: string;
  agency?: string;
  source?: string;
  fleetAsset?: string;
  segment?: string;
  all?: boolean;
  forceScore?: boolean;
  skipCrops?: boolean;
  skipScoring?: boolean;
}

interface ProvenanceEntry {
  id: string;
  path: string;
  source_type?: string;
  agency?: string;
  // ... other fields exist but the orchestrator doesn't need them
}

interface ProvenanceFile {
  entries: Record<string, ProvenanceEntry> | ProvenanceEntry[];
}

const PROVENANCE_PATH = path.join('static', 'data', 'image-provenance.json');

async function main(): Promise<void> {
  const args = parseCliArgs();
  const provenance = await readProvenance();
  const allEntries = provenanceArray(provenance);
  console.log(`Image Pipeline v2 — ${allEntries.length} provenance entries`);

  const inScope = await applyScopeFilters(allEntries, args);
  if (inScope.length === 0) {
    console.log('No entries match the scope filter. Nothing to do.');
    return;
  }
  console.log(`In scope: ${inScope.length} entries`);

  // Provider is only needed when an entry needs a fresh score. Lazy-init so a
  // re-crop pass (`--skip-scoring`, all entries cache-hit) doesn't fail with
  // "ANTHROPIC_API_KEY missing" when the key isn't set. Variant generation
  // and manifest construction don't talk to the vision API.
  let providerCache: ReturnType<typeof createAnthropicVisionProvider> | null = null;
  const getProvider = (): ReturnType<typeof createAnthropicVisionProvider> => {
    if (!providerCache) {
      providerCache = createAnthropicVisionProvider();
      console.log(`Provider: ${providerCache.name} · model: ${providerCache.model}`);
    }
    return providerCache;
  };

  const perImage: Awaited<ReturnType<typeof processOneImage>>[] = [];
  let totalCost = 0;
  for (let i = 0; i < inScope.length; i++) {
    const entry = inScope[i];
    const prefix = `[${i + 1}/${inScope.length}]`;
    try {
      const result = await processOneImage({ provenance: entry, getProvider, args });
      perImage.push(result);
      totalCost += result.cached.cost_usd;
      const fresh = result.cacheHit ? 'cached' : `$${result.cached.cost_usd.toFixed(4)}`;
      console.log(
        `${prefix} ${entry.path} → score ${result.cached.score} ${result.cached.category} (${fresh})`,
      );
    } catch (err) {
      console.error(`${prefix} ${entry.path} FAILED: ${(err as Error).message}`);
    }
  }
  console.log(
    `\nProcessed ${perImage.length} entries · API cost this run: $${totalCost.toFixed(2)}`,
  );

  const isFullCorpus = args.all === true;
  const manifest = await buildAndWriteManifest({
    perImage: perImage.map((p) => ({
      imagePath: p.provenanceEntry.path,
      cached: p.cached,
      variants: p.variants,
    })),
    // Cached provider name/model — falls back to the existing manifest's
    // values when no provider was actually instantiated this run (re-crop
    // only, all cache hits).
    vision_provider: providerCache?.name ?? 'cached',
    vision_model: providerCache?.model ?? 'cached',
    preserveExistingEntries: !isFullCorpus,
  });
  console.log(
    `Manifest written: ${MANIFEST_PATH} (${Object.keys(manifest.entries).length} entries)`,
  );
}

function parseCliArgs(): CliArgs {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      'new-only': { type: 'boolean' },
      'changed-since': { type: 'string' },
      mission: { type: 'string' },
      agency: { type: 'string' },
      source: { type: 'string' },
      'fleet-asset': { type: 'string' },
      segment: { type: 'string' },
      all: { type: 'boolean' },
      'force-score': { type: 'boolean' },
      'skip-crops': { type: 'boolean' },
      'skip-scoring': { type: 'boolean' },
    },
    strict: true,
    allowPositionals: false,
  });
  return {
    newOnly: values['new-only'] as boolean | undefined,
    changedSince: values['changed-since'] as string | undefined,
    mission: values.mission as string | undefined,
    agency: values.agency as string | undefined,
    source: values.source as string | undefined,
    fleetAsset: values['fleet-asset'] as string | undefined,
    segment: values.segment as string | undefined,
    all: values.all as boolean | undefined,
    forceScore: values['force-score'] as boolean | undefined,
    skipCrops: values['skip-crops'] as boolean | undefined,
    skipScoring: values['skip-scoring'] as boolean | undefined,
  };
}

async function readProvenance(): Promise<ProvenanceFile> {
  const raw = await fs.readFile(PROVENANCE_PATH, 'utf-8');
  return JSON.parse(raw) as ProvenanceFile;
}

function provenanceArray(p: ProvenanceFile): ProvenanceEntry[] {
  const e = p.entries;
  if (Array.isArray(e)) return e;
  return Object.values(e);
}

async function applyScopeFilters(
  entries: ProvenanceEntry[],
  args: CliArgs,
): Promise<ProvenanceEntry[]> {
  const useDefaultIncremental =
    !args.all &&
    !args.mission &&
    !args.agency &&
    !args.source &&
    !args.fleetAsset &&
    !args.segment &&
    !args.changedSince;
  let filtered = entries;
  if (args.mission) {
    const id = args.mission;
    filtered = filtered.filter((e) => e.path.includes(`/missions/${id}/`));
  }
  if (args.agency) {
    const a = args.agency;
    filtered = filtered.filter((e) => e.agency === a || e.agency?.includes(a));
  }
  if (args.source) {
    filtered = filtered.filter((e) => e.source_type === args.source);
  }
  if (args.fleetAsset) {
    const t = args.fleetAsset;
    filtered = filtered.filter(
      (e) => e.path.includes(`/fleet-${t}`) || e.path.includes(`/fleet/${t}`),
    );
  }
  if (args.segment) {
    const s = args.segment;
    filtered = filtered.filter((e) => segmentOf(e.path) === s);
  }
  if (args.changedSince) {
    const changed = changedFilesSince(args.changedSince);
    filtered = filtered.filter((e) => changed.has(normaliseProvenancePath(e.path)));
  }
  if (useDefaultIncremental || args.newOnly) {
    const existing = await readExistingManifestEntries();
    filtered = await asyncFilter(filtered, async (e) => {
      // Always include if not in manifest yet.
      if (!existing.has(e.path)) return true;
      // Otherwise include only if cache key would have changed
      // (i.e. source bytes diff). Cheap path check: if the file
      // doesn't exist locally, skip.
      const absPath = toFsPath(e.path);
      const bytes = await fs.readFile(absPath).catch(() => null);
      if (!bytes) return false;
      const key = computeScoreCacheKey({
        imageBytes: bytes,
        providerName: 'anthropic',
        modelName: 'claude-sonnet-4-6',
      });
      const cached = await readCachedScore(key);
      return cached === null;
    });
  }
  return filtered;
}

function segmentOf(p: string): string {
  const m = p.match(/^\/?images\/([^/]+)/);
  return m ? m[1] : '';
}

function normaliseProvenancePath(p: string): string {
  // image-provenance.json paths are absolute from /images/...; git
  // diff returns them relative to repo root (e.g. static/images/...).
  if (p.startsWith('/images/')) return 'static' + p;
  return p.startsWith('static/') ? p : `static${p.startsWith('/') ? '' : '/'}${p}`;
}

function toFsPath(provenancePath: string): string {
  return normaliseProvenancePath(provenancePath);
}

function changedFilesSince(ref: string): Set<string> {
  try {
    const stdout = execSync(`git diff --name-only ${ref}...HEAD`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return new Set(stdout.split('\n').filter(Boolean));
  } catch (err) {
    console.warn(`git diff against ${ref} failed: ${(err as Error).message}`);
    return new Set();
  }
}

async function readExistingManifestEntries(): Promise<Set<string>> {
  try {
    const raw = await fs.readFile(MANIFEST_PATH, 'utf-8');
    const m = JSON.parse(raw) as ImageVisionManifest;
    return new Set(Object.keys(m.entries ?? {}));
  } catch {
    return new Set();
  }
}

async function asyncFilter<T>(arr: T[], pred: (t: T) => Promise<boolean>): Promise<T[]> {
  const flags = await Promise.all(arr.map(pred));
  return arr.filter((_, i) => flags[i]);
}

// Provider identity used by the cache key. Hardcoded so --skip-scoring
// can read cache entries without instantiating the (key-requiring)
// provider. Must match createAnthropicVisionProvider()'s defaults.
const PROVIDER_NAME = 'anthropic';
const PROVIDER_MODEL = 'claude-sonnet-4-6';

async function processOneImage(input: {
  provenance: ProvenanceEntry;
  getProvider: () => ReturnType<typeof createAnthropicVisionProvider>;
  args: CliArgs;
}): Promise<{
  provenanceEntry: ProvenanceEntry;
  cached: Awaited<ReturnType<typeof resolveScoreFromCacheOrProvider>>;
  variants: Awaited<ReturnType<typeof generateVariants>>;
  cacheHit: boolean;
}> {
  const fsPath = toFsPath(input.provenance.path);
  const bytes = await fs.readFile(fsPath);
  let cacheHit = true;
  let cached: Awaited<ReturnType<typeof resolveScoreFromCacheOrProvider>>;
  const key = computeScoreCacheKey({
    imageBytes: bytes,
    providerName: PROVIDER_NAME,
    modelName: PROVIDER_MODEL,
  });
  if (input.args.skipScoring) {
    // Re-crop only: read existing cache if present; if not, fall
    // through to the resolver which will populate it (and incur the
    // API call). --skip-scoring without an existing cache is a
    // misconfiguration but should not silently break.
    const hit = await readCachedScore(key);
    if (hit) {
      cached = hit;
    } else {
      cacheHit = false;
      cached = await resolveScoreFromCacheOrProvider({
        imageBytes: bytes,
        imagePath: input.provenance.path,
        provider: input.getProvider(),
        denyListExamples: [],
      });
    }
  } else {
    const hit = !input.args.forceScore ? await readCachedScore(key) : null;
    if (hit) {
      cached = hit;
    } else {
      cacheHit = false;
      cached = await resolveScoreFromCacheOrProvider({
        imageBytes: bytes,
        imagePath: input.provenance.path,
        provider: input.getProvider(),
        denyListExamples: [],
        forceRefresh: input.args.forceScore,
      });
    }
  }
  // Variants
  let variants: Awaited<ReturnType<typeof generateVariants>> = [];
  if (!input.args.skipCrops) {
    const outputBase = fsPath.replace(/\.(jpg|jpeg|png|webp)$/i, '');
    variants = await generateVariants({
      sourcePath: fsPath,
      sourceBytes: bytes,
      focalPoint: cached.focal_point,
      outputBase,
      forceRefresh: input.args.forceScore,
    });
  }
  return { provenanceEntry: input.provenance, cached, variants, cacheHit };
}

main().catch((err) => {
  console.error('Fatal:', (err as Error).message);
  process.exit(1);
});
