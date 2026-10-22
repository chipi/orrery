import { get } from './core';
import type { Observatory, ObservatoryBase, ObservatoryOverlay } from '$types/observatory';

export async function observatoriesBase(): Promise<ObservatoryBase[]> {
  return get<ObservatoryBase[]>('observatories.json');
}

/**
 * Observatories merged with their per-locale text (name, place,
 * description, highlights, film line), falling back to en-US (PRD-028).
 */
export async function getObservatories(locale = 'en-US'): Promise<Observatory[]> {
  const base = await observatoriesBase();
  const merged: Observatory[] = [];
  for (const o of base) {
    const overlay =
      (await get<ObservatoryOverlay>(`i18n/${locale}/observatories/${o.id}.json`).catch(
        () => null,
      )) ??
      (await get<ObservatoryOverlay>(`i18n/en-US/observatories/${o.id}.json`).catch(() => null));
    if (!overlay) throw new Error(`observatories: no en-US overlay for ${o.id}`);
    merged.push({ ...o, ...overlay });
  }
  return merged;
}

/**
 * Observatories whose card links the given science article, ordered by
 * country then name (the "Where this is done" block, PRD-028).
 */
export function observatoriesForArticle(list: Observatory[], path: string): Observatory[] {
  return list
    .filter((o) => o.science.includes(path))
    .sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name));
}
