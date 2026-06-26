import { promises as fs } from 'node:fs';
import path from 'node:path';
import { SCORING_PROMPT_VERSION } from './prompt.ts';
import type { CachedScore } from './cache.ts';
import { SCORE_CACHE_DIR } from './cache.ts';
import type { VariantResult, VariantRatio } from './crop-variants.ts';
import type { VisionCategory } from './provider.ts';

/**
 * Build the static/data/image-vision.json sidecar manifest from the
 * per-image cache + the per-variant cache (PRD-018 / RFC-022 §2.1).
 *
 * The manifest is what the FRONTEND reads at build time (Vite static
 * import). Each entry is keyed by image path (matches the keys in
 * static/data/image-provenance.json — that's the join model the
 * sidecar relies on; ADR-047 stays untouched).
 *
 * Structure:
 *
 *   {
 *     "version": 1,
 *     "generated_at": "<ISO>",
 *     "vision_provider": "<name>",
 *     "vision_model": "<id>",
 *     "prompt_version": "<SCORING_PROMPT_VERSION>",
 *     "entries": {
 *       "<imagePath>": {
 *         score, subject, category, focal_point,
 *         variants: { "1x1": path, "4x3": path, "16x9": path },
 *         rejected_by: null | "score-below-threshold" | "category-people"
 *                    | "category-diagram" | "human",
 *         fallback: false,
 *         scored_at: <ISO>,
 *         scoring_cost_usd: <number>
 *       }
 *     }
 *   }
 *
 * The orchestrator (scripts/score-images.ts) calls buildAndWriteManifest
 * after the per-image processing loop completes.
 */

export type RejectedBy =
  | null
  | 'score-below-threshold'
  | 'category-people'
  | 'category-diagram'
  | 'human';

export interface ImageVisionEntry {
  score: number;
  subject: string;
  category: VisionCategory;
  focal_point: { x: number; y: number };
  variants: Record<VariantRatio, string>;
  rejected_by: RejectedBy;
  fallback: boolean;
  scored_at: string;
  scoring_cost_usd: number;
}

export interface ImageVisionManifest {
  version: number;
  generated_at: string;
  vision_provider: string;
  vision_model: string;
  prompt_version: string;
  entries: Record<string, ImageVisionEntry>;
}

export const MANIFEST_PATH = path.join('static', 'data', 'image-vision.json');
export const SCORE_THRESHOLD = 5;

/**
 * Decide the rejected_by field for an entry. Status-aware: PLANNED
 * missions accept `render`; FLOWN/ACTIVE reject it. Operator-flagged
 * deny-list entries are already short-circuited upstream and arrive
 * here with `rejectedByHuman = true`.
 */
export function computeRejectedBy(input: {
  score: number;
  category: VisionCategory;
  rejectedByHuman?: boolean;
  missionStatus?: 'PLANNED' | 'FLOWN' | 'ACTIVE' | 'ENDED' | 'CRASHED' | 'LOST' | string;
}): RejectedBy {
  if (input.rejectedByHuman) return 'human';
  if (input.category === 'people') return 'category-people';
  if (input.category === 'diagram') return 'category-diagram';
  if (input.category === 'render' && input.missionStatus !== 'PLANNED') {
    return 'score-below-threshold';
  }
  if (input.score < SCORE_THRESHOLD) return 'score-below-threshold';
  return null;
}

export interface BuildManifestInput {
  /**
   * One entry per image processed in this build. Includes both cached
   * (cache-hit, no API call this build) and freshly-scored images.
   */
  perImage: Array<{
    imagePath: string;
    cached: CachedScore;
    variants: VariantResult[];
    rejectedByHuman?: boolean;
    missionStatus?: string;
    fallback?: boolean;
  }>;
  vision_provider: string;
  vision_model: string;
  /**
   * When true (default), merge with any pre-existing manifest entries
   * for images NOT in `perImage`. Lets `--mission <id>` runs preserve
   * the rest of the corpus. Set false for `--all` runs.
   */
  preserveExistingEntries?: boolean;
}

export async function buildAndWriteManifest(
  input: BuildManifestInput,
): Promise<ImageVisionManifest> {
  const preserve = input.preserveExistingEntries ?? true;
  const existing = preserve ? await readExistingManifest() : null;
  const entries: Record<string, ImageVisionEntry> = existing?.entries ?? {};
  for (const item of input.perImage) {
    const rejected_by = computeRejectedBy({
      score: item.cached.score,
      category: item.cached.category,
      rejectedByHuman: item.rejectedByHuman,
      missionStatus: item.missionStatus,
    });
    const variantsMap = item.variants.reduce(
      (acc, v) => ({ ...acc, [v.ratio]: relPath(v.outputPath) }),
      {} as Partial<Record<VariantRatio, string>>,
    );
    entries[item.imagePath] = {
      score: item.cached.score,
      subject: item.cached.subject,
      category: item.cached.category,
      focal_point: item.cached.focal_point,
      // 1x1 only — 4x3/16x9 retired 2026-06-26 (no consumer). See
      // crop-variants.ts VARIANT_RATIOS.
      variants: {
        '1x1': variantsMap['1x1'] ?? '',
      },
      rejected_by,
      fallback: item.fallback ?? false,
      scored_at: item.cached.cached_at,
      scoring_cost_usd: item.cached.cost_usd,
    };
  }
  const manifest: ImageVisionManifest = {
    version: 1,
    generated_at: new Date().toISOString(),
    vision_provider: input.vision_provider,
    vision_model: input.vision_model,
    prompt_version: SCORING_PROMPT_VERSION,
    entries,
  };
  await fs.mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  return manifest;
}

async function readExistingManifest(): Promise<ImageVisionManifest | null> {
  try {
    const raw = await fs.readFile(MANIFEST_PATH, 'utf-8');
    return JSON.parse(raw) as ImageVisionManifest;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    return null;
  }
}

/**
 * Make a project-relative path with forward slashes — the frontend
 * loader joins these to image-provenance.json by string equality, so
 * Windows backslash separators in the manifest would break the join.
 */
function relPath(p: string): string {
  const rel = path.relative(process.cwd(), p);
  const posix = rel.split(path.sep).join('/');
  // Variant outputs live under static/; SvelteKit serves that
  // directory at the URL root, so strip the leading `static/`
  // and prepend `/` to match the URL convention used by the
  // manifest's entry keys (and the runtime fetches that consume
  // them). Without this the runtime requests
  // `/<route>/static/images/...` and 404s.
  if (posix.startsWith('static/')) return '/' + posix.slice('static/'.length);
  return posix;
}

export { SCORE_CACHE_DIR };
