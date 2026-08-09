/**
 * `/explore` scale-shell controller (RFC-036 WS-C/C1) — the pure, framework-agnostic
 * decision core of the scale-shell orchestration.
 *
 * `/explore`'s "acts" are the scale-shells — solar-system → neighborhood → milky-way
 * → local-group — driven by a `contextId` state machine (`$lib/universe/context-graph`
 * already owns the boundary-crossing + camera rebasing) plus a thicket of `?param=`
 * deep-links. The *transition mechanics* live in `ContextGraph`; what stayed tangled
 * in the page — untested and bug-prone — is the **routing logic**: which solar-system
 * body a `?id=` resolves to (the ladder with the Pluto-in-two-catalogues nuance), and
 * the sequence of cross-out / cross-in steps that walks the shell ladder to a target.
 *
 * This module owns exactly those pure decisions. NO svelte / three / dom import — it is
 * unit-tested and coverage-gated (the page keeps the scene-coupled `crossOut*`/`crossIn*`
 * execution and drives it from `planShellJump`; the `?id=` `$effect` dispatches on
 * `resolveSolarBodyTarget`). Byte-identical to the inline if-ladders it replaces.
 */

/** The four scale-shells that form the zoom ladder, innermost → outermost. */
export const CTX_ORDER = [
  'solar-system',
  'neighborhood',
  'milky-way',
  'local-group',
  'local-sheet',
  'virgo',
  'laniakea',
  'cosmic-web',
] as const;
export type ShellId = (typeof CTX_ORDER)[number];

/**
 * The full `contextId` space. `body-scene` (and the black-hole / deep-sky immersions)
 * are sub-shells hung off `neighborhood`, not rungs on the ladder — they map to
 * ladder level -1 (off-ladder) for jump planning.
 */
export type ContextId = ShellId | 'body-scene';

/** A normalized solar-system selection target resolved from a `?id=` deep-link. */
export type SolarBodyTarget =
  | { kind: 'sun' }
  | { kind: 'planet'; id: string }
  | { kind: 'smallBody'; id: string }
  | { kind: 'belt'; belt: 'asteroid' | 'kuiper' }
  | { kind: 'satellite'; parentId: string; satelliteId: string };

/** Membership predicates over the async-loaded catalogues (planets + small bodies). */
export interface BodyMembership {
  isPlanet: (id: string) => boolean;
  isSmallBody: (id: string) => boolean;
}

/**
 * Resolve a `?id=` deep-link value to a normalized solar-system target — the exact
 * ladder from the page's resolver `$effect`, kept byte-identical:
 *
 *  - `sun`                       → the Sun
 *  - `pluto` when it's a small body → small-body panel (richer science_sections; Pluto
 *                                     lives in BOTH planets.json + small-bodies.json, and
 *                                     the small-body surface wins for deep-link landings)
 *  - a known planet id           → planet
 *  - a known small-body id       → small body
 *  - `asteroid-belt`/`belt:asteroid` → asteroid belt; `kuiper-belt`/`belt:kuiper` → Kuiper
 *  - `parent:sat` (parent is a planet) → satellite
 *  - anything else / empty       → null (no-op; never crash)
 */
export function resolveSolarBodyTarget(
  id: string | null | undefined,
  membership: BodyMembership,
): SolarBodyTarget | null {
  if (!id) return null;
  if (id === 'sun') return { kind: 'sun' };
  if (id === 'pluto' && membership.isSmallBody(id)) return { kind: 'smallBody', id };
  if (membership.isPlanet(id)) return { kind: 'planet', id };
  if (membership.isSmallBody(id)) return { kind: 'smallBody', id };
  if (id === 'asteroid-belt' || id === 'belt:asteroid') return { kind: 'belt', belt: 'asteroid' };
  if (id === 'kuiper-belt' || id === 'belt:kuiper') return { kind: 'belt', belt: 'kuiper' };
  if (id.includes(':')) {
    const [parent, sat] = id.split(':', 2);
    if (parent && sat && membership.isPlanet(parent)) {
      return { kind: 'satellite', parentId: parent, satelliteId: sat };
    }
  }
  return null;
}

/**
 * The ladder level of a context: 0 (solar-system) … 3 (local-group). Off-ladder
 * contexts (`body-scene`) and unknown ids return -1.
 */
export function contextLevel(contextId: string): number {
  return (CTX_ORDER as readonly string[]).indexOf(contextId);
}

/** A single ladder step: `out` climbs to the outer shell, `in` descends to the inner. */
export type ShellStep = 'out' | 'in';

/**
 * Plan the sequence of cross-out / cross-in steps that walks the shell ladder from
 * `fromLevel` to `toLevel`, one rung at a time — the pure core of the page's
 * `contextDeepLinkFn` walker. Climbs OUT while below the target, IN while above.
 * Bounded to 10 steps (the ladder is 8 rungs, indices 0–7; the guard is
 * deliberately generous to be safe). The page walker uses a separate guard
 * of 14 — they are independent.
 * Returns `[]` when already at the target or when either level is off-ladder (-1).
 */
export function planShellJump(fromLevel: number, toLevel: number): ShellStep[] {
  const steps: ShellStep[] = [];
  if (fromLevel < 0 || toLevel < 0) return steps;
  let cur = fromLevel;
  let outGuard = 0;
  let inGuard = 0;
  while (cur < toLevel && outGuard++ < 10) {
    steps.push('out');
    cur++;
  }
  while (cur > toLevel && inGuard++ < 10) {
    steps.push('in');
    cur--;
  }
  return steps;
}

/**
 * Plan a jump to a named shell from the current context. Convenience over
 * `planShellJump(contextLevel(from), contextLevel(to))`; returns `[]` for an
 * unknown target (matches the walker's `if (t < 0) return`).
 */
export function planShellJumpTo(fromContextId: string, targetShell: string): ShellStep[] {
  const to = contextLevel(targetShell);
  if (to < 0) return [];
  return planShellJump(contextLevel(fromContextId), to);
}

/** Validate a `?context=` value against the ladder (the cold-load resolver's guard). */
export function isValidShellTarget(value: string | null | undefined): value is ShellId {
  return !!value && (CTX_ORDER as readonly string[]).includes(value);
}
