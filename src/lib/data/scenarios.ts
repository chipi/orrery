import { get } from './core';
import type { LocalizedScenario, Scenario, ScenarioOverlay } from '$types/scenario';

/**
 * Returns a synthesized teaching scenario merged with its locale
 * overlay. Scenarios live in `static/data/scenarios/` (not the
 * mission library) — see `src/types/scenario.ts` for the rationale.
 *
 * Returns null if the scenario id is unknown so callers can fall
 * back gracefully (the /fly route does this when ?mission=id points
 * at a real mission rather than a scenario).
 */
export async function getScenario(id: string, locale = 'en-US'): Promise<LocalizedScenario | null> {
  try {
    const baseRecord = await get<Scenario>(`scenarios/${id}.json`);
    const overlay = await get<ScenarioOverlay>(`i18n/${locale}/scenarios/${id}.json`).catch(
      () => null,
    );
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<ScenarioOverlay>(`i18n/en-US/scenarios/${id}.json`).catch(() => null));
    if (!fallback) return null;
    return { ...baseRecord, ...fallback };
  } catch {
    return null;
  }
}
