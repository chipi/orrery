/**
 * ARMS the built→goal coverage direction (P1 · #525 · D8 release-exit gate,
 * grand-review BLOCKER-1). The manifest's `covered` rows are VERIFIED here —
 * a row can only claim coverage if a goal mechanically reaches it — and no
 * capability can be silently uncovered (exhaustive records + this test).
 * Release exit (#464) additionally asserts `pendingCapabilities()` is empty.
 */
import { describe, it, expect } from 'vitest';
import { REGISTRY } from './index';
import { GOALS } from './goals';
import {
  DOMAIN_CAPABILITIES,
  DESCENT_BODY_CAPABILITIES,
  pendingCapabilities,
} from './capability-manifest';

/** Formula ids reachable from any goal path. */
function goalReachableFormulaIds(): Set<string> {
  const ids = new Set<string>();
  for (const g of GOALS.values()) for (const step of g.path) ids.add(step.formulaId);
  return ids;
}

/**
 * Body ids a goal mechanically reaches THROUGH THE DESCENT DOMAIN: via a
 * goal-step descent formula's body-field domain, its presetInputs pin, or its
 * default. Deliberately narrow — venus sitting in an atmosphere-formula
 * dropdown does NOT make a Venus-descent capability "pulled" (the A8 bar is a
 * descent goal, PRD-033 A01.5); only descent-domain reachability counts here.
 */
function goalReachableDescentBodyIds(): Set<string> {
  const bodies = new Set<string>();
  for (const g of GOALS.values()) {
    for (const step of g.path) {
      const def = REGISTRY.get(step.formulaId);
      if (!def || def.domain !== 'descent') continue;
      for (const field of def.inputs) {
        if (field.kind !== 'body') continue;
        // STRICT: only a presetInputs pin or the formula default counts as
        // "pulled" — mere bodyIds dropdown membership does not (venus/mercury
        // sit in terminal-velocity's list today with no Venus/Mercury goal).
        const preset = step.presetInputs?.[field.key];
        if (typeof preset === 'string') bodies.add(preset);
        else if (typeof field.default === 'string') bodies.add(field.default);
      }
    }
  }
  return bodies;
}

describe('capability manifest · built→goal gate (armed)', () => {
  it('every `covered` domain row verifies: ≥1 goal-reachable formula in that domain', () => {
    const reachable = goalReachableFormulaIds();
    const domainsReached = new Set(
      [...REGISTRY.values()].filter((d) => reachable.has(d.id)).map((d) => d.domain),
    );
    for (const [domain, row] of Object.entries(DOMAIN_CAPABILITIES)) {
      if (row.status === 'covered') {
        expect(domainsReached.has(domain as never), `domain '${domain}' claims covered`).toBe(true);
      }
    }
  });

  it('every `covered` descent-body row verifies: a goal mechanically reaches the body', () => {
    const reached = goalReachableDescentBodyIds();
    for (const [body, row] of Object.entries(DESCENT_BODY_CAPABILITIES)) {
      if (row.status === 'covered') {
        expect(reached.has(body), `descent body '${body}' claims covered`).toBe(true);
      }
    }
  });

  it('no capability regresses silently: a goal-reached body may not sit `pending`', () => {
    // The inverse direction: when a Phase-2 slice lands its goal, the manifest
    // row MUST flip to covered in the same slice — a stale `pending` is drift.
    const reached = goalReachableDescentBodyIds();
    for (const [body, row] of Object.entries(DESCENT_BODY_CAPABILITIES)) {
      if (row.status === 'pending') {
        expect(reached.has(body), `'${body}' is goal-reached but still marked pending`).toBe(false);
      }
    }
  });

  it('the pending set is exactly the tracked Phase-2 remainder (drift alarm)', () => {
    // Deliberately explicit: this list SHRINKS as P2–P7 land and must be []
    // at release exit (#464). Editing it means touching the manifest — good.
    expect(pendingCapabilities().sort()).toEqual(
      [
        'domain:propulsion (#531)',
        'descent-body:jupiter (#528)',
        'descent-body:comet_67p (#529)',
        'descent-body:itokawa (#529)',
        'descent-body:ryugu (#529)',
        'descent-body:bennu (#529)',
        'descent-body:eros (#529)',
      ].sort(),
    );
  });
});
