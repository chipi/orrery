import type { FormulaResult, Quantity } from '../spec';

/** Sidereal day (one rotation vs the stars), minutes — the ground-track drift clock for G9. */
export const SIDEREAL_DAY_MIN = 1436.068;

// Primaries a learner can orbit — resolved through the ONE launch-location model
// (radius + µ + rotation from PLANET_STATS), so the orbital formulas run on any
// body, not a hardcoded Earth. `locationModel` returns undefined for an unknown id,
// and every compute fails HONEST on undefined (review MAJOR-2 + the operator's
// "separate Earth from physics" — no silent Earth default).
export const ORBIT_BODY_IDS = ['earth', 'moon', 'mars', 'venus', 'mercury'] as const;

/** The fail-honest result for an unparseable `dateIso` input. */
export function invalidDate(assumption: string): FormulaResult {
  const values: Record<string, Quantity> = {};
  return {
    values,
    status: { ok: false, reasonKey: 'lab.f.moonphase.err-date' },
    assumptions: [assumption],
  } satisfies FormulaResult;
}
