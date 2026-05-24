#!/usr/bin/env tsx
/**
 * Build the image-pipeline audit report (PRD-018 M6, RFC-022 §8).
 *
 * Renders a static HTML report from:
 *   - static/data/image-curation.json (deny-list w/ reasons)
 *   - static/data/image-vision.json   (low-score + fallback entries)
 *   - static/data/cost-ledger.json    (recent runs + projected spend)
 *
 * Output: static/audit-report.html (gitignored — operator artefact).
 *
 * Usage:
 *   npx tsx scripts/build-audit-report.ts
 *   npx tsx scripts/build-audit-report.ts --threshold 5
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const OUT_PATH = path.join('static', 'audit-report.html');
const CURATION_PATH = path.join('static', 'data', 'image-curation.json');
const VISION_PATH = path.join('static', 'data', 'image-vision.json');
const LEDGER_PATH = path.join('static', 'data', 'cost-ledger.json');

interface CurationEntry {
  path: string;
  reason: string;
  flaggedAt: string;
}
interface VisionEntry {
  score: number;
  subject: string;
  category: string;
  fallback?: boolean;
  rejected_by?: string | null;
  scored_at?: string;
}
interface LedgerEntry {
  ts: string;
  scope: string;
  images_processed: number;
  images_cached: number;
  cost_usd: number;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c;
  });
}

async function readJsonOrEmpty<T>(p: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(p, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: { threshold: { type: 'string' } },
    strict: true,
  });
  const lowScoreCutoff = Number.parseInt(values.threshold ?? '5', 10);

  const curation = await readJsonOrEmpty<{ entries: CurationEntry[] }>(CURATION_PATH, {
    entries: [],
  });
  const vision = await readJsonOrEmpty<{ entries: Record<string, VisionEntry> }>(VISION_PATH, {
    entries: {},
  });
  const ledger = await readJsonOrEmpty<{ entries: LedgerEntry[] }>(LEDGER_PATH, {
    entries: [],
  });

  const lowScoreImages = Object.entries(vision.entries)
    .filter(([, v]) => typeof v.score === 'number' && v.score <= lowScoreCutoff)
    .sort(([, a], [, b]) => a.score - b.score)
    .slice(0, 100);

  const fallbackImages = Object.entries(vision.entries).filter(([, v]) => v.fallback);
  const rejectedImages = Object.entries(vision.entries).filter(([, v]) => v.rejected_by);

  const recentRuns = [...ledger.entries].sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 20);
  const totalSpend = ledger.entries.reduce((sum, e) => sum + e.cost_usd, 0);

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Orrery — image-pipeline audit report</title>
<style>
  body { font: 14px/1.5 system-ui, sans-serif; max-width: 1100px; margin: 1.5rem auto; padding: 0 1.5rem; color: #ddd; background: #1a1a1d; }
  h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
  h2 { font-size: 1.2rem; margin: 2rem 0 .75rem; border-bottom: 1px solid #444; padding-bottom: .25rem; }
  .sub { color: #888; font-size: .85rem; margin: 0 0 1rem; }
  table { width: 100%; border-collapse: collapse; margin: .5rem 0 1.25rem; }
  th, td { padding: .35rem .75rem; text-align: left; border-bottom: 1px solid #2a2a2d; font-size: .85rem; }
  th { color: #aaa; font-weight: 600; }
  td.score { font-weight: 700; }
  td.score.low { color: #f88; }
  td.score.mid { color: #fc4; }
  td.score.high { color: #8f8; }
  code { background: #2a2a2d; padding: 1px 4px; border-radius: 3px; font-size: .8rem; }
  .empty { color: #666; font-style: italic; padding: .5rem 0; }
  .stat { display: inline-block; margin-right: 2rem; }
  .stat-num { font-size: 1.4rem; font-weight: 700; color: #fff; }
  .stat-lbl { color: #888; font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; }
</style>
</head>
<body>
<h1>Image-pipeline audit report</h1>
<p class="sub">Generated ${esc(new Date().toISOString())} · low-score cutoff ≤ ${lowScoreCutoff}</p>

<div>
  <span class="stat"><span class="stat-num">${Object.keys(vision.entries).length}</span> <span class="stat-lbl">scored</span></span>
  <span class="stat"><span class="stat-num">${curation.entries.length}</span> <span class="stat-lbl">flagged</span></span>
  <span class="stat"><span class="stat-num">${lowScoreImages.length}</span> <span class="stat-lbl">low-score (≤ ${lowScoreCutoff})</span></span>
  <span class="stat"><span class="stat-num">${fallbackImages.length}</span> <span class="stat-lbl">fallback</span></span>
  <span class="stat"><span class="stat-num">${rejectedImages.length}</span> <span class="stat-lbl">rejected</span></span>
  <span class="stat"><span class="stat-num">$${totalSpend.toFixed(2)}</span> <span class="stat-lbl">total ledger spend</span></span>
</div>

<h2>Flagged (curation deny-list)</h2>
${
  curation.entries.length === 0
    ? '<p class="empty">No flagged entries.</p>'
    : `<table><thead><tr><th>Path</th><th>Reason</th><th>Flagged at</th></tr></thead><tbody>` +
      curation.entries
        .sort((a, b) => b.flaggedAt.localeCompare(a.flaggedAt))
        .map(
          (e) =>
            `<tr><td><code>${esc(e.path)}</code></td><td>${esc(e.reason)}</td><td>${esc(e.flaggedAt)}</td></tr>`,
        )
        .join('') +
      '</tbody></table>'
}

<h2>Low-score images (score ≤ ${lowScoreCutoff})</h2>
${
  lowScoreImages.length === 0
    ? '<p class="empty">No low-score images.</p>'
    : `<table><thead><tr><th>Score</th><th>Category</th><th>Path</th><th>Subject</th></tr></thead><tbody>` +
      lowScoreImages
        .map(([p, v]) => {
          const cls = v.score <= 3 ? 'low' : v.score <= 6 ? 'mid' : 'high';
          return `<tr><td class="score ${cls}">${v.score}</td><td>${esc(v.category)}</td><td><code>${esc(p)}</code></td><td>${esc(v.subject)}</td></tr>`;
        })
        .join('') +
      '</tbody></table>'
}

<h2>Recent scoring runs (cost ledger)</h2>
${
  recentRuns.length === 0
    ? '<p class="empty">No runs recorded.</p>'
    : `<table><thead><tr><th>Time</th><th>Scope</th><th>Processed</th><th>Cached</th><th>Cost</th></tr></thead><tbody>` +
      recentRuns
        .map(
          (r) =>
            `<tr><td>${esc(r.ts)}</td><td>${esc(r.scope)}</td><td>${r.images_processed}</td><td>${r.images_cached}</td><td>$${r.cost_usd.toFixed(2)}</td></tr>`,
        )
        .join('') +
      '</tbody></table>'
}

</body>
</html>
`;

  await fs.writeFile(OUT_PATH, html, 'utf-8');
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
