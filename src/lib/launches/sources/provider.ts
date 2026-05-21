/**
 * `LaunchSource` interface — the agency-first provider abstraction at the
 * heart of the Launches Calendar pipeline (PRD-020 / RFC-023 §3).
 *
 * Each source declares its `priority` (lower = higher priority); the
 * orchestrator pulls in priority order and merges results with the
 * first-seen-wins rule (RFC-023 §4.3). `defaultRole` is the provenance
 * role this source claims when it contributes a primary field.
 *
 * Implementations live alongside this file (`nasa.ts`, `spacex.ts`,
 * `esa.ts`, `gcat.ts`, `ll2.ts`).
 */

import type { RawLaunchEntry } from '../types.js';

export type LaunchSourceMode = 'upcoming' | 'historic' | 'both';

export type LaunchSourceWindow = {
  mode: 'upcoming' | 'historic';
  fromIso: string;
  toIso: string;
};

/**
 * Citation metadata surfaced into:
 *  - `static/data/text-sources.json` (CC-BY ship-gate per PRD-020 M14)
 *  - `static/data/source-logos.json` (publisher entry)
 *  - The per-row `ProvenanceChip` on `/missions/launches`
 *  - The `/credits` LAUNCH DATA section
 *  - The `/library` outbound-link inventory (where source URL is intro/core)
 */
export type LaunchSourceAttribution = {
  /** Canonical citation string (e.g. "McDowell, J.C. — GCAT Release 1.8.0"). */
  citation: string;
  /** Homepage / canonical URL of the source. */
  url: string;
  /** SPDX-style short license id (e.g. "CC-BY-4.0", "permissive"). */
  license: string;
  /** Stable id used as the key in source-logos.json. */
  citation_id: string;
};

export interface LaunchSource {
  /**
   * Stable lower-case source name (matches the provenance_chain `source`
   * value the orchestrator records). Must follow `^[a-z][a-z0-9-]*$` per
   * the launch schema.
   */
  readonly name: string;
  /** Lower = higher priority. Agency-direct = 10-16; GCAT = 20; LL2 = 90. */
  readonly priority: number;
  /** Which window this source covers. */
  readonly mode: LaunchSourceMode;
  /** Default provenance role for entries this source contributes. */
  readonly defaultRole: 'primary' | 'fallback-primary';

  /**
   * Fetch entries the provider can offer in the given window. Sources may
   * cache aggressively (per RFC-023 §6); the orchestrator does not enforce
   * any cache policy here.
   */
  fetchWindow(input: LaunchSourceWindow): Promise<RawLaunchEntry[]>;

  /** Attribution metadata — registered into citation manifests. */
  attribution(): LaunchSourceAttribution;
}
