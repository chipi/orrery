// Off-subject review API — dev-only (0.7.3).
//
// GET  → the score-ranked list of images the vision detector flagged
//        (subject_match:false / rejected_by:off-subject), with the model's
//        subject-text + gallery + provenance, so the reviewer can confirm:
//          keep   = detector was WRONG, image is on-subject (a positive label)
//          remove = genuine off-subject junk (a negative label + re-source todo)
//        Ranked by score ASCENDING — the model-hated score-1 gross junk first
//        (that tier is the reliable, actionable list; higher scores trend to
//        false positives, so the reviewer stops when it stops being obviously
//        wrong).
// POST → { decisions: [{ path, decision: 'keep'|'remove', note? }] }
//        merged into static/data/off-subject-review.json. NON-DESTRUCTIVE —
//        it records labels; actual pruning / re-sourcing is a later step.
//        These labels also grow the detector eval set (keep→positive anchor,
//        remove→negative anchor).
//
// dev-only: not served in the static prod build.

import { json } from '@sveltejs/kit';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const VISION_PATH = resolve('static/data/image-vision.json');
const PROV_PATH = resolve('static/data/image-provenance.json');
const REVIEW_PATH = resolve('static/data/off-subject-review.json');

type VisionEntry = {
  score?: number;
  category?: string;
  subject?: string;
  subject_match?: boolean;
  rejected_by?: string;
};
type ProvEntry = { path: string; agency?: string; title?: string; source_url?: string };
type Decision = { decision: 'keep' | 'remove'; note?: string; at: string };

export async function GET() {
  const vision = (JSON.parse(await readFile(VISION_PATH, 'utf8')).entries ?? {}) as Record<
    string,
    VisionEntry
  >;

  const prov: Record<string, ProvEntry> = {};
  try {
    const arr = (JSON.parse(await readFile(PROV_PATH, 'utf8')).entries ?? []) as ProvEntry[];
    for (const e of arr) prov[e.path] = e;
  } catch {
    /* provenance optional */
  }

  let review: { decisions?: Record<string, Decision> } = {};
  try {
    review = JSON.parse(await readFile(REVIEW_PATH, 'utf8'));
  } catch {
    /* none yet */
  }

  const items = Object.entries(vision)
    .filter(
      ([p, v]) =>
        p.includes('/images/missions/') &&
        (v.rejected_by === 'off-subject' || v.subject_match === false),
    )
    .map(([path, v]) => {
      const m = path.match(/\/images\/[^/]+\/([^/]+)\/([^/]+)$/);
      return {
        path,
        entity: m?.[1] ?? '',
        slot: m?.[2] ?? '',
        score: v.score ?? null,
        category: v.category ?? null,
        subject: v.subject ?? '',
        agency: prov[path]?.agency ?? null,
        sourceUrl: prov[path]?.source_url ?? null,
        decision: review.decisions?.[path]?.decision ?? null,
        note: review.decisions?.[path]?.note ?? null,
      };
    })
    .sort((a, b) => (a.score ?? 9) - (b.score ?? 9) || a.path.localeCompare(b.path));

  const reviewed = items.filter((i) => i.decision).length;
  return json({ count: items.length, reviewed, items });
}

export async function POST({ request }) {
  const body = (await request.json()) as {
    decisions?: Array<{ path: string; decision: 'keep' | 'remove'; note?: string }>;
  };

  let review: { version: string; decisions: Record<string, Decision> } = {
    version: '1.0',
    decisions: {},
  };
  try {
    const parsed = JSON.parse(await readFile(REVIEW_PATH, 'utf8'));
    review = { version: parsed.version ?? '1.0', decisions: parsed.decisions ?? {} };
  } catch {
    /* start fresh */
  }

  const at = new Date().toISOString();
  let saved = 0;
  for (const d of body.decisions ?? []) {
    if (d.decision !== 'keep' && d.decision !== 'remove') continue;
    review.decisions[d.path] = { decision: d.decision, note: d.note?.trim() || undefined, at };
    saved++;
  }
  await writeFile(REVIEW_PATH, JSON.stringify(review, null, 2) + '\n', 'utf8');
  return json({ saved, total: Object.keys(review.decisions).length });
}
