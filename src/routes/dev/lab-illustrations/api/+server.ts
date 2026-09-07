/**
 * File-backed approval API for Lab illustrations (G · #536) — dev server
 * ONLY (the /dev layout guard + adapter-static make this unreachable in any
 * deployed build). The per-image approval rule made executable:
 *
 *   GET  → { candidates: [goalId…], approved: [goalId…] }
 *          (candidates = files in static/images/lab/goals/_staging/)
 *   POST { action: 'approve', goalId, model } →
 *          move _staging/<id>.webp → goals/<id>.webp,
 *          append manifest entry + provenance record (operator_approved = now)
 *   POST { action: 'reject', goalId } → delete the staging file
 *
 * The alt text ×14 is NOT written here — approving adds the altKey and the
 * fail-closed illustration.test then demands the en-US authoring + the parity
 * gate demands the ×13, so an approved image cannot ship silently untranslated.
 */
import { json } from '@sveltejs/kit';
import { GOALS } from '$lib/physics/registry/goals';
import {
  readdirSync,
  existsSync,
  renameSync,
  unlinkSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import type { RequestHandler } from './$types';

const STAGING = 'static/images/lab/goals/_staging';
const FINAL = 'static/images/lab/goals';
const MANIFEST = 'static/data/lab-illustrations.json';
const PROVENANCE = 'static/data/lab-illustration-provenance.json';

export const GET: RequestHandler = () => {
  const candidates = existsSync(STAGING)
    ? readdirSync(STAGING)
        .filter((f) => f.endsWith('.webp'))
        .map((f) => f.replace(/\.webp$/, ''))
    : [];
  const approved = (JSON.parse(readFileSync(MANIFEST, 'utf8')) as { goalId: string }[]).map(
    (i) => i.goalId,
  );
  return json({ candidates, approved });
};

export const POST: RequestHandler = async ({ request }) => {
  const { action, goalId, model } = (await request.json()) as {
    action: 'approve' | 'reject';
    goalId: string;
    model?: string;
  };
  if (!/^[a-z0-9-]+$/.test(goalId)) return json({ error: 'bad goalId' }, { status: 400 });
  // Server-side registry check (holistic m-2) — the red must land BEFORE the
  // file moves, not in a unit test afterwards.
  if (action === 'approve' && !GOALS.has(goalId))
    return json({ error: 'unknown goal' }, { status: 400 });
  const stagingFile = `${STAGING}/${goalId}.webp`;
  if (!existsSync(stagingFile)) return json({ error: 'no such candidate' }, { status: 404 });

  if (action === 'reject') {
    unlinkSync(stagingFile);
    return json({ ok: true });
  }

  renameSync(stagingFile, `${FINAL}/${goalId}.webp`);
  // Replace-not-duplicate (holistic MINOR-3): re-approving a regenerated
  // candidate updates the existing records instead of accumulating them.
  const manifest = (JSON.parse(readFileSync(MANIFEST, 'utf8')) as Record<string, string>[]).filter(
    (e) => e.goalId !== goalId,
  );
  manifest.push({
    goalId,
    file: `images/lab/goals/${goalId}.webp`,
    altKey: `lab.illustration.alt.${goalId}`,
    model: model ?? 'nano_banana_pro',
    generated: new Date().toISOString().slice(0, 10),
  });
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  const prov = JSON.parse(readFileSync(PROVENANCE, 'utf8')) as {
    records: Record<string, string>[];
  } & Record<string, unknown>;
  prov.records = prov.records.filter((r) => r.goalId !== goalId);
  prov.records.push({
    goalId,
    model: model ?? 'nano_banana_pro',
    tool: 'higgsfield',
    generated: new Date().toISOString().slice(0, 10),
    operator_approved: new Date().toISOString(),
  });
  writeFileSync(PROVENANCE, JSON.stringify(prov, null, 2) + '\n');
  return json({ ok: true });
};
