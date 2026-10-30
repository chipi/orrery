/**
 * Test-only readiness hooks for the fly-render-validation e2e suite
 * (ADR-056, issue #133). They ship in the production bundle: e2e runs against
 * `vite preview`, so these must not be dev-gated.
 *
 * `window.__flyArcHash` + `window.__fly2DArcHash` return `null` while
 * hydrating and the stable outbound-arc hash once the current mission's
 * geometry has settled. Both read the page's `$state` at CALL time through the
 * getters below, not at install time, so there is no microtask gap between
 * Svelte's reactive flush and what the test sees (the pre-v0.6.2 flake where
 * the poll read the previous mission's hash).
 *
 * The 3D and 2D views share `outPts` / `retPts` as their geometry source, so
 * both hashes reflect the same math invariant.
 */

export interface FlyTestHooksContext {
  /** Id of the mission/scenario the last apply* committed; null until a URL load resolves. */
  lastAppliedMissionId: () => string | null;
  /** Vertex count of the outbound arc (the hash samples 11 vertices). */
  outPtsLength: () => number;
  outVertexHash: () => string;
}

/** Install the hooks on `window`; returns the cleanup that removes them. */
export function installFlyTestHooks(ctx: FlyTestHooksContext): () => void {
  if (typeof window === 'undefined') return () => {};
  const w = window;
  // null until BOTH hold: (a) an apply* committed a mission (distinguishes
  // "default state" from "URL load resolved" — the v0.6.1 race) and (b) outPts
  // is built.
  const hashOrNull = (): string | null =>
    ctx.lastAppliedMissionId() === null || ctx.outPtsLength() < 11 ? null : ctx.outVertexHash();
  w.__flyArcHash = hashOrNull;
  w.__fly2DArcHash = hashOrNull;
  // Lets a test verify the URL-requested mission is the one rendered: await
  // `__flyMissionId() === 'X'` before reading the hash.
  w.__flyMissionId = () => ctx.lastAppliedMissionId();
  return () => {
    delete w.__flyArcHash;
    delete w.__fly2DArcHash;
    delete w.__flyMissionId;
  };
}
