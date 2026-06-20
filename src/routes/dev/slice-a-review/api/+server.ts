// Slice A v3 approval persistence endpoint — dev-only.
//
// Receives one decision at a time and merges it into
// `static/data/slice-a-approvals.json`. The file is the source of
// truth: the agent reads it directly to see Marko's decisions, and
// `scripts/slice-a-apply.mjs --approvals=…` consumes it later to gate
// the actual image swaps + honour overrides.
//
// Payload shape (POST application/json):
//   {
//     proposal_id: string,
//     status: 'approved' | 'rejected' | 'pending' | 'needs-manual',
//     comment?: string,
//     tags?: string[],            // categorical exceptions for the pipeline
//                                 // (e.g. 'wrong-mission', 'low-resolution',
//                                 // 'credit-incorrect', 'needs-manual-source')
//     overrides?: {               // optional patches applied at slice-a-apply
//       credit?: string,
//       license?: string,
//       image_url?: string,       // swap to a different source entirely
//       source_type?: string,
//       source_url?: string
//     }
//   }
//
// File shape:
//   {
//     reviewer: 'marko',
//     last_updated_at: ISO-8601,
//     decisions: {
//       <proposal_id>: { status, comment, tags[], overrides, updated_at }
//     }
//   }

import { error, json } from '@sveltejs/kit';
import { readFile, writeFile } from 'node:fs/promises';

// Two datasets share this endpoint (slice-a + bodies). Switched via
// ?dataset=… query param; defaults to slice-a for backward compat.
const APPROVALS_PATHS: Record<string, string> = {
  'slice-a': 'static/data/slice-a-approvals.json',
  bodies: 'static/data/bodies-approvals.json',
};

function resolveApprovalsPath(url: URL): string {
  const d = url.searchParams.get('dataset') ?? 'slice-a';
  return APPROVALS_PATHS[d] ?? APPROVALS_PATHS['slice-a'];
}

const VALID_STATUS = new Set(['approved', 'rejected', 'pending', 'needs-manual']);

type Decision = {
  status: 'approved' | 'rejected' | 'needs-manual' | 'pending';
  comment: string;
  tags: string[];
  overrides: Record<string, string>;
  updated_at: string;
};
type ApprovalsFile = {
  reviewer: string;
  last_updated_at: string | null;
  decisions: Record<string, Decision>;
};

async function loadCurrent(path: string): Promise<ApprovalsFile> {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return { reviewer: 'marko', last_updated_at: null, decisions: {} };
  }
}

function sanitizeOverrides(input: unknown): Record<string, string> {
  if (!input || typeof input !== 'object') return {};
  const allowed = ['credit', 'license', 'image_url', 'source_type', 'source_url'];
  const out: Record<string, string> = {};
  for (const k of allowed) {
    const v = (input as Record<string, unknown>)[k];
    if (typeof v === 'string' && v.trim().length > 0) out[k] = v.trim().slice(0, 2000);
  }
  return out;
}

function sanitizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const t of input) {
    if (typeof t === 'string' && t.trim()) out.push(t.trim().slice(0, 80));
    if (out.length >= 20) break;
  }
  return [...new Set(out)];
}

export async function POST({ request, url }: { request: Request; url: URL }) {
  const body = (await request.json()) as {
    proposal_id?: string;
    status?: string;
    comment?: string;
    tags?: unknown;
    overrides?: unknown;
  };
  if (!body.proposal_id || !body.status) throw error(400, 'proposal_id and status required');
  if (!VALID_STATUS.has(body.status)) throw error(400, `invalid status ${body.status}`);

  const path = resolveApprovalsPath(url);
  const current = await loadCurrent(path);
  const now = new Date().toISOString();
  // 'pending' is a REAL stored status now (was previously a delete signal).
  // Marko's allowed to leave a comment / tag / override on a skipped card so
  // the next review round explains why he set it aside.
  current.decisions[body.proposal_id] = {
    status: body.status as Decision['status'],
    comment: typeof body.comment === 'string' ? body.comment.slice(0, 2000) : '',
    tags: sanitizeTags(body.tags),
    overrides: sanitizeOverrides(body.overrides),
    updated_at: now,
  };
  current.last_updated_at = now;

  await writeFile(path, JSON.stringify(current, null, 2) + '\n', 'utf8');

  return json({ ok: true, decisions: current.decisions, last_updated_at: current.last_updated_at });
}

export async function GET({ url }: { url: URL }) {
  const current = await loadCurrent(resolveApprovalsPath(url));
  return json(current);
}
