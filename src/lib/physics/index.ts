/**
 * The Orrery physics kernel — public entry point (S1.5, epic #458 · RFC-037 §3).
 *
 * A pure, framework-free spaceflight-physics library, carved out of the scripted
 * surfaces (`/fly`, `/plan`, `/explore`) so it can be imported UNCHANGED by two
 * consumers: the SvelteKit app (the `/lab` Physics Lab) and a standalone Node
 * process (the MCP server). The purity of this subtree is enforced by the ESLint
 * `no-restricted-imports` gate (no `three` / `svelte` / `$app` / app-internal
 * `$lib` / DOM) — see eslint.config.js.
 *
 * Access is namespaced by domain, e.g.:
 *   import { transfer, ephemeris } from '$lib/physics';
 *   transfer.solveLambert(...);  ephemeris.heliocentric(...);
 * Individual modules remain importable directly (`$lib/physics/transfer/lambert`);
 * this barrel is the canonical public surface both consumers share.
 *
 * Provenance (RFC-037 §4, Amendment 01 A01.2a): every `FigureSpec` a kernel
 * formula emits is `provenance.fidelity: 'computed'` — never `geometric` or
 * `replayed-published` (those come only from app-side producers). Honesty line,
 * made structural.
 *
 * Units + per-formula citations: established here at the domain level; the
 * per-export, public-contract-grade doc pass lands with the S2 formula registry.
 */

export * as ephemeris from './ephemeris';
export * as transfer from './transfer';
export * as ascent from './ascent';
export * as descent from './descent';
export * as propulsion from './propulsion';
export * as satellite from './satellite';
export * as util from './util';

// `cislunar/` — the real cislunar compute lives in `transfer/lambert-geocentric`;
// the Tier-1 scene-shape generators are app-side (`geometric` provenance), not kernel.
// `mechanics/` — classical-mechanics foundation, added at S2b (demand-driven per goal).
