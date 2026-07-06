// New-images review API — dev-only (0.7.3).
//
// GET  → the images a fill-gallery-gaps batch ADDED since HEAD (from
//        scripts/collect-new-images.mjs → static/data/new-images-review.json),
//        each with its gallery + source + license. Every image already passed
//        the vision quality-gate; this is the human sanity-check surface.
//          keep   = good (default) · remove = drop it before commit
// POST → { decisions: [{ path, decision: 'keep'|'remove' }] } merged into
//        new-images-review.json. NON-DESTRUCTIVE — the actual prune of
//        'remove' slots is a separate step.
//
// dev-only: not served in the static prod build.

import { json } from '@sveltejs/kit';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const REVIEW_PATH = resolve('static/data/new-images-review.json');

type Item = {
  path: string;
  surface: string;
  gallery: string;
  source: string;
  sourceUrl: string | null;
  license: string | null;
};
type Decision = { decision: 'keep' | 'remove'; at: string };

export async function GET() {
  const data = JSON.parse(await readFile(REVIEW_PATH, 'utf8')) as {
    items?: Item[];
    decisions?: Record<string, Decision>;
  };
  const decisions = data.decisions ?? {};
  const items = (data.items ?? []).map((i) => ({
    ...i,
    decision: decisions[i.path]?.decision ?? null,
  }));
  const reviewed = items.filter((i) => i.decision).length;
  return json({ count: items.length, reviewed, items });
}

export async function POST({ request }) {
  const body = (await request.json()) as {
    decisions?: Array<{ path: string; decision: 'keep' | 'remove' }>;
  };
  const data = JSON.parse(await readFile(REVIEW_PATH, 'utf8')) as {
    decisions?: Record<string, Decision>;
    [k: string]: unknown;
  };
  data.decisions = data.decisions ?? {};
  const at = new Date().toISOString();
  let saved = 0;
  for (const d of body.decisions ?? []) {
    if (d.decision !== 'keep' && d.decision !== 'remove') continue;
    data.decisions[d.path] = { decision: d.decision, at };
    saved++;
  }
  await writeFile(REVIEW_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return json({ saved, total: Object.keys(data.decisions).length });
}
