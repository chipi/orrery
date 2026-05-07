/**
 * Helpers for the public `/library` outbound-link inventory page
 * (ADR-051 Milestone L-D).
 *
 * Pure functions — no DOM, no fetch. The page calls
 * `getLinkProvenanceManifest()` (`$lib/link-provenance`) and
 * `getSourceLogos()` (`$lib/data`) and feeds the entries here.
 *
 * The page renders the manifest grouped by **source** (the publisher
 * of the destination, not the entity that links to it). Within a
 * source group, entries are clustered by `entity_id` so a reader can
 * see, for example, every Wikipedia link bound to `apollo11` together
 * — across all locales of Wikipedia we link to.
 *
 * Editorial rules (mirrored in scripts/build-link-provenance.ts):
 *   - The first source token wins when the upstream is a partner
 *     credit (ADR-046 §primary). Source-id is already stamped on
 *     each entry by the build script; this module just trusts it.
 *   - Empty source groups are dropped from the result.
 *   - Within a source group, entities are sorted by id; within an
 *     entity, links are sorted by tier (intro → core → deep) then by
 *     language (en first, then BCP-47 alphabetical) then by URL.
 *
 * The newest-first total summary the page renders ("X links across Y
 * sources, Z languages") is computed by `summarise()`.
 */

import type { SourceLogo } from '$lib/data';
import type { LinkProvenanceEntry, LinkTier } from '$lib/link-provenance';

export interface LibraryEntityCluster {
  entity_id: string;
  category: string;
  route: string;
  links: LinkProvenanceEntry[];
}

export interface LibraryGroup {
  source: SourceLogo;
  entities: LibraryEntityCluster[];
  total_links: number;
}

export interface LibrarySummary {
  links: number;
  sources: number;
  languages: number;
  entities: number;
  newest_verified: string | null;
}

const TIER_ORDER: Record<LinkTier, number> = { intro: 0, core: 1, deep: 2 };

function languageRank(lang: string): number {
  if (lang === 'en') return 0;
  if (lang === '*') return 1000;
  return 1;
}

function compareLinks(a: LinkProvenanceEntry, b: LinkProvenanceEntry): number {
  const t = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
  if (t !== 0) return t;
  const lr = languageRank(a.language) - languageRank(b.language);
  if (lr !== 0) return lr;
  const ll = a.language.localeCompare(b.language);
  if (ll !== 0) return ll;
  return a.url.localeCompare(b.url);
}

/**
 * Group every provenance entry by source-id, then cluster entries
 * sharing the same `entity_id` inside each source. Group order
 * follows the order of `sources` (Milestone D style guide: agencies
 * first, then platforms / publishers — same convention `/credits` uses).
 *
 * Source ids that don't appear in `sources` (none today, but defensive
 * for future fetches) are dropped — caller verifies completeness via
 * `validate-data.ts` integrity check, not at render time.
 */
export function groupBySource(
  sources: SourceLogo[],
  entries: LinkProvenanceEntry[],
): LibraryGroup[] {
  const byId = new Map<string, LibraryGroup>(
    sources.map((s) => [s.id, { source: s, entities: [], total_links: 0 }]),
  );

  // Bucket entries by source.
  const entriesBySource = new Map<string, LinkProvenanceEntry[]>();
  for (const e of entries) {
    if (!byId.has(e.source_id)) continue;
    const list = entriesBySource.get(e.source_id) ?? [];
    list.push(e);
    entriesBySource.set(e.source_id, list);
  }

  // For each source, cluster by entity_id and sort.
  for (const [sourceId, list] of entriesBySource) {
    const grp = byId.get(sourceId);
    if (!grp) continue;
    const byEntity = new Map<string, LibraryEntityCluster>();
    for (const e of list) {
      const cluster = byEntity.get(e.entity_id) ?? {
        entity_id: e.entity_id,
        category: e.category,
        route: e.route,
        links: [],
      };
      cluster.links.push(e);
      byEntity.set(e.entity_id, cluster);
    }
    for (const cluster of byEntity.values()) {
      cluster.links.sort(compareLinks);
    }
    grp.entities = Array.from(byEntity.values()).sort((a, b) =>
      a.entity_id.localeCompare(b.entity_id),
    );
    grp.total_links = list.length;
  }

  return Array.from(byId.values()).filter((g) => g.total_links > 0);
}

/**
 * Compact totals shown in the page header. `newest_verified` is the
 * most recent `last_verified` date across all entries, used to confirm
 * the link checker (Milestone L-E) ran recently.
 */
export function summarise(entries: LinkProvenanceEntry[]): LibrarySummary {
  const sources = new Set<string>();
  const languages = new Set<string>();
  const entities = new Set<string>();
  let newest: string | null = null;
  for (const e of entries) {
    sources.add(e.source_id);
    languages.add(e.language);
    entities.add(e.entity_id);
    if (!newest || e.last_verified > newest) newest = e.last_verified;
  }
  return {
    links: entries.length,
    sources: sources.size,
    languages: languages.size,
    entities: entities.size,
    newest_verified: newest,
  };
}
