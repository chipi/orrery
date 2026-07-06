/**
 * Top-5-per-ID image pruning + renumbering.
 *
 * Enforces a hard "max 5 base image slots per gallery ID" cap across
 * every `static/images/<surface>/<id>/` directory. When an ID has > 5
 * base slot files (named `NN.{jpg,png}` with optional resampled
 * derivatives `NN.16x9.jpg`, `NN.4x3.jpg`, `NN.1x1.jpg`), the script:
 *
 *   1. Reads the existing per-file Anthropic vision scores from
 *      `static/data/image-vision.json` (`.entries[<served-path>].score`).
 *   2. Ranks the ID's base slots by score, DESCENDING. Unscored slots
 *      tie last (score -1). Ties broken by original slot number, asc.
 *   3. Keeps the top 5, renumbers them as 01..05 in descending-score
 *      order so slot 01 == best image (and the default `pickHero()`
 *      pick is automatically the highest-scoring image).
 *   4. Drops every other slot — base file + .16x9 / .4x3 / .1x1
 *      derivatives.
 *   5. Updates every downstream manifest that references the renamed
 *      paths so the build stays consistent:
 *        - `static/data/image-vision.json`     (keys + variants object)
 *        - `static/data/image-provenance.json` (path field)
 *        - `static/data/fleet-image-sources.json` (key prefix)
 *        - `static/data/mission-image-sources.json` (key prefix)
 *
 * The script is fully idempotent: a second invocation on a tree where
 * no ID has > 5 base slots is a no-op.
 *
 * Conflict-free rename uses a 2-pass plan:
 *   pass 1: every kept slot → `__tmp__/NN.<ext>` (collision impossible)
 *   pass 2: `__tmp__/NN.<ext>` → final `NN.<ext>`
 * Drops execute between the two passes so the temp slots are stable.
 *
 * Run:
 *   npx tsx scripts/prune-image-slots.ts          # apply
 *   npx tsx scripts/prune-image-slots.ts --dry    # plan only, no writes
 *
 * Writes a per-run report to `docs/provenance/prune-image-slots-report.md`.
 */
import { readdir, readFile, rename, rm, mkdir, rmdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const STATIC_IMAGES_ROOT = 'static/images';
const VISION_PATH = 'static/data/image-vision.json';
const PROVENANCE_PATH = 'static/data/image-provenance.json';
const FLEET_SOURCES_PATH = 'static/data/fleet-image-sources.json';
const MISSION_SOURCES_PATH = 'static/data/mission-image-sources.json';
const REPORT_PATH = 'docs/provenance/prune-image-slots-report.md';
const MAX_SLOTS_PER_ID = 5;

// Filenames must match `NN.<ext>` or `NN.<variant>.<ext>`.
const BASE_RE = /^(\d{2})\.(jpe?g|png|webp)$/i;
const VARIANT_RE = /^(\d{2})\.(16x9|4x3|1x1)\.(jpe?g|png|webp)$/i;
type VariantSuffix = '16x9' | '4x3' | '1x1';
const VARIANT_SUFFIXES: VariantSuffix[] = ['16x9', '4x3', '1x1'];

interface SlotInfo {
  slot: number;
  base: string; // absolute filesystem path
  ext: string; // 'jpg' | 'png' etc. lower-case
  variants: Partial<Record<VariantSuffix, string>>;
  servedBase: string; // /images/<surface>/<id>/NN.jpg form (keys in vision)
  score: number; // -1 when unscored
}

interface IdPlan {
  surface: string;
  id: string;
  dir: string;
  slotsBefore: number;
  ranking: SlotInfo[]; // sorted desc-by-score, then asc-by-slot
  keep: { source: SlotInfo; newSlot: number }[];
  drop: SlotInfo[];
  changes: boolean; // is any actual file rename or drop needed?
}

const dryRun = process.argv.includes('--dry');
const fromReview = process.argv.includes('--from-review');
function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(flag + '='));
  return eq ? eq.slice(flag.length + 1) : undefined;
}
const onlyId = argValue('--id') ?? argValue('--mission');
const REVIEW_PATH = 'static/data/off-subject-review.json';
// --from-review: drop the EXACT slots the human review marked 'remove'
// (off-subject-review.json) instead of the top-5-by-score cap. Reuses the
// same renumber + manifest-update machinery. Scope with --id <galleryId>.
let removeSet = new Set<string>();

async function main(): Promise<void> {
  console.log(`prune-image-slots — ${dryRun ? 'DRY RUN' : 'APPLY'} mode`);

  // Load vision manifest (the score source).
  const vision = JSON.parse(await readFile(VISION_PATH, 'utf8')) as {
    entries: Record<string, { score?: number; variants?: Record<string, string> }>;
    [k: string]: unknown;
  };

  if (fromReview) {
    try {
      const review = JSON.parse(await readFile(REVIEW_PATH, 'utf8')) as {
        decisions?: Record<string, { decision: string }>;
      };
      for (const [path, d] of Object.entries(review.decisions ?? {})) {
        if (d.decision === 'remove') removeSet.add(path);
      }
    } catch {
      console.error(`--from-review: cannot read ${REVIEW_PATH}`);
      process.exit(1);
    }
    console.log(`--from-review: ${removeSet.size} slots marked remove`);
  }

  // Walk every static/images/<surface>/<id>/ dir; build plans.
  const plans: IdPlan[] = [];
  const surfaces = (await readdir(STATIC_IMAGES_ROOT, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  for (const surface of surfaces) {
    const surfaceDir = join(STATIC_IMAGES_ROOT, surface);
    let ids: string[] = [];
    try {
      ids = (await readdir(surfaceDir, { withFileTypes: true }))
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    } catch {
      continue;
    }
    for (const id of ids) {
      if (onlyId && id !== onlyId) continue;
      const plan = await buildPlanForId(surface, id, vision.entries);
      if (!plan) continue;
      const include = fromReview ? plan.drop.length > 0 : plan.slotsBefore > MAX_SLOTS_PER_ID;
      if (include) plans.push(plan);
    }
  }

  if (plans.length === 0) {
    console.log('Nothing to do — every gallery is within the 5-slot cap.');
    await writeReport([]);
    return;
  }

  console.log(`Found ${plans.length} galleries to prune:`);
  for (const p of plans) {
    console.log(
      `  ${p.surface}/${p.id}  ${p.slotsBefore} → ${p.keep.length} (drop ${p.drop.length})`,
    );
  }

  if (dryRun) {
    console.log('(dry run — no files changed)');
    await writeReport(plans);
    return;
  }

  // 2-pass rename + drop, then manifest updates.
  for (const plan of plans) await executePlan(plan);

  // Update vision + provenance + sidecars
  await updateVisionManifest(plans);
  await updateProvenanceManifest(plans);
  await updateSidecarManifest(FLEET_SOURCES_PATH, plans, 'fleet-galleries');
  await updateSidecarManifest(MISSION_SOURCES_PATH, plans, 'missions');

  await writeReport(plans);
  console.log(`Done — report: ${REPORT_PATH}`);
}

async function buildPlanForId(
  surface: string,
  id: string,
  visionEntries: Record<string, { score?: number; variants?: Record<string, string> }>,
): Promise<IdPlan | null> {
  const dir = join(STATIC_IMAGES_ROOT, surface, id);
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return null;
  }
  const slotMap = new Map<number, SlotInfo>();
  // First pass: capture base slot files
  for (const f of files) {
    const m = BASE_RE.exec(f);
    if (!m) continue;
    const slot = parseInt(m[1], 10);
    const ext = m[2].toLowerCase();
    const servedBase = `/images/${surface}/${id}/${f}`;
    const score = visionEntries[servedBase]?.score ?? -1;
    slotMap.set(slot, {
      slot,
      base: join(dir, f),
      ext,
      variants: {},
      servedBase,
      score,
    });
  }
  // Second pass: attach variants
  for (const f of files) {
    const m = VARIANT_RE.exec(f);
    if (!m) continue;
    const slot = parseInt(m[1], 10);
    const suf = m[2] as VariantSuffix;
    const info = slotMap.get(slot);
    if (!info) continue; // orphan variant without a base — leave alone
    info.variants[suf] = join(dir, f);
  }
  if (slotMap.size === 0) return null;
  const ranking = [...slotMap.values()].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.slot - b.slot; // ties → keep lower slot first
  });
  const keepCount = Math.min(MAX_SLOTS_PER_ID, ranking.length);
  const keepSlots = fromReview
    ? ranking.filter((sl) => !removeSet.has(sl.servedBase))
    : ranking.slice(0, keepCount);
  const dropSlots = fromReview
    ? ranking.filter((sl) => removeSet.has(sl.servedBase))
    : ranking.slice(keepCount);
  const keep = keepSlots.map((source, i) => ({ source, newSlot: i + 1 }));
  const drop = dropSlots;
  // If kept slots already line up with their new slot numbers and no
  // drops needed, this plan is a no-op.
  const renameNeeded = keep.some((k) => k.source.slot !== k.newSlot);
  const changes = drop.length > 0 || renameNeeded;
  return {
    surface,
    id,
    dir,
    slotsBefore: ranking.length,
    ranking,
    keep,
    drop,
    changes,
  };
}

async function executePlan(plan: IdPlan): Promise<void> {
  if (!plan.changes) return;
  const tmpDir = join(plan.dir, '__prune_tmp__');
  await mkdir(tmpDir, { recursive: true });

  // Pass 1: move each KEPT file (base + variants) into tmp dir under
  // its NEW slot name. After this pass, the source paths are free.
  for (const k of plan.keep) {
    const newBaseName = `${pad2(k.newSlot)}.${k.source.ext}`;
    await rename(k.source.base, join(tmpDir, newBaseName));
    for (const suf of VARIANT_SUFFIXES) {
      const srcVar = k.source.variants[suf];
      if (!srcVar) continue;
      const newVarName = `${pad2(k.newSlot)}.${suf}.${extName(srcVar)}`;
      await rename(srcVar, join(tmpDir, newVarName));
    }
  }
  // Pass 2: delete dropped files
  for (const d of plan.drop) {
    await rmIfExists(d.base);
    for (const suf of VARIANT_SUFFIXES) {
      if (d.variants[suf]) await rmIfExists(d.variants[suf]!);
    }
  }
  // Pass 3: move tmp dir contents back into final location
  const tmpFiles = await readdir(tmpDir);
  for (const f of tmpFiles) await rename(join(tmpDir, f), join(plan.dir, f));
  await rmdir(tmpDir);
}

async function rmIfExists(p: string): Promise<void> {
  try {
    await rm(p);
  } catch {
    /* fine if missing */
  }
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function extName(p: string): string {
  const e = extname(p).slice(1).toLowerCase();
  return e === 'jpeg' ? 'jpg' : e;
}

async function updateVisionManifest(plans: IdPlan[]): Promise<void> {
  const raw = JSON.parse(await readFile(VISION_PATH, 'utf8')) as {
    entries: Record<string, Record<string, unknown>>;
    [k: string]: unknown;
  };
  const entries = raw.entries;
  for (const plan of plans) {
    const idPrefix = `/images/${plan.surface}/${plan.id}/`;
    // Capture all keys belonging to this ID up-front; we'll mutate the
    // dict in-place after.
    const idKeys = Object.keys(entries).filter((k) => k.startsWith(idPrefix));
    const newEntries: Record<string, Record<string, unknown>> = {};
    // First, build a slot → newSlot lookup
    const slotRemap = new Map<number, number>();
    for (const k of plan.keep) slotRemap.set(k.source.slot, k.newSlot);
    for (const key of idKeys) {
      const tail = key.slice(idPrefix.length); // e.g. '03.jpg' or '03.16x9.jpg'
      const bm = BASE_RE.exec(tail);
      const vm = VARIANT_RE.exec(tail);
      const m = bm ?? vm;
      if (!m) {
        // unknown shape — keep as-is
        newEntries[key] = entries[key];
        continue;
      }
      const slot = parseInt(m[1], 10);
      const newSlot = slotRemap.get(slot);
      if (newSlot === undefined) continue; // dropped slot — omit
      const replaced = tail.replace(/^(\d{2})/, pad2(newSlot));
      const newKey = idPrefix + replaced;
      const entry = entries[key];
      // Rewrite the .variants object too if present.
      if (entry && typeof entry === 'object' && 'variants' in entry) {
        const vmap = entry.variants as Record<string, string> | undefined;
        if (vmap) {
          const newVmap: Record<string, string> = {};
          for (const [suf, vpath] of Object.entries(vmap)) {
            if (!vpath.startsWith(idPrefix)) {
              newVmap[suf] = vpath;
              continue;
            }
            const vtail = vpath.slice(idPrefix.length);
            const vReplaced = vtail.replace(/^(\d{2})/, pad2(newSlot));
            newVmap[suf] = idPrefix + vReplaced;
          }
          entry.variants = newVmap;
        }
      }
      newEntries[newKey] = entry;
    }
    // Replace the ID slice in entries
    for (const key of idKeys) delete entries[key];
    for (const [k, v] of Object.entries(newEntries)) entries[k] = v;
  }
  raw.entries = entries;
  await writeFile(VISION_PATH, JSON.stringify(raw, null, 2) + '\n');
}

async function updateProvenanceManifest(plans: IdPlan[]): Promise<void> {
  let raw: { entries: { path: string; [k: string]: unknown }[]; [k: string]: unknown };
  try {
    raw = JSON.parse(await readFile(PROVENANCE_PATH, 'utf8'));
  } catch {
    return;
  }
  for (const plan of plans) {
    const idPrefix = `/images/${plan.surface}/${plan.id}/`;
    const slotRemap = new Map<number, number>();
    for (const k of plan.keep) slotRemap.set(k.source.slot, k.newSlot);
    raw.entries = raw.entries
      .map((e) => {
        if (!e.path.startsWith(idPrefix)) return e;
        const tail = e.path.slice(idPrefix.length);
        const bm = BASE_RE.exec(tail);
        const vm = VARIANT_RE.exec(tail);
        const m = bm ?? vm;
        if (!m) return e;
        const slot = parseInt(m[1], 10);
        const newSlot = slotRemap.get(slot);
        if (newSlot === undefined) return null; // dropped
        const newPath = idPrefix + tail.replace(/^(\d{2})/, pad2(newSlot));
        return { ...e, path: newPath };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);
  }
  await writeFile(PROVENANCE_PATH, JSON.stringify(raw, null, 2) + '\n');
}

async function updateSidecarManifest(
  path: string,
  plans: IdPlan[],
  surfaceMatch: string,
): Promise<void> {
  if (!existsSync(path)) return;
  const raw = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
  // Each key is `<id>/<NN>` (commons-shape) or `<id>/<NN>.jpg` (legacy).
  // Rewrite keys whose IDs match this surface's plans.
  const planById = new Map<string, IdPlan>();
  for (const p of plans) if (p.surface === surfaceMatch) planById.set(p.id, p);
  if (planById.size === 0) return;
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(raw)) {
    const parts = key.split('/');
    if (parts.length < 2) {
      out[key] = val;
      continue;
    }
    const id = parts[0];
    const plan = planById.get(id);
    if (!plan) {
      out[key] = val;
      continue;
    }
    const slotPart = parts[1]; // 'NN' or 'NN.jpg'
    const slotMatch = /^(\d{2})/.exec(slotPart);
    if (!slotMatch) {
      out[key] = val;
      continue;
    }
    const slot = parseInt(slotMatch[1], 10);
    const slotRemap = new Map<number, number>();
    for (const k of plan.keep) slotRemap.set(k.source.slot, k.newSlot);
    const newSlot = slotRemap.get(slot);
    if (newSlot === undefined) continue; // dropped
    const newSlotPart = slotPart.replace(/^(\d{2})/, pad2(newSlot));
    const newKey = [id, newSlotPart, ...parts.slice(2)].join('/');
    out[newKey] = val;
  }
  await writeFile(path, JSON.stringify(out, null, 2) + '\n');
}

async function writeReport(plans: IdPlan[]): Promise<void> {
  const lines: string[] = [];
  lines.push(`# prune-image-slots — report`);
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Mode: ${dryRun ? '**DRY RUN — no files changed**' : 'apply'}`);
  lines.push('');
  lines.push(`Cap: ${MAX_SLOTS_PER_ID} base slots per gallery ID.`);
  lines.push('');
  if (plans.length === 0) {
    lines.push(`No IDs over cap — every gallery within ${MAX_SLOTS_PER_ID} slots.`);
    await writeFile(REPORT_PATH, lines.join('\n') + '\n');
    return;
  }
  lines.push(`Found ${plans.length} IDs over cap. Action plan:`);
  lines.push('');
  for (const plan of plans) {
    lines.push(`## ${plan.surface}/${plan.id}  — ${plan.slotsBefore} → ${plan.keep.length}`);
    lines.push('');
    lines.push('| Action | Old slot | Score | New slot | Path |');
    lines.push('|---|---|---|---|---|');
    for (const k of plan.keep) {
      const score = k.source.score < 0 ? '—' : `${k.source.score}`;
      lines.push(
        `| keep | ${pad2(k.source.slot)}.${k.source.ext} | ${score} | ${pad2(k.newSlot)}.${k.source.ext} | \`${k.source.servedBase}\` |`,
      );
    }
    for (const d of plan.drop) {
      const score = d.score < 0 ? '—' : `${d.score}`;
      lines.push(`| drop | ${pad2(d.slot)}.${d.ext} | ${score} | — | \`${d.servedBase}\` |`);
    }
    lines.push('');
  }
  await writeFile(REPORT_PATH, lines.join('\n') + '\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
