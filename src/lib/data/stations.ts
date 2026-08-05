import { get, type FetchLike } from './core';
import type { IssModule, IssModuleBase, IssModuleOverlay } from '$types/iss-module';
import type {
  TiangongModule,
  TiangongModuleBase,
  TiangongModuleOverlay,
} from '$types/tiangong-module';

/**
 * All ISS pressurised modules + Canadarm2 (PRD-010 / ADR-017). Base rows
 * from `iss-modules.json` merged with per-locale overlays; falls back to
 * en-US when a locale overlay is missing.
 */
export async function getIssModules(locale = 'en-US'): Promise<IssModule[]> {
  const list = await get<IssModuleBase[]>('iss-modules.json');
  const merged = await Promise.all(
    list.map(async (baseRecord) => {
      const overlay = await get<IssModuleOverlay>(
        `i18n/${locale}/iss-modules/${baseRecord.id}.json`,
      ).catch(() => null);
      const fallback =
        overlay ??
        (locale === 'en-US'
          ? null
          : await get<IssModuleOverlay>(`i18n/en-US/iss-modules/${baseRecord.id}.json`).catch(
              () => null,
            ));
      if (!fallback) {
        throw new Error(
          `Missing ISS overlay for ${baseRecord.id} (locale ${locale}, no en-US fallback)`,
        );
      }
      return { ...baseRecord, ...fallback };
    }),
  );
  return merged;
}

export async function getIssModule(id: string, locale = 'en-US'): Promise<IssModule | null> {
  try {
    const list = await get<IssModuleBase[]>('iss-modules.json');
    const baseRecord = list.find((m) => m.id === id);
    if (!baseRecord) return null;
    const overlay = await get<IssModuleOverlay>(
      `i18n/${locale}/iss-modules/${baseRecord.id}.json`,
    ).catch(() => null);
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<IssModuleOverlay>(`i18n/en-US/iss-modules/${baseRecord.id}.json`).catch(
            () => null,
          ));
    if (!fallback) return null;
    return { ...baseRecord, ...fallback };
  } catch {
    return null;
  }
}

/**
 * Visiting spacecraft currently or commonly docked at the ISS — Soyuz,
 * Progress, Dragon ×2, Cygnus, HTV-X. Same shape as IssModule so the
 * existing IssModulePanel renders them; separate file because they are
 * visitors, not station structure.
 */
export async function getIssVisitors(locale = 'en-US'): Promise<IssModule[]> {
  const list = await get<IssModuleBase[]>('iss-visitors.json');
  const merged = await Promise.all(
    list.map(async (baseRecord) => {
      const overlay = await get<IssModuleOverlay>(
        `i18n/${locale}/iss-visitors/${baseRecord.id}.json`,
      ).catch(() => null);
      const fallback =
        overlay ??
        (locale === 'en-US'
          ? null
          : await get<IssModuleOverlay>(`i18n/en-US/iss-visitors/${baseRecord.id}.json`).catch(
              () => null,
            ));
      if (!fallback) {
        throw new Error(
          `Missing ISS visitor overlay for ${baseRecord.id} (locale ${locale}, no en-US fallback)`,
        );
      }
      return { ...baseRecord, ...fallback };
    }),
  );
  return merged;
}

export async function getIssVisitor(id: string, locale = 'en-US'): Promise<IssModule | null> {
  try {
    const list = await get<IssModuleBase[]>('iss-visitors.json');
    const baseRecord = list.find((m) => m.id === id);
    if (!baseRecord) return null;
    const overlay = await get<IssModuleOverlay>(
      `i18n/${locale}/iss-visitors/${baseRecord.id}.json`,
    ).catch(() => null);
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<IssModuleOverlay>(`i18n/en-US/iss-visitors/${baseRecord.id}.json`).catch(
            () => null,
          ));
    if (!fallback) return null;
    return { ...baseRecord, ...fallback };
  } catch {
    return null;
  }
}

/**
 * Tiangong pressurised modules + Chinarm (PRD-011 / ADR-049). Mirrors
 * getIssModules: base records from `tiangong-modules.json` merged with
 * per-locale overlays; falls back to en-US when a locale overlay is missing.
 */
export async function getTiangongModules(locale = 'en-US'): Promise<TiangongModule[]> {
  const list = await get<TiangongModuleBase[]>('tiangong-modules.json');
  const merged = await Promise.all(
    list.map(async (baseRecord) => {
      const overlay = await get<TiangongModuleOverlay>(
        `i18n/${locale}/tiangong-modules/${baseRecord.id}.json`,
      ).catch(() => null);
      const fallback =
        overlay ??
        (locale === 'en-US'
          ? null
          : await get<TiangongModuleOverlay>(
              `i18n/en-US/tiangong-modules/${baseRecord.id}.json`,
            ).catch(() => null));
      if (!fallback) {
        throw new Error(
          `Missing Tiangong overlay for ${baseRecord.id} (locale ${locale}, no en-US fallback)`,
        );
      }
      return { ...baseRecord, ...fallback };
    }),
  );
  return merged;
}

export async function getTiangongModule(
  id: string,
  locale = 'en-US',
): Promise<TiangongModule | null> {
  try {
    const list = await get<TiangongModuleBase[]>('tiangong-modules.json');
    const baseRecord = list.find((m) => m.id === id);
    if (!baseRecord) return null;
    const overlay = await get<TiangongModuleOverlay>(
      `i18n/${locale}/tiangong-modules/${baseRecord.id}.json`,
    ).catch(() => null);
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<TiangongModuleOverlay>(
            `i18n/en-US/tiangong-modules/${baseRecord.id}.json`,
          ).catch(() => null));
    if (!fallback) return null;
    return { ...baseRecord, ...fallback };
  } catch {
    return null;
  }
}

export async function getTiangongVisitors(locale = 'en-US'): Promise<TiangongModule[]> {
  const list = await get<TiangongModuleBase[]>('tiangong-visitors.json');
  const merged = await Promise.all(
    list.map(async (baseRecord) => {
      const overlay = await get<TiangongModuleOverlay>(
        `i18n/${locale}/tiangong-visitors/${baseRecord.id}.json`,
      ).catch(() => null);
      const fallback =
        overlay ??
        (locale === 'en-US'
          ? null
          : await get<TiangongModuleOverlay>(
              `i18n/en-US/tiangong-visitors/${baseRecord.id}.json`,
            ).catch(() => null));
      if (!fallback) {
        throw new Error(
          `Missing Tiangong visitor overlay for ${baseRecord.id} (locale ${locale}, no en-US fallback)`,
        );
      }
      return { ...baseRecord, ...fallback };
    }),
  );
  return merged;
}

export async function getTiangongVisitor(
  id: string,
  locale = 'en-US',
): Promise<TiangongModule | null> {
  try {
    const list = await get<TiangongModuleBase[]>('tiangong-visitors.json');
    const baseRecord = list.find((m) => m.id === id);
    if (!baseRecord) return null;
    const overlay = await get<TiangongModuleOverlay>(
      `i18n/${locale}/tiangong-visitors/${baseRecord.id}.json`,
    ).catch(() => null);
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<TiangongModuleOverlay>(
            `i18n/en-US/tiangong-visitors/${baseRecord.id}.json`,
          ).catch(() => null));
    if (!fallback) return null;
    return { ...baseRecord, ...fallback };
  } catch {
    return null;
  }
}

/**
 * Base station-part records (id + launch_date etc., no locale overlays).
 *
 * The station assembly replay only needs each part's `id` and `launch_date`
 * to drive fly-in timing — never the localised prose. These skip the overlay
 * merge that `getIssModules` / `getTiangongModules` do, so the AR tabletop
 * assembly (#408) can resolve launch epochs without loading 30+ overlay files.
 */
export function getIssModulesBase(fetchFn: FetchLike = fetch): Promise<IssModuleBase[]> {
  return get<IssModuleBase[]>('iss-modules.json', fetchFn);
}
export function getIssVisitorsBase(fetchFn: FetchLike = fetch): Promise<IssModuleBase[]> {
  return get<IssModuleBase[]>('iss-visitors.json', fetchFn);
}
export function getTiangongModulesBase(fetchFn: FetchLike = fetch): Promise<TiangongModuleBase[]> {
  return get<TiangongModuleBase[]>('tiangong-modules.json', fetchFn);
}
export function getTiangongVisitorsBase(fetchFn: FetchLike = fetch): Promise<TiangongModuleBase[]> {
  return get<TiangongModuleBase[]>('tiangong-visitors.json', fetchFn);
}
