// Cost-ledger append + threshold guard (PRD-016 / RFC-019 §4.4).
// $50/mo soft warn → console; $200/mo hard halt → throws.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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
  writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + '\n');
}

function recomputeMonthlyTotals(entries: LedgerEntry[]): Ledger['monthly_totals'] {
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
  const ledger = load();
  ledger.entries.push(entry);
  ledger.monthly_totals = recomputeMonthlyTotals(ledger.entries);
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
