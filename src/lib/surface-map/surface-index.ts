/**
 * Surface object index (searchable orbit/land list for /mars, /moon, /earth).
 *
 * The three surface routes carry two different data shapes:
 *   - /mars + /moon → SurfaceSite[]  (single `agency`, `kind: surface|orbiter`, `year`)
 *   - /earth        → EarthObject[]  (`agencies[]`, `regime`, `launched`, orbit-only)
 *
 * This module normalises both into one `IndexItem` so a single index panel +
 * filter engine can drive all three bodies. The `domain: 'orbit' | 'land'` axis
 * is the search/filter split the UI exposes — and the SINGLE SEAM for the
 * planned Earth land-type locations: when those land, map them `domain: 'land'`
 * in `earthObjectToIndexItem` and nothing downstream changes.
 *
 * Pure, dependency-light (no Svelte) so it unit-tests directly.
 */
import type { SurfaceSite } from '$types/surface-site';
import type { EarthObject } from '$types/earth-object';
import { splitAgencies } from '$lib/agencies';
import { categoriseMarsMarker } from '$lib/mars-marker-category';
import { categoriseMoonMarker } from '$lib/moon-marker-category';
import { categoriseEarthSatellite } from '$lib/earth-satellite-category';
import { matchesQuery } from '$lib/list-search';

export type IndexBody = 'mars' | 'moon' | 'earth';
export type IndexDomain = 'orbit' | 'land';

export interface IndexItem {
  id: string;
  /** Merged (overlay) display name; falls back to the id. */
  name: string;
  /** Agency codes, compound entries ("NASA / ESA") split + de-duped. */
  agencies: string[];
  /** The orbit/land split — the primary filter axis. */
  domain: IndexDomain;
  /** Coarse archetype (rover/lander/orbiter/telescope/…) for display + filter. */
  category: string;
  /** Year (arrival/landing year on mars/moon; launch year on earth). */
  year: number;
  /** Raw status code (SiteStatus | ObjectStatus) — filter chips derive from data. */
  status: string;
  /** Earth only — orbital regime (LEO/MEO/GEO/…). */
  regime?: string;
  /** Optional marker colour (earth objects carry one; surface sites don't). */
  color?: string;
  body: IndexBody;
}

/** Split any compound agency strings and de-dupe, preserving order-insensitive uniqueness. */
function normaliseAgencies(list: string[]): string[] {
  return Array.from(new Set(list.flatMap((a) => splitAgencies(a))));
}

export function surfaceSiteToIndexItem(site: SurfaceSite, body: IndexBody): IndexItem {
  return {
    id: site.id,
    name: site.name ?? site.id,
    agencies: normaliseAgencies([site.agency]),
    domain: site.kind === 'orbiter' ? 'orbit' : 'land',
    category:
      body === 'mars'
        ? categoriseMarsMarker(site.mission_type, site.agency)
        : body === 'moon'
          ? categoriseMoonMarker(site.mission_type)
          : // Earth's surface sites are launch pads/spaceports today.
            'launch-site',
    year: site.year,
    status: site.status,
    color: undefined,
    body,
  };
}

export function earthObjectToIndexItem(obj: EarthObject): IndexItem {
  return {
    id: obj.id,
    name: obj.name ?? obj.id,
    agencies: normaliseAgencies(obj.agencies),
    // Earth is orbit-only today. Land-type locations (planned) tag 'land' HERE —
    // the single seam for that extension; no consumer changes.
    domain: 'orbit',
    category: categoriseEarthSatellite(obj.id),
    year: obj.launched,
    status: obj.status,
    regime: obj.regime,
    color: obj.color,
    body: 'earth',
  };
}

/**
 * Normalise a body's in-memory data into the unified index list. Earth carries
 * BOTH shapes — launch sites/spaceports (`sites`, on land) AND orbital objects
 * (`earthObjects`, in orbit) — so both feed the list; Mars/Moon are sites-only.
 */
export function toIndexItems(
  sites: SurfaceSite[],
  earthObjects: EarthObject[],
  body: IndexBody,
): IndexItem[] {
  if (body === 'earth') {
    return [
      ...sites.map((s) => surfaceSiteToIndexItem(s, 'earth')),
      ...earthObjects.map(earthObjectToIndexItem),
    ];
  }
  return sites.map((s) => surfaceSiteToIndexItem(s, body));
}

/** Unique agency codes present, sorted — drives the agency filter chips. */
export function indexAgencies(items: IndexItem[]): string[] {
  return Array.from(new Set(items.flatMap((i) => i.agencies))).sort();
}

/** Unique status codes present, in first-seen order — drives the status chips. */
export function indexStatuses(items: IndexItem[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const i of items) {
    if (!seen.has(i.status)) {
      seen.add(i.status);
      out.push(i.status);
    }
  }
  return out;
}

export interface IndexFilters {
  query?: string;
  domain?: IndexDomain | 'ALL';
  agency?: string | 'ALL';
  status?: string | 'ALL';
  /** Inclusive year range (drives the era/year buckets in the UI). */
  yearMin?: number;
  yearMax?: number;
}

/**
 * Pure filter — mirrors /fleet's derived `filtered`. Free-text search matches
 * name + agencies + category; the rest are exact-match facets. Year is an
 * inclusive [min,max] range so the UI can express era buckets on top.
 */
export function filterIndexItems(items: IndexItem[], f: IndexFilters): IndexItem[] {
  return items.filter(
    (i) =>
      matchesQuery([i.name, ...i.agencies, i.category], f.query ?? '') &&
      (!f.domain || f.domain === 'ALL' || i.domain === f.domain) &&
      (!f.agency || f.agency === 'ALL' || i.agencies.includes(f.agency)) &&
      (!f.status || f.status === 'ALL' || i.status === f.status) &&
      (f.yearMin == null || i.year >= f.yearMin) &&
      (f.yearMax == null || i.year <= f.yearMax),
  );
}
