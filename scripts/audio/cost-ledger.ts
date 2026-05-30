// Cost-ledger append + threshold guard (PRD-016 / RFC-019 §4.4).
// $50/mo soft warn → console; $200/mo hard halt → throws.
//
// Storage contract:
// - `ts` values MUST be UTC ISO-8601 strings; the YYYY-MM bucket is the
//   first 7 chars. Callers (generate.ts) always pass `new Date().toISOString()`
//   which is UTC by definition. assertUtcTs() catches local-time drift.
// - Writes are atomic — tmp-file + rename — so a process crash mid-write
//   leaves the prior valid ledger in place rather than truncating it.
// - Per-append totals are incremental (constant time) instead of
//   recomputing the full O(n) sweep on every entry. Pipeline-wide
//   rebuilds remain O(n) via recomputeMonthlyTotals().

import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const LEDGER_PATH = join('static', 'data', 'audio', 'cost-ledger.json');
const SOFT_THRESHOLD_USD = 50;
const HARD_THRESHOLD_USD = 200;

export interface LedgerEntry {
  ts: string;
  provider: 'google' | 'elevenlabs' | 'openai' | 'azure' | 'coqui-local';
  locale: string;
  persona: 'curator' | 'guide' | 'enthusiast';
  episode_id: string;
  chars: number;
  cost_usd: number;
  voice_id?: string;
  status?: 'success' | 'failed' | 'cached';
}

interface Ledger {
  schema_version: 1;
  generated_at: string;
  entries: LedgerEntry[];
  monthly_totals: Record<string, Record<string, number>>;
}

function load(): Ledger {
  if (!existsSync(LEDGER_PATH)) {
    return {
      schema_version: 1,
      generated_at: new Date().toISOString(),
      entries: [],
      monthly_totals: {},
    };
  }
  return JSON.parse(readFileSync(LEDGER_PATH, 'utf-8')) as Ledger;
}

function save(ledger: Ledger): void {
  const tmp = `${LEDGER_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(ledger, null, 2) + '\n');
  renameSync(tmp, LEDGER_PATH);
}

function assertUtcTs(ts: string): void {
  // Catch local-time drift early. ISO-8601 UTC always ends with `Z` or
  // a numeric offset; `new Date().toISOString()` always yields the `Z`
  // form. A bare `YYYY-MM-DDTHH:MM:SS` slipped in by a future caller
  // would bucket wrong on month boundaries.
  if (!/Z$|[+-]\d\d:?\d\d$/.test(ts)) {
    throw new Error(`cost-ledger entry ts must be UTC ISO-8601 (got: '${ts}')`);
  }
}

export function recomputeMonthlyTotals(entries: LedgerEntry[]): Ledger['monthly_totals'] {
  const totals: Ledger['monthly_totals'] = {};
  for (const e of entries) {
    // Failed entries are kept defensively — generate.ts currently throws
    // before appendEntry runs on failure, so no `failed` rows reach the
    // ledger today, but the filter is here so a future "log-failures"
    // change doesn't accidentally count them toward billed totals.
    if (e.status === 'failed') continue;
    const month = e.ts.slice(0, 7);
    totals[month] ??= {};
    totals[month][e.provider] = (totals[month][e.provider] ?? 0) + e.cost_usd;
  }
  return totals;
}

export function appendEntry(entry: LedgerEntry): {
  soft: boolean;
  hard: boolean;
  monthTotal: number;
} {
  assertUtcTs(entry.ts);
  const ledger = load();
  ledger.entries.push(entry);
  // Incremental update — keep the persisted totals consistent with the
  // entries array without recomputing across all history.
  if (entry.status !== 'failed') {
    const month = entry.ts.slice(0, 7);
    ledger.monthly_totals[month] ??= {};
    ledger.monthly_totals[month][entry.provider] =
      (ledger.monthly_totals[month][entry.provider] ?? 0) + entry.cost_usd;
  }
  ledger.generated_at = new Date().toISOString();
  save(ledger);

  const month = entry.ts.slice(0, 7);
  const monthTotal = Object.values(ledger.monthly_totals[month] ?? {}).reduce((a, b) => a + b, 0);
  return {
    soft: monthTotal >= SOFT_THRESHOLD_USD,
    hard: monthTotal >= HARD_THRESHOLD_USD,
    monthTotal,
  };
}

export function currentMonthTotal(): number {
  const ledger = load();
  const month = new Date().toISOString().slice(0, 7);
  return Object.values(ledger.monthly_totals[month] ?? {}).reduce((a, b) => a + b, 0);
}

export function assertUnderHardCap(): void {
  const total = currentMonthTotal();
  if (total >= HARD_THRESHOLD_USD) {
    throw new Error(
      `Audio cost-ledger HARD threshold breached: $${total.toFixed(2)} ≥ $${HARD_THRESHOLD_USD}. Aborting pipeline.`,
    );
  }
}

export const THRESHOLDS = { soft: SOFT_THRESHOLD_USD, hard: HARD_THRESHOLD_USD } as const;
