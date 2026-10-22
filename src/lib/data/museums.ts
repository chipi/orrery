import { get } from './core';
import type { Museum, MuseumBase, MuseumForObject, MuseumOverlay } from '$types/museum';

export async function museumsBase(): Promise<MuseumBase[]> {
  return get<MuseumBase[]>('museums.json');
}

/**
 * Museums merged with their per-locale text (name, city, description,
 * item lines), falling back to en-US per museum (PRD-027).
 */
export async function getMuseums(locale = 'en-US'): Promise<Museum[]> {
  const base = await museumsBase();
  const merged: Museum[] = [];
  for (const mu of base) {
    const overlay =
      (await get<MuseumOverlay>(`i18n/${locale}/museums/${mu.id}.json`).catch(() => null)) ??
      (await get<MuseumOverlay>(`i18n/en-US/museums/${mu.id}.json`).catch(() => null));
    if (!overlay) throw new Error(`museums: no en-US overlay for ${mu.id}`);
    merged.push({ ...mu, ...overlay });
  }
  return merged;
}

/**
 * Every museum showing a real unit of `ref`, ordered by country then city
 * so no museum is favoured.
 */
export function museumsForObject(museums: Museum[], ref: string): MuseumForObject[] {
  const rows: MuseumForObject[] = [];
  for (const museum of museums) {
    const holding = museum.holds.find((h) => h.ref === ref);
    if (holding) rows.push({ museum, holding, item: museum.items[ref] ?? '' });
  }
  return rows.sort(
    (a, b) =>
      a.museum.country.localeCompare(b.museum.country) ||
      a.museum.city.localeCompare(b.museum.city) ||
      a.museum.name.localeCompare(b.museum.name),
  );
}

/** True while a holding's display has not opened yet. */
export function holdingNotYetOpen(h: { from?: string }, today = new Date()): boolean {
  return !!h.from && h.from > today.toISOString().slice(0, 10);
}
