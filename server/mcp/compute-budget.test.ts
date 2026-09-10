/**
 * MCP compute budget (H · #464). The S4 "domain gate" never gated CALLS — the
 * call handler has always run the full registry (see index.ts). So the moment
 * the *listing* gate lifts, every authed client can call the heaviest formula,
 * `entry-range-control`, directly. There is no worker thread (operator
 * decision): the guarantee that keeps that safe is that the worst case is
 * small and bounded. This suite arms that guarantee two ways —
 *
 *   1. STRUCTURAL: pin the loop caps that set the per-sim / per-solve ceiling,
 *      so a change to dt, the max integration time, or the bisection count is a
 *      deliberate, reviewed edit rather than a silent compute-budget blowout.
 *   2. WALL-CLOCK: call `entry-range-control` through the real MCP `callTool`
 *      path at every corner of its FieldSpec input box and assert each finishes
 *      well under a generous bound (~250 ms actual; 2 s here for CI headroom).
 */
import { describe, it, expect } from 'vitest';
import { REGISTRY } from '$lib/physics/registry';
import { callTool } from './registry-tools';
import { makeT } from './i18n';
import {
  ENTRY_SIM_DT_S,
  ENTRY_SIM_MAX_T_S,
  ENTRY_SIM_MAX_STEPS,
  ENTRY_BISECTION_ITERS,
} from '$lib/physics/systems/entry-steering';

const t = makeT('en-US');

describe('MCP compute budget — the ungated call path is bounded (H · #464)', () => {
  it('pins the entry-sim loop caps (a change here is a deliberate compute-budget edit)', () => {
    expect(ENTRY_SIM_DT_S).toBe(0.05);
    expect(ENTRY_SIM_MAX_T_S).toBe(1400);
    // The per-sim step ceiling = max integration time / step. Every
    // `simulateLiftingEntry` call runs at most this many integration steps.
    expect(ENTRY_SIM_MAX_STEPS).toBe(28_000);
    expect(ENTRY_BISECTION_ITERS).toBe(28);
  });

  it('entry-range-control computes under budget at every FieldSpec corner', () => {
    // The full input box (registry: liftToDrag 0.1–0.5, targetRangeKm
    // 2000–4500, entryAngleDeg 1–3). The 8 corners bracket the worst case.
    const corners = {
      liftToDrag: [0.1, 0.5],
      targetRangeKm: [2000, 4500],
      entryAngleDeg: [1, 3],
    };
    let worstMs = 0;
    for (const liftToDrag of corners.liftToDrag) {
      for (const targetRangeKm of corners.targetRangeKm) {
        for (const entryAngleDeg of corners.entryAngleDeg) {
          const start = performance.now();
          const { result } = callTool(
            REGISTRY,
            'entry-range-control',
            { liftToDrag, targetRangeKm, entryAngleDeg },
            t,
          );
          const ms = performance.now() - start;
          worstMs = Math.max(worstMs, ms);
          // It computes (fail-honest is fine — an out-of-footprint target
          // clamps with status.ok=false); what matters is it returns bounded.
          expect(result.values).toBeDefined();
          expect(ms).toBeLessThan(2000);
        }
      }
    }
    expect(worstMs).toBeLessThan(2000);
    // 8 corners × a full lifting-entry bisection solve. The per-call 2 s
    // assertion above is the actual compute-budget guard and is unchanged —
    // this wrapper budget only stops vitest's 5 s default from failing the
    // suite on machine load (timed out at 5.7 s under v8 coverage on
    // 2026-09-10 while every individual call stayed well inside 2 s).
  }, 30_000);
});
