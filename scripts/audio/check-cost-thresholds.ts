// Audio cost-ledger threshold check (PRD-016 / RFC-019 S12, issue #161).
// Reads static/data/audio/cost-ledger.json, prints the current month's
// per-provider totals, and exits non-zero when the hard threshold is
// breached. Intended for CI gates and ad-hoc operator runs.
//
// Soft warn at $50/mo (prints, exit 0).
// Hard halt at $200/mo (prints, exit 1).
// Per PRD-016 §resolved-decisions item 11.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const LEDGER_PATH = join('static', 'data', 'audio', 'cost-ledger.json');
const SOFT = 50;
const HARD = 200;

interface Ledger {
  schema_version: number;
  generated_at: string;
  entries: Array<{ ts: string; provider: string; cost_usd: number; status?: string }>;
  monthly_totals: Record<string, Record<string, number>>;
}

function main(): void {
  if (!existsSync(LEDGER_PATH)) {
    console.log(`[audio-cost] no ledger at ${LEDGER_PATH} — nothing to check.`);
    return;
  }
  const ledger = JSON.parse(readFileSync(LEDGER_PATH, 'utf-8')) as Ledger;
  const month = new Date().toISOString().slice(0, 7);
  const perProvider = ledger.monthly_totals[month] ?? {};
  const monthTotal = Object.values(perProvider).reduce((a, b) => a + b, 0);

  console.log(`[audio-cost] month ${month}`);
  if (Object.keys(perProvider).length === 0) {
    console.log('  no spend this month.');
  } else {
    for (const [provider, usd] of Object.entries(perProvider)) {
      console.log(`  ${provider.padEnd(12)} $${usd.toFixed(2)}`);
    }
    console.log(`  ${'TOTAL'.padEnd(12)} $${monthTotal.toFixed(2)}`);
  }

  if (monthTotal >= HARD) {
    console.error(
      `\n✗ HARD threshold breached: $${monthTotal.toFixed(2)} ≥ $${HARD}. Audio pipeline halted.`,
    );
    process.exit(1);
  }
  if (monthTotal >= SOFT) {
    console.warn(
      `\n⚠ soft threshold breached: $${monthTotal.toFixed(2)} ≥ $${SOFT}. Hard halt at $${HARD}.`,
    );
  } else {
    console.log(`\n✓ under soft threshold ($${SOFT}).`);
  }
}

main();
