/**
 * Data client — the public barrel (ADR-084).
 *
 * The fetch + cache + locale-overlay keystone lives in `./data/core` (ADR-006,
 * ADR-017); every domain loader lives in its own `./data/<domain>` module. This
 * file re-exports the whole public API so all consumers (`from '$lib/data'`) are
 * unchanged, and owns the test-only cache-reset hook.
 *
 * Add a new loader to the matching domain module (or a new `./data/<domain>`
 * re-exported here) — do NOT grow this file back into a mega-client.
 */

import { resetCoreCache } from './data/core';
import { resetProvenanceCache } from './data/provenance';

export * from './data/missions';
export * from './data/scenarios';
export * from './data/plan';
export * from './data/bodies';
export * from './data/surface';
export * from './data/stations';
export * from './data/fleet';
export * from './data/small-bodies';
export * from './data/site-stories';
export * from './data/science';
export * from './data/provenance';
export * from './data/universe';
export * from './data/galleries';

/** Reset every data cache (test isolation) — the fetch/i18n keystone + the
 *  provenance module's own manifest caches. */
export function __resetCache(): void {
  resetCoreCache();
  resetProvenanceCache();
}
