import { get, type FetchLike } from './core';
import type {
  FleetCategory,
  FleetEntry,
  FleetEntryBase,
  FleetEntryOverlay,
  FleetIndexEntry,
} from '$types/fleet';

/**
 * Spaceflight Fleet — index records (PRD-012 v0.2 / RFC-016 v0.2).
 * Lightweight summary records used by the /fleet card grid.
 */
export async function getFleetIndex(locale = 'en-US'): Promise<FleetIndexEntry[]> {
  const index = await get<FleetIndexEntry[]>('fleet/index.json');
  if (locale === 'en-US') return index;
  // The card grid shows name + tagline; take both from the entry's locale overlay.
  return Promise.all(
    index.map(async (entry) => {
      const overlay = await get<Partial<FleetEntryOverlay>>(
        `i18n/${locale}/fleet/${entry.category}/${entry.id}.json`,
      ).catch(() => null);
      return overlay
        ? { ...entry, name: overlay.name ?? entry.name, tagline: overlay.tagline ?? entry.tagline }
        : entry;
    }),
  );
}

/**
 * Single fleet entry with locale-overlay merged. Returns null if either
 * the base record or both locale + en-US fallback overlays are missing.
 */
export async function getFleet(
  id: string,
  category: FleetCategory,
  locale = 'en-US',
  fetchFn: FetchLike = fetch,
): Promise<FleetEntry | null> {
  try {
    const baseRecord = await get<FleetEntryBase>(`fleet/${category}/${id}.json`, fetchFn);
    const overlay = await get<FleetEntryOverlay>(
      `i18n/${locale}/fleet/${category}/${id}.json`,
      fetchFn,
    ).catch(() => null);
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<FleetEntryOverlay>(`i18n/en-US/fleet/${category}/${id}.json`, fetchFn).catch(
            () => null,
          ));
    // Phase A skeletons ship without overlays; merge what we have.
    return fallback ? { ...baseRecord, ...fallback } : baseRecord;
  } catch {
    return null;
  }
}

/**
 * All fleet entries in a single category, locale-merged. Used by the
 * filtered card grid when the user selects a CATEGORY chip.
 */
export async function getFleetByCategory(
  category: FleetCategory,
  locale = 'en-US',
): Promise<FleetEntry[]> {
  const index = await getFleetIndex();
  const ids = index.filter((r) => r.category === category).map((r) => r.id);
  const entries = await Promise.all(ids.map((id) => getFleet(id, category, locale)));
  return entries.filter((e): e is FleetEntry => e !== null);
}
