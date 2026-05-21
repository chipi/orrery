/**
 * Generates `static/audit-report-launches.html` — a gitignored dev-only
 * artefact that surfaces:
 *   1. Provenance gaps — rows where provenance_chain[0].source === 'll2'
 *      (i.e. agency-direct chain returned nothing — the prioritisation
 *      list for which agency-direct provider to improve next).
 *   2. Unmapped rocket families — source-side family strings that don't
 *      resolve to a fleet launcher via launches-rocket-mapping.json.
 *   3. Tier-reason distribution — useful for calibrating curation.
 *
 * Per RFC-023 §10. Run after `npm run fetch:launches` to inspect the
 * most recent build.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DATA_ROOT = 'static/data';
const OUT_PATH = 'static/audit-report-launches.html';

type Entry = {
  id: string;
  net: string;
  name: string;
  rocket_family: string;
  rocket_config_name: string;
  agency_name: string;
  orrery_launcher_ref: string | null;
  tier: string;
  tier_reason: string;
  provenance_chain: Array<{ source: string; role: string }>;
};

function readEntries(): Entry[] {
  const out: Entry[] = [];
  const paths = [join(DATA_ROOT, 'launches.json')];
  // Plus all historic per-decade files.
  for (const decade of [
    '1957-1969',
    '1970-1979',
    '1980-1989',
    '1990-1999',
    '2000-2009',
    '2010-2019',
    '2020-2026',
  ]) {
    paths.push(join(DATA_ROOT, 'launches-historic', `${decade}.json`));
  }
  for (const p of paths) {
    if (!existsSync(p)) continue;
    const j = JSON.parse(readFileSync(p, 'utf8')) as { entries: Record<string, Entry> };
    for (const e of Object.values(j.entries)) out.push(e);
  }
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function main(): void {
  const entries = readEntries();

  // 1. Provenance gaps.
  const ll2Only = entries
    .filter((e) => e.provenance_chain[0]?.source === 'll2')
    .sort((a, b) => a.net.localeCompare(b.net));

  // 2. Unmapped rocket families.
  const unmappedByFamily = new Map<string, number>();
  for (const e of entries) {
    if (!e.orrery_launcher_ref && e.rocket_family) {
      unmappedByFamily.set(e.rocket_family, (unmappedByFamily.get(e.rocket_family) ?? 0) + 1);
    }
  }
  const unmapped = [...unmappedByFamily.entries()].sort((a, b) => b[1] - a[1]);

  // 3. Tier-reason distribution.
  const byReason = new Map<string, number>();
  for (const e of entries) byReason.set(e.tier_reason, (byReason.get(e.tier_reason) ?? 0) + 1);
  const reasonRows = [...byReason.entries()].sort((a, b) => b[1] - a[1]);

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Launches audit report — Orrery</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #04040c; color: #e6e8ee; margin: 0; padding: 24px; }
  h1 { font-family: 'Bebas Neue', sans-serif; font-size: 28px; }
  h2 { font-family: 'Bebas Neue', sans-serif; font-size: 20px; margin-top: 32px; border-bottom: 1px solid #333; padding-bottom: 4px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { padding: 6px 10px; text-align: left; border-bottom: 1px solid #222; }
  th { color: #4ecdc4; font-weight: 600; }
  code { font-family: 'Space Mono', monospace; font-size: 12px; }
  .count { color: #ffc850; font-weight: 600; }
  .note { color: rgba(230,232,238,0.6); font-style: italic; }
</style>
</head><body>
  <h1>Launches audit report</h1>
  <p class="note">Generated ${new Date().toISOString()} · ${entries.length} total entries</p>

  <h2>1. Provenance gaps — <span class="count">${ll2Only.length}</span> rows where agency-direct sources returned nothing</h2>
  <p class="note">These are the rows the v0.2 agency-direct providers (JAXA, Roscosmos, ISRO, CNSA + improved NASA / SpaceX / ESA scrapers) should fill first.</p>
  <table>
    <thead><tr><th>NET</th><th>Vehicle</th><th>Mission</th><th>Agency</th></tr></thead>
    <tbody>
      ${ll2Only
        .slice(0, 50)
        .map(
          (e) =>
            `<tr><td><code>${escapeHtml(e.net.slice(0, 10))}</code></td><td>${escapeHtml(e.rocket_config_name)}</td><td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.agency_name)}</td></tr>`,
        )
        .join('\n')}
    </tbody>
  </table>
  ${ll2Only.length > 50 ? `<p class="note">… ${ll2Only.length - 50} more rows</p>` : ''}

  <h2>2. Unmapped rocket families — <span class="count">${unmapped.length}</span> families lack a fleet launcher mapping</h2>
  <p class="note">Add entries to <code>static/data/launches-rocket-mapping.json</code> to wire these to fleet pages.</p>
  <table>
    <thead><tr><th>Family</th><th>Count</th></tr></thead>
    <tbody>
      ${unmapped
        .slice(0, 50)
        .map(([fam, n]) => `<tr><td><code>${escapeHtml(fam)}</code></td><td>${n}</td></tr>`)
        .join('\n')}
    </tbody>
  </table>

  <h2>3. Tier-reason distribution</h2>
  <table>
    <thead><tr><th>Tier reason</th><th>Count</th></tr></thead>
    <tbody>
      ${reasonRows
        .map(
          ([r, n]) => `<tr><td><code>${escapeHtml(r)}</code></td><td>${n}</td></tr>`,
        )
        .join('\n')}
    </tbody>
  </table>
</body></html>`;
  writeFileSync(OUT_PATH, html, 'utf8');
  console.log(
    `[audit-report-launches] wrote ${OUT_PATH} — ll2-only:${ll2Only.length}, unmapped families:${unmapped.length}`,
  );
}

main();
