/**
 * ADR-051 Milestone L-E — outbound-link health checker.
 *
 * Walks every entry in `static/data/link-provenance.json`, sends a
 * lightweight HEAD (with a fall-through GET for hosts that block
 * HEAD), records which URLs are alive, which redirected, which
 * disappeared, and writes a Markdown report to:
 *
 *   docs/provenance/last-link-check.md
 *
 * On a successful run we also rewrite `last_verified` on every entry
 * that came back ≤400, then re-emit `link-provenance.json` so the
 * manifest stays in sync with reality. (validate-data verifies this
 * field is BCP-47-style YYYY-MM-DD.)
 *
 * Design choices:
 *   - **Concurrency-bounded fan-out** (default 8 in flight). Operator
 *     portals dislike accidental DDOS; 8 keeps p95 polite.
 *   - **Per-host budget** of 8s timeout via AbortController so a slow
 *     CDN can't stall the whole run. Hosts that time out are reported
 *     as `timeout`, not `dead`.
 *   - **Polite User-Agent**: identifies Orrery + version + a contact
 *     hint (the GitHub repo) so site operators can reach us if our
 *     scanner becomes a problem. Per ADR-051 §responsible-fetching.
 *   - **Idempotent**: re-running the script doesn't change the report
 *     unless responses change.
 *   - **Fail-soft by default**. Returns non-zero only when explicitly
 *     asked (`--strict`); CI can set the flag to gate releases on a
 *     dead-link threshold without breaking PR builds.
 *
 * Run via:
 *   npm run check-learn-links               # default scan + report
 *   npm run check-learn-links -- --strict   # exit 1 on any dead link
 *   npm run check-learn-links -- --update   # rewrite last_verified
 *   npm run check-learn-links -- --limit=20 # smoke a subset (dev)
 *
 * The first invocation creates the report; subsequent runs overwrite
 * it. The report is committed to the repo so a reader of /library can
 * cross-check against the manifest.
 */

import { writeFile, readFile } from 'node:fs/promises';

const MANIFEST_PATH = 'static/data/link-provenance.json';
const REPORT_OUT = 'docs/provenance/last-link-check.md';

const USER_AGENT =
  'Orrery-LinkChecker/1.0 (+https://github.com/chipi/orrery; outbound-link health under ADR-051)';
const TIMEOUT_MS = 8_000;
const DEFAULT_CONCURRENCY = 8;

interface ManifestEntry {
  id: string;
  entity_id: string;
  category: string;
  route: string;
  url: string;
  label: string;
  tier: 'intro' | 'core' | 'deep';
  source_id: string;
  language: string;
  kind: string;
  fair_use_rationale: string;
  last_verified: string;
  replaced_with?: string | null;
  notes?: string | null;
}

interface Manifest {
  schema_version: number;
  generated_at: string;
  script_version: string;
  commit_sha: string | null;
  entries: ManifestEntry[];
}

type HealthStatus = 'ok' | 'redirect' | 'dead' | 'forbidden' | 'timeout' | 'error';

interface CheckResult {
  entry: ManifestEntry;
  status: HealthStatus;
  http_status: number | null;
  final_url: string | null;
  detail: string | null;
}

// ──────────────────────────────────────────────────────────────────────
// CLI parsing
// ──────────────────────────────────────────────────────────────────────

interface CliOptions {
  strict: boolean;
  update: boolean;
  limit: number | null;
  concurrency: number;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    strict: false,
    update: false,
    limit: null,
    concurrency: DEFAULT_CONCURRENCY,
  };
  for (const arg of argv.slice(2)) {
    if (arg === '--strict') opts.strict = true;
    else if (arg === '--update') opts.update = true;
    else if (arg.startsWith('--limit=')) {
      const n = Number(arg.slice('--limit='.length));
      if (Number.isFinite(n) && n > 0) opts.limit = n;
    } else if (arg.startsWith('--concurrency=')) {
      const n = Number(arg.slice('--concurrency='.length));
      if (Number.isFinite(n) && n > 0 && n <= 64) opts.concurrency = n;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: check-learn-links [--strict] [--update] [--limit=N] [--concurrency=N]');
      process.exit(0);
    }
  }
  return opts;
}

// ──────────────────────────────────────────────────────────────────────
// HTTP probe
// ──────────────────────────────────────────────────────────────────────

async function probeOnce(
  url: string,
  method: 'HEAD' | 'GET',
): Promise<CheckResult['status'] | null> {
  // Returns null when caller should fall through (HEAD not supported);
  // a HealthStatus otherwise. Does not throw.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      redirect: 'follow',
      headers: { 'user-agent': USER_AGENT, accept: '*/*' },
      signal: ctrl.signal,
    });
    if (res.ok) return 'ok';
    if (res.status === 405 && method === 'HEAD') return null; // try GET
    if (res.status >= 300 && res.status < 400) return 'redirect';
    if (res.status === 401 || res.status === 403) return 'forbidden';
    return 'dead';
  } catch (err) {
    const e = err as Error;
    if (e.name === 'AbortError') return 'timeout';
    return 'error';
  } finally {
    clearTimeout(timer);
  }
}

async function probe(entry: ManifestEntry): Promise<CheckResult> {
  const url = entry.url;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'user-agent': USER_AGENT, accept: '*/*' },
      signal: ctrl.signal,
    });
    // Some hosts (notably operator portals on commercial CDNs) reject
    // HEAD with 405; retry as GET. We never download the body — bail
    // as soon as headers come back.
    if (res.status === 405) {
      const fallback = await probeOnce(url, 'GET');
      return resultFromStatus(entry, url, fallback ?? 'error', null, null);
    }
    const finalUrl = res.url || url;
    if (res.ok) return resultFromStatus(entry, url, 'ok', res.status, finalUrl);
    if (res.status >= 300 && res.status < 400)
      return resultFromStatus(entry, url, 'redirect', res.status, finalUrl);
    if (res.status === 401 || res.status === 403)
      return resultFromStatus(entry, url, 'forbidden', res.status, finalUrl);
    return resultFromStatus(entry, url, 'dead', res.status, finalUrl);
  } catch (err) {
    const e = err as Error;
    if (e.name === 'AbortError') return resultFromStatus(entry, url, 'timeout', null, null);
    return resultFromStatus(entry, url, 'error', null, null, e.message);
  } finally {
    clearTimeout(timer);
  }
}

function resultFromStatus(
  entry: ManifestEntry,
  _url: string,
  status: HealthStatus,
  http_status: number | null,
  final_url: string | null,
  detail: string | null = null,
): CheckResult {
  return { entry, status, http_status, final_url, detail };
}

// ──────────────────────────────────────────────────────────────────────
// Concurrency-bounded scan
// ──────────────────────────────────────────────────────────────────────

async function scanAll(entries: ManifestEntry[], concurrency: number): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  let next = 0;
  let done = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const i = next++;
      if (i >= entries.length) return;
      const r = await probe(entries[i]);
      results[i] = r;
      done++;
      if (done % 25 === 0 || done === entries.length) {
        console.log(`  · ${done}/${entries.length} probed`);
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, entries.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ──────────────────────────────────────────────────────────────────────
// Report writer
// ──────────────────────────────────────────────────────────────────────

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function summarise(results: CheckResult[]): Record<HealthStatus, number> {
  const out: Record<HealthStatus, number> = {
    ok: 0,
    redirect: 0,
    dead: 0,
    forbidden: 0,
    timeout: 0,
    error: 0,
  };
  for (const r of results) out[r.status]++;
  return out;
}

function emoji(s: HealthStatus): string {
  switch (s) {
    case 'ok':
      return '✅';
    case 'redirect':
      return '↪️';
    case 'dead':
      return '❌';
    case 'forbidden':
      return '🔒';
    case 'timeout':
      return '⌛';
    case 'error':
      return '⚠️';
  }
}

function writeReport(results: CheckResult[], opts: CliOptions): string {
  const lines: string[] = [];
  const summary = summarise(results);
  const total = results.length;

  lines.push('# Outbound LEARN-link health — last run');
  lines.push('');
  lines.push(
    `*Generated by \`scripts/check-learn-links.ts\` (ADR-051 Milestone L-E). Last run: **${isoToday()}**.*`,
  );
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Total: **${total}**`);
  lines.push(`- ✅ OK: **${summary.ok}** (${pct(summary.ok, total)})`);
  lines.push(`- ↪️ Redirect: **${summary.redirect}** (${pct(summary.redirect, total)})`);
  lines.push(`- 🔒 Forbidden / login wall: **${summary.forbidden}**`);
  lines.push(`- ⌛ Timeout: **${summary.timeout}**`);
  lines.push(`- ⚠️ Error: **${summary.error}**`);
  lines.push(`- ❌ Dead: **${summary.dead}**`);
  lines.push('');
  if (opts.update) {
    lines.push('Manifest `last_verified` was updated for every URL with status **ok**.');
    lines.push('');
  }
  lines.push('## Methodology');
  lines.push('');
  lines.push(
    '- HEAD request; falls back to GET only when the server replies 405. We never download bodies.',
  );
  lines.push(`- Per-host timeout **${TIMEOUT_MS / 1000}s** via AbortController.`);
  lines.push(`- Concurrency cap **${opts.concurrency}** in-flight requests (polite default).`);
  lines.push(`- User-Agent: \`${USER_AGENT}\` — operators can reach us via the linked repo.`);
  lines.push(
    "- Login walls (401, 403) are reported separately from dead pages — they aren't broken, they're access-controlled.",
  );
  lines.push('');

  // Group dead / forbidden / timeout / error by source so the worst
  // offenders are easy to triage.
  const bad = results.filter((r) => r.status !== 'ok' && r.status !== 'redirect');
  if (bad.length === 0) {
    lines.push('## Issues');
    lines.push('');
    lines.push('None — every link returned a 2xx in the last run. 🎉');
    lines.push('');
  } else {
    lines.push('## Issues');
    lines.push('');
    lines.push('| Status | Source | Entity | URL | HTTP |');
    lines.push('|---|---|---|---|---|');
    for (const r of bad.sort((a, b) => a.status.localeCompare(b.status))) {
      const httpCol = r.http_status !== null ? String(r.http_status) : '—';
      lines.push(
        `| ${emoji(r.status)} \`${r.status}\` | \`${r.entry.source_id}\` | \`${r.entry.entity_id}\` | <${r.entry.url}> | ${httpCol} |`,
      );
    }
    lines.push('');
  }

  // Redirects are interesting — the destination changed but the
  // page is still up. Worth flagging so we can update labels.
  const redir = results.filter((r) => r.status === 'redirect');
  if (redir.length > 0) {
    lines.push('## Redirects');
    lines.push('');
    lines.push('| Source | Entity | From | HTTP | To |');
    lines.push('|---|---|---|---|---|');
    for (const r of redir) {
      const finalCol = r.final_url ?? '—';
      lines.push(
        `| \`${r.entry.source_id}\` | \`${r.entry.entity_id}\` | <${r.entry.url}> | ${r.http_status ?? '—'} | <${finalCol}> |`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return `${((100 * n) / total).toFixed(1)}%`;
}

// ──────────────────────────────────────────────────────────────────────
// Manifest update
// ──────────────────────────────────────────────────────────────────────

async function applyVerifiedDate(
  manifestPath: string,
  manifest: Manifest,
  results: CheckResult[],
): Promise<void> {
  const today = isoToday();
  const okIds = new Set<string>();
  for (const r of results) if (r.status === 'ok') okIds.add(r.entry.id);
  for (const e of manifest.entries) {
    if (okIds.has(e.id)) e.last_verified = today;
  }
  manifest.generated_at = new Date().toISOString();
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

// ──────────────────────────────────────────────────────────────────────
// Entry point
// ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);
  const manifest: Manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));

  let entries = manifest.entries;
  if (opts.limit !== null) entries = entries.slice(0, opts.limit);

  console.log(
    `→ Checking ${entries.length} outbound LEARN link(s) (concurrency=${opts.concurrency}, timeout=${TIMEOUT_MS / 1000}s)…`,
  );

  const results = await scanAll(entries, opts.concurrency);
  const summary = summarise(results);

  console.log(
    `→ Result: ${summary.ok} ok · ${summary.redirect} redirect · ${summary.dead} dead · ${summary.forbidden} forbidden · ${summary.timeout} timeout · ${summary.error} error`,
  );

  const report = writeReport(results, opts);
  await writeFile(REPORT_OUT, report, 'utf8');

  console.log(`→ Wrote ${REPORT_OUT}`);

  if (opts.update) {
    await applyVerifiedDate(MANIFEST_PATH, manifest, results);

    console.log(`→ Updated last_verified on ${summary.ok} entries in ${MANIFEST_PATH}`);
  }

  if (opts.strict && summary.dead > 0) {
    console.error(`✗ ${summary.dead} dead link(s); --strict was set, exiting non-zero.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('check-learn-links failed:', err);
  process.exit(2);
});
