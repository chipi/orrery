// Staging-ground review API — dev-only (RFC-029 / #363, Slice 4 + Decision 5).
//
// GET  → lists every base image currently in static/images/_staging/ with
//        its vision score / category / rejection (if it was scored before
//        being staged) + file size, so the /dev/staging surface can render
//        a review grid.
// POST → applies marked actions in one shot:
//          { actions: [{ path, action: 'promote' | 'prune' }] }
//        - promote: move the staged file (+ its 1x1 variant) into the
//          shipped tree and append its path to image-approved.json.
//        - prune:   hard-delete the staged file (+ its 1x1 variant).
//        Returns a per-action summary. (Crediting a promoted image still
//        needs `npm run build-image-provenance` — reported back to the UI.)
//
// File ops are confined to static/images/ and reject any path that escapes
// it. dev-only: in the static prod build this endpoint isn't served.

import { error, json } from '@sveltejs/kit';
import { readFile, writeFile, readdir, stat, mkdir, rename, unlink } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

const IMAGES_DIR = resolve('static/images');
const STAGING_DIR = resolve('static/images/_staging');
const VISION_PATH = resolve('static/data/image-vision.json');
const APPROVED_PATH = resolve('static/data/image-approved.json');

const VARIANT_RE = /\.(1x1|4x3|16x9)\.(jpe?g|png|webp)$/i;
const IMG_RE = /\.(jpe?g|png|webp)$/i;

/** Guard: resolved path must stay inside static/images/. */
function safeImagesPath(p: string): string {
  const abs = resolve(p);
  if (abs !== IMAGES_DIR && !abs.startsWith(IMAGES_DIR + '/')) {
    throw error(400, `path escapes images dir: ${p}`);
  }
  return abs;
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (IMG_RE.test(e.name)) out.push(p);
  }
  return out;
}

type VisionEntry = { score?: number; category?: string; subject?: string; rejected_by?: string };

export async function GET() {
  const files = (await walk(STAGING_DIR)).filter((f) => !VARIANT_RE.test(f));
  let vision: Record<string, VisionEntry> = {};
  try {
    vision = (JSON.parse(await readFile(VISION_PATH, 'utf8')).entries ?? {}) as Record<
      string,
      VisionEntry
    >;
  } catch {
    /* vision optional */
  }

  const items = await Promise.all(
    files.map(async (abs) => {
      // /images/_staging/<rest>  (served path)  +  /images/<rest>  (main path)
      const rel = relative(STAGING_DIR, abs); // <rest>
      const stagingWebPath = '/images/_staging/' + rel;
      const mainPath = '/images/' + rel;
      const v = vision[mainPath] ?? {};
      let sizeKb = 0;
      try {
        sizeKb = Math.round((await stat(abs)).size / 1024);
      } catch {
        /* ignore */
      }
      const category = rel.split('/')[0];
      return {
        mainPath,
        stagingWebPath,
        category,
        sizeKb,
        score: v.score ?? null,
        visionCategory: v.category ?? null,
        rejectedBy: v.rejected_by ?? null,
        subject: v.subject ?? null,
      };
    }),
  );

  items.sort((a, b) => a.mainPath.localeCompare(b.mainPath));
  return json({ count: items.length, items });
}

/** Move/delete a staged base path + its 1x1 variant. Returns moved/deleted file paths. */
async function applyOne(
  mainPath: string,
  action: 'promote' | 'prune',
): Promise<{ files: string[] }> {
  if (!mainPath.startsWith('/images/') || mainPath.startsWith('/images/_staging/')) {
    throw error(400, `invalid main path: ${mainPath}`);
  }
  const rel = mainPath.slice('/images/'.length);
  // base + its 1x1 variant (e.g. NN.jpg + NN.1x1.jpg)
  const variants = [rel, rel.replace(/(\.[a-z0-9]+)$/i, '.1x1$1')];
  const touched: string[] = [];
  for (const v of variants) {
    const src = safeImagesPath(join(STAGING_DIR, v));
    try {
      await stat(src);
    } catch {
      continue; // variant not present
    }
    if (action === 'prune') {
      await unlink(src);
      touched.push('_staging/' + v);
    } else {
      const dst = safeImagesPath(join(IMAGES_DIR, v));
      await mkdir(dirname(dst), { recursive: true });
      await rename(src, dst);
      touched.push(v);
    }
  }
  return { files: touched };
}

export async function POST({ request }) {
  const body = (await request.json()) as {
    actions?: Array<{ path: string; action: 'promote' | 'prune' }>;
  };
  const actions = body.actions ?? [];
  const promoted: string[] = [];
  const pruned: string[] = [];
  const errors: Array<{ path: string; message: string }> = [];

  for (const a of actions) {
    if (a.action !== 'promote' && a.action !== 'prune') continue;
    try {
      const { files } = await applyOne(a.path, a.action);
      if (files.length) (a.action === 'promote' ? promoted : pruned).push(a.path);
    } catch (e) {
      errors.push({ path: a.path, message: e instanceof Error ? e.message : String(e) });
    }
  }

  // Append promoted paths to the durable allowlist so the next provenance
  // build credits them (and never drops them on a later rebuild).
  if (promoted.length) {
    let appr: { approved?: string[]; count?: number; [k: string]: unknown } = { approved: [] };
    try {
      appr = JSON.parse(await readFile(APPROVED_PATH, 'utf8'));
    } catch {
      /* start fresh */
    }
    const set = new Set(appr.approved ?? []);
    for (const p of promoted) {
      set.add(p);
      set.add(p.replace(/(\.[a-z0-9]+)$/i, '.1x1$1'));
    }
    appr.approved = [...set].sort();
    appr.count = appr.approved.length;
    await writeFile(APPROVED_PATH, JSON.stringify(appr, null, 2) + '\n', 'utf8');
  }

  return json({
    promoted: promoted.length,
    pruned: pruned.length,
    errors,
    note: promoted.length
      ? 'Promoted images appended to image-approved.json. Run `npm run build-image-provenance` (use --offline to skip Wikimedia) to credit them on /credits.'
      : undefined,
  });
}
