import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// cost-ledger.ts reads/writes static/data/audio/cost-ledger.json relative
// to process.cwd(). To unit-test without clobbering the real ledger, we
// cd into a temp directory for the duration of each test.

const ORIG_CWD = process.cwd();

let tmp: string;
let appendEntry: typeof import('./cost-ledger').appendEntry;
let currentMonthTotal: typeof import('./cost-ledger').currentMonthTotal;
let assertUnderHardCap: typeof import('./cost-ledger').assertUnderHardCap;
let THRESHOLDS: typeof import('./cost-ledger').THRESHOLDS;

beforeEach(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'audio-ledger-'));
  mkdirSync(join(tmp, 'static', 'data', 'audio'), { recursive: true });
  process.chdir(tmp);
  // Force a re-import so the module's cache is fresh against the new cwd.
  // (The module reads/writes at runtime so cwd at import time doesn't bind.)
  const mod = await import('./cost-ledger?fresh=' + Date.now());
  appendEntry = mod.appendEntry;
  currentMonthTotal = mod.currentMonthTotal;
  assertUnderHardCap = mod.assertUnderHardCap;
  THRESHOLDS = mod.THRESHOLDS;
});

afterEach(() => {
  process.chdir(ORIG_CWD);
  rmSync(tmp, { recursive: true, force: true });
});

const sampleEntry = (overrides: Partial<Parameters<typeof appendEntry>[0]> = {}) => ({
  ts: '2026-05-29T12:00:00.000Z',
  provider: 'google' as const,
  locale: 'en-US',
  persona: 'curator' as const,
  episode_id: 'pale-blue-dot',
  chars: 1500,
  cost_usd: 0.024,
  voice_id: 'en-US-Neural2-J',
  status: 'success' as const,
  ...overrides,
});

describe('cost-ledger', () => {
  it('appendEntry creates a fresh ledger if none exists', () => {
    const result = appendEntry(sampleEntry());
    expect(result.monthTotal).toBeCloseTo(0.024, 6);
    expect(result.soft).toBe(false);
    expect(result.hard).toBe(false);

    const ledger = JSON.parse(
      readFileSync(join(tmp, 'static/data/audio/cost-ledger.json'), 'utf-8'),
    );
    expect(ledger.entries.length).toBe(1);
    expect(ledger.monthly_totals['2026-05'].google).toBeCloseTo(0.024, 6);
  });

  it('appendEntry accumulates per provider per month', () => {
    appendEntry(sampleEntry({ provider: 'google', cost_usd: 0.5 }));
    appendEntry(sampleEntry({ provider: 'google', cost_usd: 0.5 }));
    appendEntry(sampleEntry({ provider: 'elevenlabs', cost_usd: 2.0 }));
    const total = currentMonthTotalInTestMonth('2026-05');
    expect(total.google).toBeCloseTo(1.0, 6);
    expect(total.elevenlabs).toBeCloseTo(2.0, 6);
  });

  it('flips soft=true at >= $50/mo', () => {
    appendEntry(sampleEntry({ cost_usd: 25 }));
    const r2 = appendEntry(sampleEntry({ cost_usd: 25 }));
    expect(r2.soft).toBe(true);
    expect(r2.hard).toBe(false);
    expect(r2.monthTotal).toBeCloseTo(50, 6);
  });

  it('flips hard=true at >= $200/mo', () => {
    appendEntry(sampleEntry({ cost_usd: 100 }));
    const r2 = appendEntry(sampleEntry({ cost_usd: 100 }));
    expect(r2.hard).toBe(true);
    expect(r2.monthTotal).toBeCloseTo(200, 6);
  });

  it('separates totals by month', () => {
    appendEntry(sampleEntry({ ts: '2026-05-15T10:00:00.000Z', cost_usd: 10 }));
    appendEntry(sampleEntry({ ts: '2026-06-01T10:00:00.000Z', cost_usd: 5 }));
    const ledger = JSON.parse(
      readFileSync(join(tmp, 'static/data/audio/cost-ledger.json'), 'utf-8'),
    );
    expect(ledger.monthly_totals['2026-05'].google).toBeCloseTo(10, 6);
    expect(ledger.monthly_totals['2026-06'].google).toBeCloseTo(5, 6);
  });

  it('THRESHOLDS exports the soft/hard caps for shared consumption', () => {
    expect(THRESHOLDS.soft).toBe(50);
    expect(THRESHOLDS.hard).toBe(200);
  });

  it('assertUnderHardCap throws when over $200 in the current month', () => {
    // Set the system clock by manipulating ts to match the current month.
    const month = new Date().toISOString().slice(0, 7);
    appendEntry(sampleEntry({ ts: `${month}-15T10:00:00.000Z`, cost_usd: 250 }));
    expect(() => assertUnderHardCap()).toThrow(/HARD threshold/);
  });

  it('assertUnderHardCap passes when under $200', () => {
    const month = new Date().toISOString().slice(0, 7);
    appendEntry(sampleEntry({ ts: `${month}-15T10:00:00.000Z`, cost_usd: 5 }));
    expect(() => assertUnderHardCap()).not.toThrow();
  });

  it('failed entries do NOT count toward monthly totals (defensive filter)', () => {
    appendEntry(sampleEntry({ cost_usd: 10, status: 'success' }));
    appendEntry(sampleEntry({ cost_usd: 5, status: 'failed' }));
    const ledger = JSON.parse(
      readFileSync(join(tmp, 'static/data/audio/cost-ledger.json'), 'utf-8'),
    );
    expect(ledger.monthly_totals['2026-05'].google).toBeCloseTo(10, 6);
  });
});

function currentMonthTotalInTestMonth(month: string): Record<string, number> {
  const ledger = JSON.parse(
    readFileSync(join(tmp, 'static/data/audio/cost-ledger.json'), 'utf-8'),
  );
  return ledger.monthly_totals[month] ?? {};
}
