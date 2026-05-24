/**
 * Cost ledger for AI / vision API spend (PRD-018 M12, RFC-022 §6).
 *
 * Append-only JSON ledger of per-run spending. Each entry rolls up
 * one CLI invocation (date, scope, total cost, image count, provider).
 * Per-image cost is already stored in `image-vision.json` sidecar.
 *
 * Thresholds (configurable, defaults match the v0.7 plan):
 *   soft = $50  → console.warn + non-zero exit suggestion
 *   hard = $200 → throw, refuse the run, require operator override
 *
 * Used both at run-start (forecast pre-flight check) and run-end
 * (append actual). The frontend never reads this file; it's an
 * operator/CI artefact.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';

export const LEDGER_PATH = path.join('static', 'data', 'cost-ledger.json');

export const DEFAULT_SOFT_THRESHOLD_USD = 50;
export const DEFAULT_HARD_THRESHOLD_USD = 200;

export interface LedgerEntry {
  ts: string; // ISO-8601 UTC
  scope: string; // CLI scope description (e.g. "segment=fleet-galleries new-only")
  images_processed: number;
  images_cached: number;
  cost_usd: number;
  provider: string;
  model: string;
}

export interface CostLedger {
  version: '1.0';
  thresholds: {
    soft_usd: number;
    hard_usd: number;
  };
  entries: LedgerEntry[];
}

function emptyLedger(): CostLedger {
  return {
    version: '1.0',
    thresholds: {
      soft_usd: DEFAULT_SOFT_THRESHOLD_USD,
      hard_usd: DEFAULT_HARD_THRESHOLD_USD,
    },
    entries: [],
  };
}

export async function loadLedger(): Promise<CostLedger> {
  try {
    const raw = await fs.readFile(LEDGER_PATH, 'utf-8');
    return JSON.parse(raw) as CostLedger;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return emptyLedger();
    throw err;
  }
}

export async function appendLedgerEntry(entry: LedgerEntry): Promise<CostLedger> {
  const ledger = await loadLedger();
  ledger.entries.push(entry);
  await fs.writeFile(LEDGER_PATH, JSON.stringify(ledger, null, 2) + '\n', 'utf-8');
  return ledger;
}

/** Sum of all cost entries in the ledger. */
export function totalSpend(ledger: CostLedger): number {
  return ledger.entries.reduce((sum, e) => sum + e.cost_usd, 0);
}

/** Sum of cost entries in a rolling 30-day window from `now`. */
export function rollingSpend(ledger: CostLedger, now: Date = new Date()): number {
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return ledger.entries
    .filter((e) => new Date(e.ts) >= cutoff)
    .reduce((sum, e) => sum + e.cost_usd, 0);
}

export interface ThresholdCheck {
  status: 'ok' | 'soft' | 'hard';
  spend_usd: number;
  threshold_usd: number;
  message: string;
}

/** Forecast: if `forecastUsd` is added to current rolling 30-day spend,
 *  would either threshold trip? Used pre-flight to refuse expensive
 *  whole-corpus runs without operator override. */
export function checkThresholds(ledger: CostLedger, forecastUsd: number = 0): ThresholdCheck {
  const projected = rollingSpend(ledger) + forecastUsd;
  if (projected >= ledger.thresholds.hard_usd) {
    return {
      status: 'hard',
      spend_usd: projected,
      threshold_usd: ledger.thresholds.hard_usd,
      message: `Hard threshold tripped: projected 30-day spend $${projected.toFixed(
        2,
      )} ≥ hard limit $${ledger.thresholds.hard_usd}. Operator override required.`,
    };
  }
  if (projected >= ledger.thresholds.soft_usd) {
    return {
      status: 'soft',
      spend_usd: projected,
      threshold_usd: ledger.thresholds.soft_usd,
      message: `Soft threshold reached: projected 30-day spend $${projected.toFixed(
        2,
      )} ≥ soft limit $${ledger.thresholds.soft_usd}. Continuing — review at run end.`,
    };
  }
  return {
    status: 'ok',
    spend_usd: projected,
    threshold_usd: ledger.thresholds.soft_usd,
    message: `Projected 30-day spend $${projected.toFixed(2)} (under $${ledger.thresholds.soft_usd} soft).`,
  };
}
