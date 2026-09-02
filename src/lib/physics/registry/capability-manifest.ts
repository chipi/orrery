/**
 * The kernel capability manifest (P1 · #525 · RFC-037 A01.3 / D8).
 *
 * The MACHINE-READABLE half of the bidirectional coverage guarantee: the
 * goal→formula direction has been armed since S2c (`goals.test.ts`); this file
 * arms the built→goal direction — "every kernel capability has a pulling goal"
 * (PRD-033 A01.5) — which until now was a comment, not an assertion (2026-09-01
 * grand-review BLOCKER-1).
 *
 * Shape: TYPE-EXHAUSTIVE records over the kernel's own unions. Adding a
 * `DescentBody` member or a `FormulaDef` domain WITHOUT a manifest row is a
 * compile error — the manifest cannot silently rot behind the kernel.
 *
 * Row statuses:
 *  - `covered`  — a goal mechanically reaches this capability; VERIFIED by
 *    `capability-manifest.test.ts` (a `covered` row that stops verifying fails
 *    CI — no aspirational rows).
 *  - `pending`  — built but not yet pulled by a goal; MUST name the tracking
 *    issue. The pending set is the CI-visible Phase-2 remainder; release exit
 *    (S6 · #464) asserts it is EMPTY.
 *  - `excluded` — deliberately not goal-pulled; MUST carry the rationale
 *    (decision-record style, e.g. the P7 propulsion outcome).
 */
import type { FormulaDef } from '../spec';
import type { DescentBody } from '../descent/descent-physics';

export type CapabilityRow =
  | { status: 'covered' }
  | { status: 'pending'; trackedBy: `#${number}` }
  | { status: 'excluded'; rationale: string };

/** Formula domains (mirrors `FormulaDef['domain']` — exhaustive by type). */
export const DOMAIN_CAPABILITIES: Record<FormulaDef['domain'], CapabilityRow> = {
  ephemeris: { status: 'covered' },
  transfer: { status: 'covered' },
  ascent: { status: 'covered' },
  descent: { status: 'covered' },
  satellite: { status: 'covered' },
  mechanics: { status: 'covered' },
  // ~22 engines live in propulsion/engine-registry.ts with zero FormulaDefs —
  // register formulas or record the exclusion; the P7 decision resolves this row.
  propulsion: { status: 'pending', trackedBy: '#531' },
};

/**
 * EDL bodies the descent integrator models (mirrors `DescentBody` — exhaustive
 * by type). "Covered" = a goal's path reaches a formula whose body domain
 * includes the id, or pins it via presetInputs (the mechanical check in the
 * test). The pending fan-out is the A8 block (#524).
 */
export const DESCENT_BODY_CAPABILITIES: Record<DescentBody, CapabilityRow> = {
  moon: { status: 'covered' },
  mars: { status: 'covered' },
  earth: { status: 'covered' },
  venus: { status: 'pending', trackedBy: '#526' },
  titan: { status: 'pending', trackedBy: '#527' },
  jupiter: { status: 'pending', trackedBy: '#528' },
  comet_67p: { status: 'pending', trackedBy: '#529' },
  itokawa: { status: 'pending', trackedBy: '#529' },
  ryugu: { status: 'pending', trackedBy: '#529' },
  bennu: { status: 'pending', trackedBy: '#529' },
  eros: { status: 'pending', trackedBy: '#529' },
};

/** The release-exit view: capabilities still awaiting their pulling goal. */
export function pendingCapabilities(): string[] {
  const out: string[] = [];
  for (const [id, row] of Object.entries(DOMAIN_CAPABILITIES)) {
    if (row.status === 'pending') out.push(`domain:${id} (${row.trackedBy})`);
  }
  for (const [id, row] of Object.entries(DESCENT_BODY_CAPABILITIES)) {
    if (row.status === 'pending') out.push(`descent-body:${id} (${row.trackedBy})`);
  }
  return out;
}
